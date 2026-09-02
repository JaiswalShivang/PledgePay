package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jaiswalshivang/pledgepay/internal/models"
	"github.com/jaiswalshivang/pledgepay/internal/repository"
	"github.com/jaiswalshivang/pledgepay/internal/rules"
	"golang.org/x/sync/errgroup"
)

type DashboardHandler struct {
	commitmentRepo   repository.CommitmentRepository
	evidenceRepo     repository.EvidenceRepository
	donationRepo     repository.DonationRepository
	verificationRepo repository.VerificationRepository
}

type DashboardItem struct {
	Commitment   models.Commitment          `json:"commitment"`
	Progress     rules.ProgressCalculation  `json:"progress"`
	Donation     *models.Donation           `json:"donation,omitempty"`
	Verification *models.VerificationResult `json:"verification,omitempty"`
}

type DashboardStats struct {
	TotalPledgedPaise      int64   `json:"total_pledged_paise"`
	ActiveCommitmentsCount int     `json:"active_commitments_count"`
	CompletedCount         int     `json:"completed_count"`
	TotalDonatedPaise      int64   `json:"total_donated_paise"`
	AverageProgressPct     float64 `json:"average_progress_pct"`
}

func NewDashboardHandler(
	commitmentRepo repository.CommitmentRepository,
	evidenceRepo repository.EvidenceRepository,
	donationRepo repository.DonationRepository,
	verificationRepo repository.VerificationRepository,
) *DashboardHandler {
	return &DashboardHandler{
		commitmentRepo:   commitmentRepo,
		evidenceRepo:     evidenceRepo,
		donationRepo:     donationRepo,
		verificationRepo: verificationRepo,
	}
}

func (h *DashboardHandler) GetDashboard(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDVal.(string)

	commitments, err := h.commitmentRepo.ListByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed_to_list_commitments"})
		return
	}

	items := make([]DashboardItem, len(commitments))
	g, gctx := errgroup.WithContext(c.Request.Context())
	sem := make(chan struct{}, 10)
	now := time.Now().UTC()

	for i := range commitments {
		idx := i
		comm := commitments[idx]
		g.Go(func() error {
			sem <- struct{}{}
			defer func() { <-sem }()

			evidenceList, _ := h.evidenceRepo.ListByCommitmentID(gctx, comm.ID)
			prog := rules.CalculateProgress(&comm, evidenceList, now)
			verif, _ := h.verificationRepo.GetLatestByCommitmentID(gctx, comm.ID)
			don, _ := h.donationRepo.GetByCommitmentID(gctx, comm.ID)

			items[idx] = DashboardItem{
				Commitment:   comm,
				Progress:     prog,
				Donation:     don,
				Verification: verif,
			}
			return nil
		})
	}

	_ = g.Wait()

	var totalPledged int64 = 0
	activeCount := 0
	completedCount := 0
	var totalDonated int64 = 0
	var sumProgress float64 = 0.0

	for _, item := range items {
		totalPledged += item.Commitment.AmountPaise
		if item.Commitment.Status == "ACTIVE" {
			activeCount++
		} else if item.Commitment.Status == "COMPLETED" {
			completedCount++
		}

		if item.Donation != nil && item.Donation.Status == "PAID" {
			totalDonated += item.Donation.AmountPaise
		}
		sumProgress += item.Progress.ProgressPct
	}

	avgProgress := 0.0
	if len(items) > 0 {
		avgProgress = sumProgress / float64(len(items))
	}

	stats := DashboardStats{
		TotalPledgedPaise:      totalPledged,
		ActiveCommitmentsCount: activeCount,
		CompletedCount:         completedCount,
		TotalDonatedPaise:      totalDonated,
		AverageProgressPct:     avgProgress,
	}

	c.JSON(http.StatusOK, gin.H{
		"stats": stats,
		"items": items,
	})
}
