package evidencesync

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"time"

	"github.com/jaiswalshivang/pledgepay/internal/github"
	"github.com/jaiswalshivang/pledgepay/internal/models"
	"github.com/jaiswalshivang/pledgepay/internal/repository"
)

// Syncer fetches fresh evidence from Codeforces or GitHub before resolution.
type Syncer struct {
	githubClient    *github.GitHubClient
	integrationRepo repository.IntegrationRepository
	userRepo        repository.UserRepository
	evidenceRepo    repository.EvidenceRepository
}

// New creates a new Syncer.
func New(
	githubClient *github.GitHubClient,
	integrationRepo repository.IntegrationRepository,
	userRepo repository.UserRepository,
	evidenceRepo repository.EvidenceRepository,
) *Syncer {
	return &Syncer{
		githubClient:    githubClient,
		integrationRepo: integrationRepo,
		userRepo:        userRepo,
		evidenceRepo:    evidenceRepo,
	}
}

// SyncForCommitment fetches and saves fresh evidence for the commitment.
// Duplicate evidence is silently ignored via ON CONFLICT DO NOTHING.
func (s *Syncer) SyncForCommitment(ctx context.Context, commitment *models.Commitment) error {
	if commitment.Status != "ACTIVE" {
		return nil
	}
	if commitment.EvidenceType == "codeforces_submissions" {
		return s.syncCodeforces(ctx, commitment)
	}
	return s.syncGitHub(ctx, commitment)
}

func (s *Syncer) syncCodeforces(ctx context.Context, commitment *models.Commitment) error {
	cfHandle := ""
	if user, err := s.userRepo.GetByID(ctx, commitment.UserID); err == nil && user != nil && user.CodeforcesUsername != nil {
		cfHandle = *user.CodeforcesUsername
	}
	if cfHandle == "" {
		if integ, err := s.integrationRepo.GetByUserIDAndProvider(ctx, commitment.UserID, "codeforces"); err == nil && integ != nil && integ.ExternalUsername != nil {
			cfHandle = *integ.ExternalUsername
		}
	}
	if cfHandle == "" {
		slog.Warn("evidencesync: no codeforces handle found", "user_id", commitment.UserID, "commitment_id", commitment.ID)
		return nil
	}

	items, err := fetchCodeforcesWithWindow(ctx, cfHandle, commitment.StartDate, commitment.EndDate)
	if err != nil {
		return fmt.Errorf("codeforces fetch failed: %w", err)
	}
	for i := range items {
		items[i].CommitmentID = commitment.ID
	}
	if err := s.evidenceRepo.CreateBatch(ctx, items); err != nil {
		return fmt.Errorf("evidence save failed: %w", err)
	}
	slog.Info("evidencesync: synced codeforces", "commitment_id", commitment.ID, "handle", cfHandle, "synced", len(items))
	return nil
}

func (s *Syncer) syncGitHub(ctx context.Context, commitment *models.Commitment) error {
	if commitment.GithubRepo == nil || *commitment.GithubRepo == "" {
		slog.Warn("evidencesync: no github repo linked", "commitment_id", commitment.ID)
		return nil
	}
	repo := *commitment.GithubRepo

	token := ""
	ghLogin := ""
	if integ, err := s.integrationRepo.GetByUserIDAndProvider(ctx, commitment.UserID, "github"); err == nil && integ != nil {
		token = integ.AccessTokenEnc
		if integ.ExternalUsername != nil {
			ghLogin = *integ.ExternalUsername
		}
	}
	if ghLogin == "" {
		if user, err := s.userRepo.GetByID(ctx, commitment.UserID); err == nil && user != nil && user.GithubUsername != nil {
			ghLogin = *user.GithubUsername
		}
	}

	opts := github.FetchOpts{Until: commitment.EndDate, AuthorLogin: ghLogin}
	items, err := s.githubClient.FetchAllEvidence(ctx, token, repo, commitment.StartDate, opts)
	if err != nil {
		return fmt.Errorf("github fetch failed: %w", err)
	}
	for i := range items {
		items[i].CommitmentID = commitment.ID
	}
	if err := s.evidenceRepo.CreateBatch(ctx, items); err != nil {
		return fmt.Errorf("evidence save failed: %w", err)
	}
	slog.Info("evidencesync: synced github", "commitment_id", commitment.ID, "repo", repo, "author", ghLogin, "synced", len(items))
	return nil
}

type cfSubmission struct {
	ID                  int64 `json:"id"`
	CreationTimeSeconds int64 `json:"creationTimeSeconds"`
	Problem             struct {
		ContestID int    `json:"contestId"`
		Index     string `json:"index"`
		Name      string `json:"name"`
	} `json:"problem"`
	Verdict string `json:"verdict"`
}

func fetchCodeforcesWithWindow(ctx context.Context, handle string, startDate, endDate time.Time) ([]models.Evidence, error) {
	cfURL := fmt.Sprintf("https://codeforces.com/api/user.status?handle=%s&from=1&count=100", url.QueryEscape(handle))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, cfURL, nil)
	if err != nil {
		return nil, err
	}
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var apiResp struct {
		Status string         `json:"status"`
		Result []cfSubmission `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, err
	}
	if apiResp.Status != "OK" {
		return nil, fmt.Errorf("codeforces api status: %s", apiResp.Status)
	}

	seenProblems := make(map[string]bool)
	var items []models.Evidence
	startTolerance := startDate.Add(-1 * time.Minute)
	var endTolerance time.Time
	if !endDate.IsZero() {
		endTolerance = endDate.Add(30 * time.Second)
	}
	for _, sub := range apiResp.Result {
		subTime := time.Unix(sub.CreationTimeSeconds, 0).UTC()
		if sub.Verdict != "OK" {
			continue
		}
		if subTime.Before(startTolerance) || (!endTolerance.IsZero() && subTime.After(endTolerance)) {
			continue
		}
		probKey := fmt.Sprintf("%d_%s", sub.Problem.ContestID, sub.Problem.Index)
		if seenProblems[probKey] {
			continue
		}
		seenProblems[probKey] = true
		probTitle := sub.Problem.Name
		if probTitle == "" {
			probTitle = fmt.Sprintf("Problem %s", sub.Problem.Index)
		}
		items = append(items, models.Evidence{
			Source:     "codeforces_submission",
			SourceRef:  fmt.Sprintf("cf_%d", sub.ID),
			OccurredAt: subTime,
			RawPayload: models.JSONB{
				"submission_id": sub.ID,
				"contest_id":    sub.Problem.ContestID,
				"problem_index": sub.Problem.Index,
				"name":          probTitle,
				"title":         fmt.Sprintf("Codeforces #%d%s: %s", sub.Problem.ContestID, sub.Problem.Index, probTitle),
				"verdict":       sub.Verdict,
				"handle":        handle,
				"url":           fmt.Sprintf("https://codeforces.com/contest/%d/submission/%d", sub.Problem.ContestID, sub.ID),
			},
		})
	}
	return items, nil
}
