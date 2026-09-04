package rules

import (
	"math"
	"strings"
	"time"

	"github.com/jaiswalshivang/pledgepay/internal/models"
)

type PaceStatus string

const (
	StatusOnTrack PaceStatus = "ON_TRACK"
	StatusAtRisk  PaceStatus = "AT_RISK"
	StatusBehind  PaceStatus = "BEHIND"
)

type ProgressCalculation struct {
	Target            int        `json:"target"`
	Verified          int        `json:"verified"`
	ProgressPct       float64    `json:"progress_pct"`
	DaysRemaining     int        `json:"days_remaining"`
	Status            PaceStatus `json:"status"`
	EvidenceCount     int        `json:"evidence_count"`
	DailyPaceActual   float64    `json:"daily_pace_actual"`
	DailyPaceRequired float64    `json:"daily_pace_required"`
}

func CalculateProgress(commitment *models.Commitment, evidence []models.Evidence, now time.Time) ProgressCalculation {
	evidenceCount := len(evidence)
	unitLower := strings.ToLower(commitment.Unit)
	isPRUnit := unitLower == "pr" || unitLower == "prs" || strings.Contains(unitLower, "pull")
	isCommitUnit := strings.Contains(unitLower, "commit")

	verifiedCount := 0
	for _, item := range evidence {
		if item.OccurredAt.Before(commitment.StartDate) || item.OccurredAt.After(commitment.EndDate) {
			continue
		}
		if isPRUnit {
			if item.Source == "github_pr" {
				verifiedCount++
			}
		} else if isCommitUnit {
			if item.Source == "github_commit" {
				verifiedCount++
			}
		} else {
			verifiedCount++
		}
	}

	target := commitment.TargetCount
	if target <= 0 {
		target = 1
	}

	progressPct := (float64(verifiedCount) / float64(target)) * 100.0
	if progressPct > 100.0 {
		progressPct = 100.0
	}
	progressPct = math.Round(progressPct*100) / 100

	totalDuration := commitment.EndDate.Sub(commitment.StartDate)
	if totalDuration <= 0 {
		totalDuration = 24 * time.Hour
	}
	elapsed := now.Sub(commitment.StartDate)
	if elapsed < 0 {
		elapsed = 0
	}

	daysRemaining := int(math.Ceil(commitment.EndDate.Sub(now).Hours() / 24.0))
	if daysRemaining < 0 {
		daysRemaining = 0
	}

	elapsedDays := elapsed.Hours() / 24.0
	if elapsedDays < 0.1 {
		elapsedDays = 0.1
	}

	durationDays := float64(commitment.DurationDays)
	if durationDays <= 0 {
		durationDays = 1.0
	}

	actualPace := float64(verifiedCount) / elapsedDays
	actualPace = math.Round(actualPace*100) / 100

	requiredPace := float64(target) / durationDays
	requiredPace = math.Round(requiredPace*100) / 100

	status := StatusOnTrack
	if progressPct >= 100.0 {
		status = StatusOnTrack
	} else if now.After(commitment.EndDate) {
		status = StatusBehind
	} else {
		elapsedPct := (float64(elapsed) / float64(totalDuration)) * 100.0
		if elapsedPct <= 35.0 {
			status = StatusOnTrack
		} else if progressPct >= elapsedPct*0.7 {
			status = StatusOnTrack
		} else if progressPct >= elapsedPct*0.35 {
			status = StatusAtRisk
		} else {
			status = StatusBehind
		}
	}

	return ProgressCalculation{
		Target:            target,
		Verified:          verifiedCount,
		ProgressPct:       progressPct,
		DaysRemaining:     daysRemaining,
		Status:            status,
		EvidenceCount:     evidenceCount,
		DailyPaceActual:   actualPace,
		DailyPaceRequired: requiredPace,
	}
}
