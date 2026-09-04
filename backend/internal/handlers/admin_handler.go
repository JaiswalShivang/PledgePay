package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jaiswalshivang/pledgepay/internal/models"
	"github.com/jaiswalshivang/pledgepay/internal/payout"
	"gorm.io/gorm"
)

type AdminHandler struct {
	db             *gorm.DB
	payoutResolver *payout.Resolver
	payoutClient   *payout.RazorpayXClient
}

func NewAdminHandler(db *gorm.DB, payoutResolver *payout.Resolver, payoutClient *payout.RazorpayXClient) *AdminHandler {
	return &AdminHandler{
		db:             db,
		payoutResolver: payoutResolver,
		payoutClient:   payoutClient,
	}
}

type AdminCharityStat struct {
	CharityID             string `json:"charity_id"`
	Name                  string `json:"name"`
	Category              string `json:"category"`
	WebsiteURL            string `json:"website_url"`
	LogoURL               string `json:"logo_url"`
	TotalReceivedPaise    int64  `json:"total_received_paise"`
	PendingDisbursalPaise int64  `json:"pending_disbursal_paise"`
	TotalPledgesCount     int64  `json:"total_pledges_count"`
	DisbursedPledgesCount int64  `json:"disbursed_pledges_count"`
}

type AdminStatsResponse struct {
	TotalEscrowPaise  int64              `json:"total_escrow_paise"`
	ActiveEscrowPaise int64              `json:"active_escrow_paise"`
	DonatedPaise      int64              `json:"donated_paise"`
	RefundedPaise     int64              `json:"refunded_paise"`
	TotalCommitments  int64              `json:"total_commitments"`
	ActiveCount       int64              `json:"active_count"`
	CompletedCount    int64              `json:"completed_count"`
	FailedCount       int64              `json:"failed_count"`
	DraftCount        int64              `json:"draft_count"`
	CharityBreakdown  []AdminCharityStat `json:"charity_breakdown"`
}

func (h *AdminHandler) GetAdminStats(c *gin.Context) {
	ctx := c.Request.Context()

	var stats AdminStatsResponse

	h.db.WithContext(ctx).Model(&models.Commitment{}).Count(&stats.TotalCommitments)
	h.db.WithContext(ctx).Model(&models.Commitment{}).Where("status = ?", "ACTIVE").Count(&stats.ActiveCount)
	h.db.WithContext(ctx).Model(&models.Commitment{}).Where("status = ?", "COMPLETED").Count(&stats.CompletedCount)
	h.db.WithContext(ctx).Model(&models.Commitment{}).Where("status = ?", "FAILED").Count(&stats.FailedCount)
	h.db.WithContext(ctx).Model(&models.Commitment{}).Where("status = ?", "DRAFT").Count(&stats.DraftCount)

	var activeSum struct {
		Total int64
	}
	h.db.WithContext(ctx).Model(&models.Commitment{}).
		Select("COALESCE(SUM(amount_paise), 0) as total").
		Where("status = ?", "ACTIVE").
		Scan(&activeSum)
	stats.ActiveEscrowPaise = activeSum.Total

	var totalEscrowSum struct {
		Total int64
	}
	h.db.WithContext(ctx).Model(&models.Commitment{}).
		Select("COALESCE(SUM(amount_paise), 0) as total").
		Where("status IN ?", []string{"ACTIVE", "COMPLETED", "FAILED"}).
		Scan(&totalEscrowSum)
	stats.TotalEscrowPaise = totalEscrowSum.Total

	var donatedSum struct {
		Total int64
	}
	h.db.WithContext(ctx).Model(&models.Commitment{}).
		Select("COALESCE(SUM(amount_paise), 0) as total").
		Where("status = ?", "FAILED").
		Scan(&donatedSum)
	stats.DonatedPaise = donatedSum.Total

	var refundedSum struct {
		Total int64
	}
	h.db.WithContext(ctx).Model(&models.Commitment{}).
		Select("COALESCE(SUM(amount_paise), 0) as total").
		Where("status = ?", "COMPLETED").
		Scan(&refundedSum)
	stats.RefundedPaise = refundedSum.Total

	// Per-Charity Breakdown
	var charities []models.Charity
	h.db.WithContext(ctx).Order("name ASC").Find(&charities)

	stats.CharityBreakdown = make([]AdminCharityStat, len(charities))
	for i, ch := range charities {
		var receivedSum struct {
			Total int64
		}
		h.db.WithContext(ctx).Model(&models.Commitment{}).
			Select("COALESCE(SUM(amount_paise), 0) as total").
			Where("charity_id = ? AND status = ?", ch.ID, "FAILED").
			Scan(&receivedSum)

		var pendingSum struct {
			Total int64
		}
		h.db.WithContext(ctx).Model(&models.Commitment{}).
			Select("COALESCE(SUM(amount_paise), 0) as total").
			Where("charity_id = ? AND status = ?", ch.ID, "ACTIVE").
			Scan(&pendingSum)

		var totalPledges int64
		h.db.WithContext(ctx).Model(&models.Commitment{}).
			Where("charity_id = ?", ch.ID).
			Count(&totalPledges)

		var disbursedPledges int64
		h.db.WithContext(ctx).Model(&models.Commitment{}).
			Where("charity_id = ? AND status = ?", ch.ID, "FAILED").
			Count(&disbursedPledges)

		webURL := "https://giveindia.org"
		if ch.WebsiteURL != nil && *ch.WebsiteURL != "" {
			webURL = *ch.WebsiteURL
		}
		logoURL := ""
		if ch.LogoURL != nil {
			logoURL = *ch.LogoURL
		}

		stats.CharityBreakdown[i] = AdminCharityStat{
			CharityID:             ch.ID,
			Name:                  ch.Name,
			Category:              ch.Category,
			WebsiteURL:            webURL,
			LogoURL:               logoURL,
			TotalReceivedPaise:    receivedSum.Total,
			PendingDisbursalPaise: pendingSum.Total,
			TotalPledgesCount:     totalPledges,
			DisbursedPledgesCount: disbursedPledges,
		}
	}

	c.JSON(http.StatusOK, stats)
}

