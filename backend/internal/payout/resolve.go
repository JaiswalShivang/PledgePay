package payout

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/jaiswalshivang/pledgepay/internal/models"
	"github.com/jaiswalshivang/pledgepay/internal/repository"
	"github.com/jaiswalshivang/pledgepay/internal/rules"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ResolutionResult struct {
	Commitment   *models.Commitment         `json:"commitment"`
	Donation     *models.Donation           `json:"donation,omitempty"`
	Progress     *rules.ProgressCalculation `json:"progress"`
	Verification *models.VerificationResult `json:"verification,omitempty"`
	IsResolved   bool                       `json:"is_resolved"`
	State        string                     `json:"state"`
}

type Resolver struct {
	db               *gorm.DB
	payoutClient     *RazorpayXClient
	commitmentRepo   repository.CommitmentRepository
	charityRepo      repository.CharityRepository
	donationRepo     repository.DonationRepository
	evidenceRepo     repository.EvidenceRepository
	verificationRepo repository.VerificationRepository
	mu               sync.Mutex
}

func NewResolver(
	db *gorm.DB,
	payoutClient *RazorpayXClient,
	commitmentRepo repository.CommitmentRepository,
	charityRepo repository.CharityRepository,
	donationRepo repository.DonationRepository,
	evidenceRepo repository.EvidenceRepository,
	verificationRepo repository.VerificationRepository,
) *Resolver {
	return &Resolver{
		db:               db,
		payoutClient:     payoutClient,
		commitmentRepo:   commitmentRepo,
		charityRepo:      charityRepo,
		donationRepo:     donationRepo,
		evidenceRepo:     evidenceRepo,
		verificationRepo: verificationRepo,
	}
}

func (r *Resolver) ResolveCommitment(ctx context.Context, commitmentID string) (*ResolutionResult, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now().UTC()

	var commitment models.Commitment
	err := r.db.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Preload("Charity").
		Where("id = ?", commitmentID).
		First(&commitment).Error
	if err != nil {
		return nil, fmt.Errorf("commitment not found or lock failed: %w", err)
	}

	evidenceList, err := r.evidenceRepo.ListByCommitmentID(ctx, commitmentID)
	if err != nil {
		return nil, fmt.Errorf("failed to load evidence: %w", err)
	}

	progress := rules.CalculateProgress(&commitment, evidenceList, now)
	latestVerification, _ := r.verificationRepo.GetLatestByCommitmentID(ctx, commitmentID)

	var existingDonation models.Donation
	dErr := r.db.WithContext(ctx).
		Preload("Charity").
		Where("commitment_id = ?", commitmentID).
		First(&existingDonation).Error
	if dErr == nil {
		state := "DONATED"
		if existingDonation.Status == "PENDING" {
			state = "DONATION_PENDING"
		}
		return &ResolutionResult{
			Commitment:   &commitment,
			Donation:     &existingDonation,
			Progress:     &progress,
			Verification: latestVerification,
			IsResolved:   true,
			State:        state,
		}, nil
	}

	isCompleted := progress.ProgressPct >= 100.0 && (latestVerification == nil || !latestVerification.AnomalyFlag)
	isExpired := now.After(commitment.EndDate)

	if !isCompleted && !isExpired && commitment.Status == "ACTIVE" {
		return &ResolutionResult{
			Commitment:   &commitment,
			Donation:     nil,
			Progress:     &progress,
			Verification: latestVerification,
			IsResolved:   false,
			State:        "ACTIVE",
		}, nil
	}

	outcome := "SUCCESS"
	if isCompleted {
		commitment.Status = "COMPLETED"
	} else {
		outcome = "FAILURE"
		commitment.Status = "FAILED"
	}
	commitment.UpdatedAt = now

	if err := r.db.WithContext(ctx).Save(&commitment).Error; err != nil {
		return nil, fmt.Errorf("failed to update commitment status: %w", err)
	}

	if commitment.CharityID == nil {
		return nil, errors.New("cannot resolve donation: charity_id is missing")
	}

	fundAccountID := "fa_test_fund_account_default"
	if commitment.Charity != nil && commitment.Charity.RazorpayxFundAccountID != nil && *commitment.Charity.RazorpayxFundAccountID != "" {
		fundAccountID = *commitment.Charity.RazorpayxFundAccountID
	}

	donation := models.Donation{
		CommitmentID: commitment.ID,
		CharityID:    *commitment.CharityID,
		AmountPaise:  commitment.AmountPaise,
		Outcome:      outcome,
		Status:       "PENDING",
		CreatedAt:    now,
		UpdatedAt:    now,
		Charity:      commitment.Charity,
	}

	if err := r.donationRepo.Create(ctx, &donation); err != nil {
		return nil, fmt.Errorf("failed to record pending donation: %w", err)
	}

	refID := fmt.Sprintf("don_%s", commitment.ID[:8])
	purpose := fmt.Sprintf("PledgePay Escrow Donation (%s)", outcome)
	notes := map[string]string{
		"commitment_id": commitment.ID,
		"outcome":       outcome,
		"target_count":  fmt.Sprintf("%d", commitment.TargetCount),
		"verified":      fmt.Sprintf("%d", progress.Verified),
	}

	payoutResp, pErr := r.payoutClient.CreatePayout(ctx, fundAccountID, commitment.AmountPaise, refID, purpose, notes)
	if pErr != nil {
		failMsg := pErr.Error()
		donation.Status = "FAILED"
		donation.FailureReason = &failMsg
		donation.UpdatedAt = time.Now().UTC()
		_ = r.donationRepo.Update(ctx, &donation)
		return &ResolutionResult{
			Commitment:   &commitment,
			Donation:     &donation,
			Progress:     &progress,
			Verification: latestVerification,
			IsResolved:   true,
			State:        "DONATION_PENDING",
		}, nil
	}

	donation.Status = "PAID"
	donation.RazorpayxPayoutID = &payoutResp.ID
	donation.UpdatedAt = time.Now().UTC()
	_ = r.donationRepo.Update(ctx, &donation)

	return &ResolutionResult{
		Commitment:   &commitment,
		Donation:     &donation,
		Progress:     &progress,
		Verification: latestVerification,
		IsResolved:   true,
		State:        "DONATED",
	}, nil
}

func (r *Resolver) GetStatus(ctx context.Context, commitmentID string) (*ResolutionResult, error) {
	now := time.Now().UTC()

	var commitment models.Commitment
	if err := r.db.WithContext(ctx).
		Preload("Charity").
		Where("id = ?", commitmentID).
		First(&commitment).Error; err != nil {
		return nil, err
	}

	evidenceList, err := r.evidenceRepo.ListByCommitmentID(ctx, commitmentID)
	if err != nil {
		return nil, err
	}

	progress := rules.CalculateProgress(&commitment, evidenceList, now)
	latestVerification, _ := r.verificationRepo.GetLatestByCommitmentID(ctx, commitmentID)

	donation, _ := r.donationRepo.GetByCommitmentID(ctx, commitmentID)

	state := commitment.Status
	if donation != nil {
		if donation.Status == "PAID" {
			state = "DONATED"
		} else {
			state = "DONATION_PENDING"
		}
	}

	return &ResolutionResult{
		Commitment:   &commitment,
		Donation:     donation,
		Progress:     &progress,
		Verification: latestVerification,
		IsResolved:   donation != nil || commitment.Status == "COMPLETED" || commitment.Status == "FAILED",
		State:        state,
	}, nil
}
