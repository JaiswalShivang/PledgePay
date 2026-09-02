package rules

import (
	"testing"
	"time"

	"github.com/jaiswalshivang/pledgepay/internal/models"
)

func TestCalculateProgress_Determinism(t *testing.T) {
	startDate := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 0, 7)
	now := startDate.Add(48 * time.Hour)

	commitment := &models.Commitment{
		ID:           "test-commitment-1",
		TargetCount:  20,
		Unit:         "problems",
		DurationDays: 7,
		StartDate:    startDate,
		EndDate:      endDate,
	}

	evidence := []models.Evidence{
		{
			ID:         "ev-1",
			Source:     "github_commit",
			SourceRef:  "sha-1",
			OccurredAt: startDate.Add(10 * time.Hour),
		},
		{
			ID:         "ev-2",
			Source:     "github_commit",
			SourceRef:  "sha-2",
			OccurredAt: startDate.Add(20 * time.Hour),
		},
		{
			ID:         "ev-3",
			Source:     "github_pr",
			SourceRef:  "pr-1",
			OccurredAt: startDate.Add(30 * time.Hour),
		},
		{
			ID:         "ev-4",
			Source:     "github_commit",
			SourceRef:  "sha-3",
			OccurredAt: startDate.Add(40 * time.Hour),
		},
		{
			ID:         "ev-5",
			Source:     "github_commit",
			SourceRef:  "sha-4",
			OccurredAt: startDate.Add(42 * time.Hour),
		},
		{
			ID:         "ev-6",
			Source:     "github_commit",
			SourceRef:  "sha-5",
			OccurredAt: startDate.Add(45 * time.Hour),
		},
	}

	res1 := CalculateProgress(commitment, evidence, now)
	res2 := CalculateProgress(commitment, evidence, now)

	if res1.Verified != res2.Verified || res1.Verified != 6 {
		t.Fatalf("expected verified=6, got res1=%d, res2=%d", res1.Verified, res2.Verified)
	}

	if res1.Target != 20 {
		t.Fatalf("expected target=20, got %d", res1.Target)
	}

	if res1.ProgressPct != 30.0 {
		t.Fatalf("expected progress_pct=30.0, got %f", res1.ProgressPct)
	}

	if res1.DaysRemaining != 5 {
		t.Fatalf("expected days_remaining=5, got %d", res1.DaysRemaining)
	}

	if res1.Status != StatusOnTrack {
		t.Fatalf("expected status=ON_TRACK, got %s", res1.Status)
	}
}

func TestCalculateProgress_PaceStatusAtRiskAndBehind(t *testing.T) {
	startDate := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 0, 10)
	now := startDate.Add(5 * 24 * time.Hour)

	commitment := &models.Commitment{
		ID:           "test-commitment-2",
		TargetCount:  20,
		Unit:         "commits",
		DurationDays: 10,
		StartDate:    startDate,
		EndDate:      endDate,
	}

	evidenceFew := []models.Evidence{
		{ID: "e1", Source: "github_commit", SourceRef: "s1", OccurredAt: startDate.Add(time.Hour)},
	}

	resBehind := CalculateProgress(commitment, evidenceFew, now)
	if resBehind.Status != StatusBehind {
		t.Fatalf("expected status=BEHIND, got %s", resBehind.Status)
	}

	evidenceAtRisk := []models.Evidence{
		{ID: "e1", Source: "github_commit", SourceRef: "s1", OccurredAt: startDate.Add(time.Hour)},
		{ID: "e2", Source: "github_commit", SourceRef: "s2", OccurredAt: startDate.Add(2 * time.Hour)},
		{ID: "e3", Source: "github_commit", SourceRef: "s3", OccurredAt: startDate.Add(3 * time.Hour)},
		{ID: "e4", Source: "github_commit", SourceRef: "s4", OccurredAt: startDate.Add(4 * time.Hour)},
		{ID: "e5", Source: "github_commit", SourceRef: "s5", OccurredAt: startDate.Add(5 * time.Hour)},
		{ID: "e6", Source: "github_commit", SourceRef: "s6", OccurredAt: startDate.Add(6 * time.Hour)},
	}

	resAtRisk := CalculateProgress(commitment, evidenceAtRisk, now)
	if resAtRisk.Status != StatusAtRisk {
		t.Fatalf("expected status=AT_RISK, got %s", resAtRisk.Status)
	}
}