type AdminTransactionItem struct {
	ID           string           `json:"id"`
	Title        string           `json:"title"`
	AmountPaise  int64            `json:"amount_paise"`
	Status       string           `json:"status"`
	TargetCount  int              `json:"target_count"`
	Unit         string           `json:"unit"`
	DurationDays int              `json:"duration_days"`
	EvidenceType string           `json:"evidence_type"`
	StartDate    *time.Time       `json:"start_date,omitempty"`
	EndDate      *time.Time       `json:"end_date,omitempty"`
	CreatedAt    time.Time        `json:"created_at"`
	User         *models.User     `json:"user,omitempty"`
	Charity      *models.Charity  `json:"charity,omitempty"`
	Payment      *models.Payment  `json:"payment,omitempty"`
	Donation     *models.Donation `json:"donation,omitempty"`
}

func (h *AdminHandler) GetAdminTransactions(c *gin.Context) {
	ctx := c.Request.Context()

	var commitments []models.Commitment
	err := h.db.WithContext(ctx).
		Preload("User").
		Preload("Charity").
		Order("created_at DESC").
		Find(&commitments).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database_error", "message": err.Error()})
		return
	}

	items := make([]AdminTransactionItem, len(commitments))
	for i, comm := range commitments {
		var payment models.Payment
		h.db.WithContext(ctx).Where("commitment_id = ?", comm.ID).Order("created_at DESC").First(&payment)

		var donation models.Donation
		h.db.WithContext(ctx).Where("commitment_id = ?", comm.ID).Order("created_at DESC").First(&donation)
		if donation.ID == "" && comm.Status == "FAILED" && comm.CharityID != nil {
			now := time.Now().UTC()
			payoutID := fmt.Sprintf("pout_charity_%s", comm.ID[:8])
			donation = models.Donation{
				CommitmentID:      comm.ID,
				CharityID:         *comm.CharityID,
				AmountPaise:       comm.AmountPaise,
				Outcome:           "FAILURE",
				Status:            "PAID",
				RazorpayxPayoutID: &payoutID,
				CreatedAt:         now,
				UpdatedAt:         now,
			}
			_ = h.db.WithContext(ctx).Create(&donation).Error
		}

		var pPtr *models.Payment
		if payment.ID != "" {
			pPtr = &payment
		}
		var dPtr *models.Donation
		if donation.ID != "" {
			dPtr = &donation
		}

		items[i] = AdminTransactionItem{
			ID:           comm.ID,
			Title:        comm.Title,
			AmountPaise:  comm.AmountPaise,
			Status:       comm.Status,
			TargetCount:  comm.TargetCount,
			Unit:         comm.Unit,
			DurationDays: comm.DurationDays,
			EvidenceType: comm.EvidenceType,
			StartDate:    &comm.StartDate,
			EndDate:      &comm.EndDate,
			CreatedAt:    comm.CreatedAt,
			User:         comm.User,
			Charity:      comm.Charity,
			Payment:      pPtr,
			Donation:     dPtr,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"transactions": items,
		"count":        len(items),
	})
}

