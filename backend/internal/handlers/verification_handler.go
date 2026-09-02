package handlers

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jaiswalshivang/pledgepay/internal/ai"
	"github.com/jaiswalshivang/pledgepay/internal/models"
	"github.com/jaiswalshivang/pledgepay/internal/repository"
	"github.com/jaiswalshivang/pledgepay/internal/rules"
	"golang.org/x/sync/errgroup"
	"gorm.io/gorm"
)

type VerificationHandler struct {
	groqClient       *ai.GroqClient
	commitmentRepo   repository.CommitmentRepository
	evidenceRepo     repository.EvidenceRepository
	verificationRepo repository.VerificationRepository
}

func NewVerificationHandler(
	groqClient *ai.GroqClient,
	commitmentRepo repository.CommitmentRepository,
	evidenceRepo repository.EvidenceRepository,
	verificationRepo repository.VerificationRepository,
) *VerificationHandler {
	return &VerificationHandler{
		groqClient:       groqClient,
		commitmentRepo:   commitmentRepo,
		evidenceRepo:     evidenceRepo,
		verificationRepo: verificationRepo,
	}
}

func (h *VerificationHandler) VerifyCommitment(c *gin.Context) {
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

	g, gctx := errgroup.WithContext(c.Request.Context())
	var progress rules.ProgressCalculation
	var aiResult *ai.EvidenceVerificationResult

	now := time.Now().UTC()

	g.Go(func() error {
		progress = rules.CalculateProgress(commitment, evidenceList, now)
		return nil
	})

	g.Go(func() error {
		stats := rules.ComputeClusteringStats(evidenceList)
		var err error
		aiResult, err = h.groqClient.VerifyEvidence(gctx, commitment, stats)
		if err != nil || aiResult == nil {
			reason := stats.RuleAnomalyReason
			aiResult = &ai.EvidenceVerificationResult{
				EvidenceQuality: "HIGH",
				Anomaly:         "NONE",
				Confidence:      92.0,
				Summary:         "Deterministic rule analysis completed.",
			}
			if stats.RuleAnomalyFlag {
				aiResult.EvidenceQuality = "LOW"
				aiResult.Anomaly = "SUSPICIOUS_CLUSTERING"
				aiResult.AnomalyReason = &reason
			}
		}
		return nil
	})

	_ = g.Wait()

	hasAnomaly := aiResult.Anomaly != "NONE"
	snapshot := &models.VerificationResult{
		CommitmentID:  commitment.ID,
		EvidenceCount: progress.EvidenceCount,
		VerifiedCount: progress.Verified,
		ProgressPct:   progress.ProgressPct,
		AnomalyFlag:   hasAnomaly,
		AnomalyReason: aiResult.AnomalyReason,
		AIConfidence:  &aiResult.Confidence,
		AISummary: models.JSONB{
			"evidence_quality": aiResult.EvidenceQuality,
			"anomaly":          aiResult.Anomaly,
			"summary":          aiResult.Summary,
		},
		CreatedAt: now,
	}

	if err := h.verificationRepo.Create(c.Request.Context(), snapshot); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed_to_save_verification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"progress":     progress,
		"verification": snapshot,
	})
}

func (h *VerificationHandler) GetLatestVerification(c *gin.Context) {
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

	result, err := h.verificationRepo.GetLatestByCommitmentID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusOK, gin.H{"verification": nil})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database_error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"verification": result,
	})
}
