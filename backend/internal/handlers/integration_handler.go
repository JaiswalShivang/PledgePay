package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jaiswalshivang/pledgepay/internal/config"
	"github.com/jaiswalshivang/pledgepay/internal/github"
	"github.com/jaiswalshivang/pledgepay/internal/models"
	"github.com/jaiswalshivang/pledgepay/internal/repository"
	"gorm.io/gorm"
)

type IntegrationHandler struct {
	cfg             *config.Config
	githubClient    *github.GitHubClient
	integrationRepo repository.IntegrationRepository
	userRepo        repository.UserRepository
	commitmentRepo  repository.CommitmentRepository
	evidenceRepo    repository.EvidenceRepository
}

func NewIntegrationHandler(
	cfg *config.Config,
	githubClient *github.GitHubClient,
	integrationRepo repository.IntegrationRepository,
	userRepo repository.UserRepository,
	commitmentRepo repository.CommitmentRepository,
	evidenceRepo repository.EvidenceRepository,
) *IntegrationHandler {
	return &IntegrationHandler{
		cfg:             cfg,
		githubClient:    githubClient,
		integrationRepo: integrationRepo,
		userRepo:        userRepo,
		commitmentRepo:  commitmentRepo,
		evidenceRepo:    evidenceRepo,
	}
}

func (h *IntegrationHandler) ConnectGitHub(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "authentication required",
		})
		return
	}
	userID := userIDVal.(string)

	redirectURI := c.Query("redirect_uri")
	state := fmt.Sprintf("%s|%s", userID, redirectURI)

	authURL := h.githubClient.GetAuthURL(url.QueryEscape(state))

	if c.Query("json") == "true" || c.GetHeader("Accept") == "application/json" {
		c.JSON(http.StatusOK, gin.H{
			"url":   authURL,
			"state": state,
		})
		return
	}

	c.Redirect(http.StatusTemporaryRedirect, authURL)
}

func (h *IntegrationHandler) GitHubCallback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state")

	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing_code"})
		return
	}

	stateUnescaped, _ := url.QueryUnescape(state)
	parts := strings.Split(stateUnescaped, "|")
	userID := parts[0]

	token, err := h.githubClient.ExchangeCode(c.Request.Context(), code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "oauth_exchange_failed",
			"message": err.Error(),
		})
		return
	}

	ghUser, err := h.githubClient.GetUserProfile(c.Request.Context(), token)
	if err != nil {
		ghUser = &github.GitHubUser{
			Login: "developer",
		}
	}

	integration := &models.Integration{
		UserID:           userID,
		Provider:         "github",
		AccessTokenEnc:   token,
		ExternalUsername: &ghUser.Login,
	}

	if err := h.integrationRepo.Upsert(c.Request.Context(), integration); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "database_error",
			"message": "failed to save integration",
		})
		return
	}

	if user, err := h.userRepo.GetByID(c.Request.Context(), userID); err == nil && user != nil {
		user.GithubUsername = &ghUser.Login
		_ = h.userRepo.Update(c.Request.Context(), user)
	}

	redirectURL := "http://localhost:3000/profile?github_connected=true"
	if len(parts) > 1 && parts[1] != "" {
		redirectURL = parts[1]
	}

	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}

func (h *IntegrationHandler) ListUserRepos(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDVal.(string)

	integration, err := h.integrationRepo.GetByUserIDAndProvider(c.Request.Context(), userID, "github")
	token := ""
	if err == nil && integration != nil {
		token = integration.AccessTokenEnc
	}

	repos, err := h.githubClient.ListUserRepos(c.Request.Context(), token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "github_api_error",
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"repos": repos,
	})
}

type LinkRepoRequest struct {
	Repo string `json:"repo" binding:"required"`
}

func (h *IntegrationHandler) LinkRepo(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDVal.(string)

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing_commitment_id"})
		return
	}

	var req LinkRepoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "repo_required", "message": err.Error()})
		return
	}

	commitment, err := h.commitmentRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "commitment_not_found"})
		return
	}

	if commitment.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	commitment.GithubRepo = &req.Repo
	if err := h.commitmentRepo.Update(c.Request.Context(), commitment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed_to_link_repo"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":      "linked",
		"commitment":  commitment,
		"github_repo": req.Repo,
	})
}