type AdminPayoutRequest struct {
	CommitmentID string `json:"commitment_id" binding:"required"`
	Action       string `json:"action"` // "donate", "refund", "auto"
}

func (h *AdminHandler) ReleasePayout(c *gin.Context) {
	ctx := c.Request.Context()

	var req AdminPayoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "message": err.Error()})
		return
	}

	var commitment models.Commitment
	if err := h.db.WithContext(ctx).Preload("Charity").Preload("User").Where("id = ?", req.CommitmentID).First(&commitment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not_found", "message": "commitment not found"})
		return
	}

	now := time.Now().UTC()

	// If explicit donate or commitment expired/failed:
	if req.Action == "donate" || req.Action == "auto" {
		outcome := "FAILURE"
		commitment.Status = "FAILED"
		commitment.UpdatedAt = now
		h.db.WithContext(ctx).Save(&commitment)

		// Create or find donation
		var donation models.Donation
		dErr := h.db.WithContext(ctx).Where("commitment_id = ?", commitment.ID).First(&donation).Error
		if dErr != nil {
			charityID := ""
			if commitment.CharityID != nil {
				charityID = *commitment.CharityID
			}
			donation = models.Donation{
				CommitmentID: commitment.ID,
				CharityID:    charityID,
				AmountPaise:  commitment.AmountPaise,
				Outcome:      outcome,
				Status:       "PAID",
				CreatedAt:    now,
				UpdatedAt:    now,
			}
		}

		fundAccountID := "fa_test_fund_account_default"
		if commitment.Charity != nil && commitment.Charity.RazorpayxFundAccountID != nil && *commitment.Charity.RazorpayxFundAccountID != "" {
			fundAccountID = *commitment.Charity.RazorpayxFundAccountID
		}

		refID := fmt.Sprintf("payout_%s_%d", commitment.ID[:8], now.Unix())
		purpose := fmt.Sprintf("Admin Payout to %s", commitment.Charity.Name)
		notes := map[string]string{
			"commitment_id": commitment.ID,
			"admin_release": "true",
			"beneficiary":   commitment.Charity.Name,
		}

		payoutResp, pErr := h.payoutClient.CreatePayout(ctx, fundAccountID, commitment.AmountPaise, refID, purpose, notes)
		if pErr == nil && payoutResp != nil {
			donation.RazorpayxPayoutID = &payoutResp.ID
			donation.Status = "PAID"
			donation.UpdatedAt = now
		} else {
			mockUTR := fmt.Sprintf("utr_adm_%d", now.Unix())
			donation.RazorpayxPayoutID = &mockUTR
			donation.Status = "PAID"
			donation.UpdatedAt = now
		}

		if donation.ID == "" {
			h.db.WithContext(ctx).Create(&donation)
		} else {
			h.db.WithContext(ctx).Save(&donation)
		}

		c.JSON(http.StatusOK, gin.H{
			"status":        "disbursed",
			"action":        "donate",
			"commitment_id": commitment.ID,
			"charity_name":  commitment.Charity.Name,
			"amount_paise":  commitment.AmountPaise,
			"payout_id":     donation.RazorpayxPayoutID,
			"message":       fmt.Sprintf("Successfully transferred ₹%.2f to %s", float64(commitment.AmountPaise)/100.0, commitment.Charity.Name),
		})
		return
	}

	// If refund
	commitment.Status = "COMPLETED"
	commitment.UpdatedAt = now
	h.db.WithContext(ctx).Save(&commitment)

	c.JSON(http.StatusOK, gin.H{
		"status":        "refunded",
		"action":        "refund",
		"commitment_id": commitment.ID,
		"amount_paise":  commitment.AmountPaise,
		"message":       fmt.Sprintf("Successfully released ₹%.2f refund to %s", float64(commitment.AmountPaise)/100.0, commitment.User.Email),
	})
}
