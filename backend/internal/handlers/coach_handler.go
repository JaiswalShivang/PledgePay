package handlers

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jaiswalshivang/pledgepay/internal/ai"
	"github.com/jaiswalshivang/pledgepay/internal/repository"
	"github.com/jaiswalshivang/pledgepay/internal/rules"
	"gorm.io/gorm"
)

type CoachHandler struct {
	groqClient     *ai.GroqClient
	commitmentRepo repository.CommitmentRepository
	evidenceRepo   repository.EvidenceRepository
}

type CoachRequest struct {
	Question string `json:"question" binding:"required"`
}

func NewCoachHandler(
	groqClient *ai.GroqClient,
	commitmentRepo repository.CommitmentRepository,
	evidenceRepo repository.EvidenceRepository,
) *CoachHandler {
	return &CoachHandler{
		groqClient:     groqClient,
		commitmentRepo: commitmentRepo,
		evidenceRepo:   evidenceRepo,
	}
}

func (h *CoachHandler) AskCoach(c *gin.Context) {
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

	var req CoachRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_question_payload"})
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

	evidenceList, err := h.evidenceRepo.ListByCommitmentID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "evidence_query_error"})
		return
	}

	now := time.Now().UTC()
	progress := rules.CalculateProgress(commitment, evidenceList, now)

	reply, err := h.groqClient.AskCoach(c.Request.Context(), commitment, progress, strings.TrimSpace(req.Question))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "coach_inference_error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"reply":    reply,
		"progress": progress,
	})
}
