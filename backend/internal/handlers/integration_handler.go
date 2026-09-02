package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"

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

	repoName := "demo-developer/dsa-daily-challenge"
	if commitment.GithubRepo != nil && *commitment.GithubRepo != "" {
		repoName = *commitment.GithubRepo
	}

	token := "gho_mock_token"
	integration, err := h.integrationRepo.GetByUserIDAndProvider(c.Request.Context(), userID, "github")
	if err == nil && integration != nil && integration.AccessTokenEnc != "" {
		token = integration.AccessTokenEnc
	}

	evidenceItems, err := h.githubClient.FetchAllEvidence(c.Request.Context(), token, repoName, commitment.StartDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "evidence_fetch_failed",
			"message": err.Error(),
		})
		return
	}

	for i := range evidenceItems {
		evidenceItems[i].CommitmentID = commitment.ID
	}

	if err := h.evidenceRepo.CreateBatch(c.Request.Context(), evidenceItems); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "evidence_save_failed",
			"message": err.Error(),
		})
		return
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
