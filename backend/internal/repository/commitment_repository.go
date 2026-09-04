package repository

import (
	"context"
	"time"

	"github.com/jaiswalshivang/pledgepay/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type CommitmentRepository interface {
	Create(ctx context.Context, commitment *models.Commitment) error
	GetByID(ctx context.Context, id string) (*models.Commitment, error)
	GetByIDForUpdate(ctx context.Context, tx *gorm.DB, id string) (*models.Commitment, error)
	ListByUserID(ctx context.Context, userID string) ([]models.Commitment, error)
	ListActiveCommitments(ctx context.Context) ([]models.Commitment, error)
	Update(ctx context.Context, commitment *models.Commitment) error
	UpdateStatus(ctx context.Context, id string, status string) error
	AddRule(ctx context.Context, rule *models.CommitmentRule) error
	GetRules(ctx context.Context, commitmentID string) ([]models.CommitmentRule, error)
}

type commitmentRepository struct {
	db *gorm.DB
}

func NewCommitmentRepository(db *gorm.DB) CommitmentRepository {
	return &commitmentRepository{db: db}
}

func (r *commitmentRepository) Create(ctx context.Context, commitment *models.Commitment) error {
	return r.db.WithContext(ctx).Create(commitment).Error
}

func (r *commitmentRepository) GetByID(ctx context.Context, id string) (*models.Commitment, error) {
	var commitment models.Commitment
	if err := r.db.WithContext(ctx).
		Preload("Charity").
		Preload("Rules").
		Preload("Payment").
		Preload("Donation").
		First(&commitment, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &commitment, nil
}

func (r *commitmentRepository) GetByIDForUpdate(ctx context.Context, tx *gorm.DB, id string) (*models.Commitment, error) {
	db := r.db
	if tx != nil {
		db = tx
	}
	var commitment models.Commitment
	if err := db.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		First(&commitment, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &commitment, nil
}

func (r *commitmentRepository) ListByUserID(ctx context.Context, userID string) ([]models.Commitment, error) {
	var commitments []models.Commitment
	if err := r.db.WithContext(ctx).
		Preload("Charity").
		Preload("Rules").
		Preload("Payment").
		Preload("Donation").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&commitments).Error; err != nil {
		return nil, err
	}
	return commitments, nil
}

func (r *commitmentRepository) ListActiveCommitments(ctx context.Context) ([]models.Commitment, error) {
	var commitments []models.Commitment
	if err := r.db.WithContext(ctx).
		Preload("Charity").
		Preload("Rules").
		Preload("Payment").
		Preload("Donation").
		Where("status = ? AND end_date >= ?", "ACTIVE", time.Now().UTC()).
		Find(&commitments).Error; err != nil {
		return nil, err
	}
	return commitments, nil
}

func (r *commitmentRepository) Update(ctx context.Context, commitment *models.Commitment) error {
	return r.db.WithContext(ctx).Save(commitment).Error
}

func (r *commitmentRepository) UpdateStatus(ctx context.Context, id string, status string) error {
	return r.db.WithContext(ctx).Model(&models.Commitment{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":     status,
			"updated_at": time.Now().UTC(),
		}).Error
}

func (r *commitmentRepository) AddRule(ctx context.Context, rule *models.CommitmentRule) error {
	return r.db.WithContext(ctx).Create(rule).Error
}

func (r *commitmentRepository) GetRules(ctx context.Context, commitmentID string) ([]models.CommitmentRule, error) {
	var rules []models.CommitmentRule
	if err := r.db.WithContext(ctx).
		Where("commitment_id = ?", commitmentID).
		Find(&rules).Error; err != nil {
		return nil, err
	}
	return rules, nil
}
