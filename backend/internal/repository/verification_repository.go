package repository

import (
	"context"

	"github.com/jaiswalshivang/pledgepay/internal/models"
	"gorm.io/gorm"
)

type VerificationRepository interface {
	Create(ctx context.Context, result *models.VerificationResult) error
	GetLatestByCommitmentID(ctx context.Context, commitmentID string) (*models.VerificationResult, error)
	ListByCommitmentID(ctx context.Context, commitmentID string) ([]models.VerificationResult, error)
}

type verificationRepository struct {
	db *gorm.DB
}

func NewVerificationRepository(db *gorm.DB) VerificationRepository {
	return &verificationRepository{db: db}
}

func (r *verificationRepository) Create(ctx context.Context, result *models.VerificationResult) error {
	return r.db.WithContext(ctx).Create(result).Error
}

func (r *verificationRepository) GetLatestByCommitmentID(ctx context.Context, commitmentID string) (*models.VerificationResult, error) {
	var result models.VerificationResult
	if err := r.db.WithContext(ctx).
		Where("commitment_id = ?", commitmentID).
		Order("created_at DESC").
		First(&result).Error; err != nil {
		return nil, err
	}
	return &result, nil
}

func (r *verificationRepository) ListByCommitmentID(ctx context.Context, commitmentID string) ([]models.VerificationResult, error) {
	var list []models.VerificationResult
	if err := r.db.WithContext(ctx).
		Where("commitment_id = ?", commitmentID).
		Order("created_at DESC").
		Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}