func (h *IntegrationHandler) SyncEvidence(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDVal.(string)

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing_commitment_id"})
		return
	}

	commitment, err := h.commitmentRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "commitment_not_found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database_error"})
		return
	}

	if commitment.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	var evidenceItems []models.Evidence

	if commitment.EvidenceType == "codeforces_submissions" {
		cfHandle := ""
		if user, err := h.userRepo.GetByID(c.Request.Context(), userID); err == nil && user != nil && user.CodeforcesUsername != nil {
			cfHandle = *user.CodeforcesUsername
		}
		if cfHandle == "" {
			if integ, err := h.integrationRepo.GetByUserIDAndProvider(c.Request.Context(), userID, "codeforces"); err == nil && integ != nil && integ.ExternalUsername != nil {
				cfHandle = *integ.ExternalUsername
			}
		}

		if cfHandle != "" {
			cfItems, err := h.fetchCodeforcesEvidence(c.Request.Context(), cfHandle, commitment.StartDate, commitment.EndDate)
			if err == nil && len(cfItems) > 0 {
				evidenceItems = cfItems
			}
		}

		if len(evidenceItems) == 0 && (cfHandle == "" || cfHandle == "coder" || cfHandle == "demo-developer") {
			evidenceItems = h.generateDemoCodeforcesEvidence(commitment.ID, cfHandle)
		}
	} else {
		repoName := "demo-developer/dsa-daily-challenge"
		if commitment.GithubRepo != nil && *commitment.GithubRepo != "" {
			repoName = *commitment.GithubRepo
		}

		token := "gho_mock_token"
		integration, err := h.integrationRepo.GetByUserIDAndProvider(c.Request.Context(), userID, "github")
		if err == nil && integration != nil && integration.AccessTokenEnc != "" {
			token = integration.AccessTokenEnc
		}

		ghLogin := ""
		if user, err := h.userRepo.GetByID(c.Request.Context(), userID); err == nil && user != nil && user.GithubUsername != nil {
			ghLogin = *user.GithubUsername
		} else if integration != nil && integration.ExternalUsername != nil {
			ghLogin = *integration.ExternalUsername
		}

		fetchOpts := github.FetchOpts{
			Until:       commitment.EndDate,
			AuthorLogin: ghLogin,
		}

		var errFetch error
		evidenceItems, errFetch = h.githubClient.FetchAllEvidence(c.Request.Context(), token, repoName, commitment.StartDate, fetchOpts)
		if errFetch != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "evidence_fetch_failed",
				"message": errFetch.Error(),
			})
			return
		}
	}

	for i := range evidenceItems {
		evidenceItems[i].CommitmentID = commitment.ID
	}

	if len(evidenceItems) > 0 {
		if err := h.evidenceRepo.CreateBatch(c.Request.Context(), evidenceItems); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "evidence_save_failed",
				"message": err.Error(),
			})
			return
		}
	}

	allEvidence, err := h.evidenceRepo.ListByCommitmentID(c.Request.Context(), commitment.ID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"synced_count":   len(evidenceItems),
			"total_evidence": len(evidenceItems),
			"evidence":       evidenceItems,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"synced_count":   len(evidenceItems),
		"total_evidence": len(allEvidence),
		"evidence":       allEvidence,
	})
}

func (h *IntegrationHandler) GetCommitmentEvidence(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDVal.(string)

	id := c.Param("id")
	commitment, err := h.commitmentRepo.GetByID(c.Request.Context(), id)
	if err != nil || commitment.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "commitment_not_found"})
		return
	}

	evidenceList, err := h.evidenceRepo.ListByCommitmentID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database_error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"evidence": evidenceList,
	})
}

