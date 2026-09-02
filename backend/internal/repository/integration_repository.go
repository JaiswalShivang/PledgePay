package repository

import (
	"context"

	"github.com/jaiswalshivang/pledgepay/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type IntegrationRepository interface {
	Upsert(ctx context.Context, integration *models.Integration) error
	GetByUserIDAndProvider(ctx context.Context, userID string, provider string) (*models.Integration, error)
	ListByUserID(ctx context.Context, userID string) ([]models.Integration, error)
	Delete(ctx context.Context, userID string, provider string) error
}

type integrationRepository struct {
	db *gorm.DB
}

func NewIntegrationRepository(db *gorm.DB) IntegrationRepository {
	return &integrationRepository{db: db}
}

func (r *integrationRepository) Upsert(ctx context.Context, integration *models.Integration) error {
	return r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "user_id"}, {Name: "provider"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"access_token_enc",
			"refresh_token_enc",
			"external_username",
			"connected_at",
		}),
	}).Create(integration).Error
}

func (r *integrationRepository) GetByUserIDAndProvider(ctx context.Context, userID string, provider string) (*models.Integration, error) {
	var integration models.Integration
	if err := r.db.WithContext(ctx).
		Where("user_id = ? AND provider = ?", userID, provider).
		First(&integration).Error; err != nil {
		return nil, err
	}
	return &integration, nil
}

func (r *integrationRepository) ListByUserID(ctx context.Context, userID string) ([]models.Integration, error) {
	var integrations []models.Integration
	if err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Find(&integrations).Error; err != nil {
		return nil, err
	}
	return integrations, nil
}

func (r *integrationRepository) Delete(ctx context.Context, userID string, provider string) error {
	return r.db.WithContext(ctx).
		Where("user_id = ? AND provider = ?", userID, provider).
		Delete(&models.Integration{}).Error
}
