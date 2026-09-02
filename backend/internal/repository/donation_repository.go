package repository

import (
	"context"

	"github.com/jaiswalshivang/pledgepay/internal/models"
	"gorm.io/gorm"
)

type DonationRepository interface {
	Create(ctx context.Context, donation *models.Donation) error
	GetByCommitmentID(ctx context.Context, commitmentID string) (*models.Donation, error)
	Update(ctx context.Context, donation *models.Donation) error
	ListByCharityID(ctx context.Context, charityID string) ([]models.Donation, error)
}

type donationRepository struct {
	db *gorm.DB
}

func NewDonationRepository(db *gorm.DB) DonationRepository {
	return &donationRepository{db: db}
}

func (r *donationRepository) Create(ctx context.Context, donation *models.Donation) error {
	return r.db.WithContext(ctx).Create(donation).Error
}

func (r *donationRepository) GetByCommitmentID(ctx context.Context, commitmentID string) (*models.Donation, error) {
	var donation models.Donation
	if err := r.db.WithContext(ctx).
		Preload("Charity").
		Where("commitment_id = ?", commitmentID).
		First(&donation).Error; err != nil {
		return nil, err
	}
	return &donation, nil
}

func (r *donationRepository) Update(ctx context.Context, donation *models.Donation) error {
	return r.db.WithContext(ctx).Save(donation).Error
}

func (r *donationRepository) ListByCharityID(ctx context.Context, charityID string) ([]models.Donation, error) {
	var list []models.Donation
	if err := r.db.WithContext(ctx).
		Where("charity_id = ?", charityID).
		Order("created_at DESC").
		Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}