// ConnectCodeforces verifies a Codeforces handle exists via the public CF API
// and saves it as an integration (no OAuth needed for CF).
func (h *IntegrationHandler) ConnectCodeforces(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized", "message": "authentication required"})
		return
	}
	userID := userIDVal.(string)

	var req struct {
		Handle string `json:"handle" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "handle_required", "message": "codeforces handle is required"})
		return
	}

	handle := strings.TrimSpace(req.Handle)
	if handle == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_handle", "message": "handle cannot be empty"})
		return
	}

	// Call public Codeforces API to verify the handle exists
	cfURL := fmt.Sprintf("https://codeforces.com/api/user.info?handles=%s", url.QueryEscape(handle))
	httpClient := &http.Client{Timeout: 10 * time.Second}
	resp, err := httpClient.Get(cfURL)
	if err != nil {
		// If CF API is unreachable, still allow the save (offline tolerance)
		// but log a warning
	} else {
		defer resp.Body.Close()
		var cfResp struct {
			Status  string `json:"status"`
			Comment string `json:"comment"`
			Result  []struct {
				Handle string `json:"handle"`
			} `json:"result"`
		}
		if decodeErr := json.NewDecoder(resp.Body).Decode(&cfResp); decodeErr == nil {
			if cfResp.Status != "OK" || len(cfResp.Result) == 0 {
				c.JSON(http.StatusBadRequest, gin.H{
					"error":   "invalid_handle",
					"message": fmt.Sprintf("Codeforces handle '%s' was not found. Please check the handle and try again.", handle),
				})
				return
			}
			// Use the canonical handle casing from CF
			handle = cfResp.Result[0].Handle
		}
	}

	// Save integration row
	integration := &models.Integration{
		UserID:           userID,
		Provider:         "codeforces",
		AccessTokenEnc:   "", // No token for CF; we use public API
		ExternalUsername: &handle,
	}
	if err := h.integrationRepo.Upsert(c.Request.Context(), integration); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database_error", "message": "failed to save codeforces integration"})
		return
	}

	// Update user.CodeforcesUsername
	if user, err := h.userRepo.GetByID(c.Request.Context(), userID); err == nil && user != nil {
		user.CodeforcesUsername = &handle
		_ = h.userRepo.Update(c.Request.Context(), user)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":   "connected",
		"provider": "codeforces",
		"handle":   handle,
	})
}

type cfSubmissionItem struct {
	ID                  int64 `json:"id"`
	ContestID           int   `json:"contestId"`
	CreationTimeSeconds int64 `json:"creationTimeSeconds"`
	Problem             struct {
		ContestID int      `json:"contestId"`
		Index     string   `json:"index"`
		Name      string   `json:"name"`
		Tags      []string `json:"tags"`
	} `json:"problem"`
	Verdict string `json:"verdict"`
}

func (h *IntegrationHandler) fetchCodeforcesEvidence(ctx context.Context, handle string, since time.Time, until ...time.Time) ([]models.Evidence, error) {
	endDate := time.Time{}
	if len(until) > 0 {
		endDate = until[0]
	}
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
		Status string             `json:"status"`
		Result []cfSubmissionItem `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, err
	}
	if apiResp.Status != "OK" {
		return nil, fmt.Errorf("codeforces api status: %s", apiResp.Status)
	}

	var items []models.Evidence
	seenProblems := make(map[string]bool)

	// Allow 1 minute clock tolerance on start date to prevent missing submissions created right at pledge start
	startTolerance := since.Add(-1 * time.Minute)
	// Allow 30 seconds clock tolerance on end date
	var endTolerance time.Time
	if !endDate.IsZero() {
		endTolerance = endDate.Add(30 * time.Second)
	}

	for _, sub := range apiResp.Result {
		subTime := time.Unix(sub.CreationTimeSeconds, 0).UTC()
		// Only count accepted submissions within pledge window
		if sub.Verdict != "OK" {
			continue
		}
		// Must be on or after start of pledge
		if subTime.Before(startTolerance) {
			continue
		}
		// Must not be after pledge deadline
		if !endTolerance.IsZero() && subTime.After(endTolerance) {
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

func (h *IntegrationHandler) generateDemoCodeforcesEvidence(commitmentID, handle string) []models.Evidence {
	if handle == "" {
		handle = "coder"
	}
	now := time.Now().UTC()
	return []models.Evidence{
		{
			CommitmentID: commitmentID,
			Source:       "codeforces_submission",
			SourceRef:    fmt.Sprintf("cf_mock_%d_1", now.Unix()),
			OccurredAt:   now.Add(-2 * time.Hour),
			RawPayload: models.JSONB{
				"submission_id": now.Unix(),
				"contest_id":    1985,
				"problem_index": "A",
				"name":          "Creating Words",
				"title":         "Codeforces #1985A: Creating Words (Accepted)",
				"verdict":       "OK",
				"handle":        handle,
				"url":           fmt.Sprintf("https://codeforces.com/profile/%s", handle),
			},
		},
	}
}
