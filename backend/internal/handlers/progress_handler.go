package handlers

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jaiswalshivang/pledgepay/internal/models"
	"github.com/jaiswalshivang/pledgepay/internal/repository"
	"github.com/jaiswalshivang/pledgepay/internal/rules"
	"gorm.io/gorm"
)

type ProgressHandler struct {
	commitmentRepo   repository.CommitmentRepository
	evidenceRepo     repository.EvidenceRepository
	verificationRepo repository.VerificationRepository
}

func NewProgressHandler(
	commitmentRepo repository.CommitmentRepository,
	evidenceRepo repository.EvidenceRepository,
	verificationRepo repository.VerificationRepository,
) *ProgressHandler {
	return &ProgressHandler{
		commitmentRepo:   commitmentRepo,
		evidenceRepo:     evidenceRepo,
		verificationRepo: verificationRepo,
	}
}

func (h *ProgressHandler) GetProgress(c *gin.Context) {
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

	evidenceList, err := h.evidenceRepo.ListByCommitmentID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "evidence_query_error"})
		return
	}

	now := time.Now().UTC()
	progress := rules.CalculateProgress(commitment, evidenceList, now)

	snapshot := &models.VerificationResult{
		CommitmentID:  commitment.ID,
		EvidenceCount: progress.EvidenceCount,
		VerifiedCount: progress.Verified,
		ProgressPct:   progress.ProgressPct,
		CreatedAt:     now,
	}
	_ = h.verificationRepo.Create(c.Request.Context(), snapshot)

	c.JSON(http.StatusOK, gin.H{
		"progress": progress,
	})
}
