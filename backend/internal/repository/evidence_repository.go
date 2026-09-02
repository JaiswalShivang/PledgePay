package repository

import (
	"context"

	"github.com/jaiswalshivang/pledgepay/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type EvidenceRepository interface {
	CreateBatch(ctx context.Context, items []models.Evidence) error
	ListByCommitmentID(ctx context.Context, commitmentID string) ([]models.Evidence, error)
	CountByCommitmentID(ctx context.Context, commitmentID string) (int64, error)
}

type evidenceRepository struct {
	db *gorm.DB
}

func NewEvidenceRepository(db *gorm.DB) EvidenceRepository {
	return &evidenceRepository{db: db}
}

func (r *evidenceRepository) CreateBatch(ctx context.Context, items []models.Evidence) error {
	if len(items) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "commitment_id"},
			{Name: "source"},
			{Name: "source_ref"},
		},
		DoNothing: true,
	}).Create(&items).Error
}

func (r *evidenceRepository) ListByCommitmentID(ctx context.Context, commitmentID string) ([]models.Evidence, error) {
	var list []models.Evidence
	if err := r.db.WithContext(ctx).
		Where("commitment_id = ?", commitmentID).
		Order("occurred_at ASC").
		Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

func (r *evidenceRepository) CountByCommitmentID(ctx context.Context, commitmentID string) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).
		Model(&models.Evidence{}).
		Where("commitment_id = ?", commitmentID).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}
