package handlers

import (
	"errors"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jaiswalshivang/pledgepay/internal/models"
	"github.com/jaiswalshivang/pledgepay/internal/repository"
	"gorm.io/gorm"
)

type CommitmentHandler struct {
	commitmentRepo repository.CommitmentRepository
	charityRepo    repository.CharityRepository
}

func NewCommitmentHandler(
	commitmentRepo repository.CommitmentRepository,
	charityRepo repository.CharityRepository,
) *CommitmentHandler {
	return &CommitmentHandler{
		commitmentRepo: commitmentRepo,
		charityRepo:    charityRepo,
	}
}

type CreateCommitmentRequest struct {
	Title        string   `json:"title" binding:"required"`
	Description  *string  `json:"description"`
	TargetCount  int      `json:"target_count" binding:"required,min=1"`
	Unit         string   `json:"unit" binding:"required"`
	DurationDays int      `json:"duration_days" binding:"required,min=1"`
	EvidenceType string   `json:"evidence_type"`
	AmountPaise  int64    `json:"amount_paise" binding:"required,min=100"`
	QualityScore *float64 `json:"quality_score"`
	CharityID    string   `json:"charity_id" binding:"required"`
}

func (h *CommitmentHandler) CreateCommitment(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "authentication required",
		})
		return
	}
	userID := userIDVal.(string)

	var req CreateCommitmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_failed",
			"message": err.Error(),
		})
		return
	}

	if req.CharityID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "charity_required",
			"message": "charity_id is required: a commitment cannot exist without knowing where the fallback pledge will go",
		})
		return
	}

	charity, err := h.charityRepo.GetByID(c.Request.Context(), req.CharityID)
	if err != nil || charity == nil || !charity.IsActive {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_charity",
			"message": "selected charity does not exist or is inactive",
		})
		return
	}

	evidenceType := req.EvidenceType
	if evidenceType == "" {
		evidenceType = "github_activity"
	}

	startDate := time.Now().UTC()
	endDate := startDate.AddDate(0, 0, req.DurationDays)

	lowerTitle := strings.ToLower(req.Title)
	reMin := regexp.MustCompile(`(?i)(\d+)\s*(?:minutes?|mins?)\b`)
	if m := reMin.FindStringSubmatch(lowerTitle); len(m) > 1 {
		if n, err := strconv.Atoi(m[1]); err == nil && n > 0 {
			endDate = startDate.Add(time.Duration(n) * time.Minute)
		}
	}
	reHr := regexp.MustCompile(`(?i)(\d+)\s*(?:hours?|hrs?)\b`)
	if m := reHr.FindStringSubmatch(lowerTitle); len(m) > 1 {
		if n, err := strconv.Atoi(m[1]); err == nil && n > 0 {
			endDate = startDate.Add(time.Duration(n) * time.Hour)
		}
	}

	commitment := &models.Commitment{
		UserID:       userID,
		CharityID:    &req.CharityID,
		Title:        req.Title,
		Description:  req.Description,
		TargetCount:  req.TargetCount,
		Unit:         req.Unit,
		DurationDays: req.DurationDays,
		StartDate:    startDate,
		EndDate:      endDate,
		EvidenceType: evidenceType,
		AmountPaise:  req.AmountPaise,
		Status:       "DRAFT",
		QualityScore: req.QualityScore,
	}

	if err := h.commitmentRepo.Create(c.Request.Context(), commitment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "database_error",
			"message": "failed to save commitment draft",
		})
		return
	}

	rule := &models.CommitmentRule{
		CommitmentID: commitment.ID,
		RuleType:     "target_count",
		RuleConfig: models.JSONB{
			"target": req.TargetCount,
			"unit":   req.Unit,
		},
	}
	_ = h.commitmentRepo.AddRule(c.Request.Context(), rule)

	created, err := h.commitmentRepo.GetByID(c.Request.Context(), commitment.ID)
	if err != nil {
		c.JSON(http.StatusCreated, gin.H{"commitment": commitment})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"commitment": created})
}

func (h *CommitmentHandler) ListMyCommitments(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "authentication required",
		})
		return
	}
	userID := userIDVal.(string)

	list, err := h.commitmentRepo.ListByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "database_error",
			"message": "failed to list user commitments",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"commitments": list})
}

func (h *CommitmentHandler) GetCommitmentByID(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "authentication required",
		})
		return
	}
	userID := userIDVal.(string)

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_parameter",
			"message": "commitment ID is required",
		})
		return
	}

	commitment, err := h.commitmentRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "not_found",
				"message": "commitment not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "database_error",
			"message": "failed to retrieve commitment",
		})
		return
	}

	if commitment.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "you do not have permission to view this commitment",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"commitment": commitment})
}
