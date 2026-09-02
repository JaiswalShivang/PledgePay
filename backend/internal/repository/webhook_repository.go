package repository

import (
	"context"

	"github.com/jaiswalshivang/pledgepay/internal/models"
	"gorm.io/gorm"
)

type WebhookRepository interface {
	Create(ctx context.Context, event *models.WebhookEvent) error
	GetByID(ctx context.Context, id string) (*models.WebhookEvent, error)
	MarkProcessed(ctx context.Context, id string) error
	ListUnprocessed(ctx context.Context, limit int) ([]models.WebhookEvent, error)
}

type webhookRepository struct {
	db *gorm.DB
}

func NewWebhookRepository(db *gorm.DB) WebhookRepository {
	return &webhookRepository{db: db}
}

func (r *webhookRepository) Create(ctx context.Context, event *models.WebhookEvent) error {
	return r.db.WithContext(ctx).Create(event).Error
}

func (r *webhookRepository) GetByID(ctx context.Context, id string) (*models.WebhookEvent, error) {
	var event models.WebhookEvent
	if err := r.db.WithContext(ctx).First(&event, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &event, nil
}

func (r *webhookRepository) MarkProcessed(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Model(&models.WebhookEvent{}).
		Where("id = ?", id).
		Update("processed", true).Error
}

func (r *webhookRepository) ListUnprocessed(ctx context.Context, limit int) ([]models.WebhookEvent, error) {
	var events []models.WebhookEvent
	if err := r.db.WithContext(ctx).
		Where("processed = ?", false).
		Order("received_at ASC").
		Limit(limit).
		Find(&events).Error; err != nil {
		return nil, err
	}
	return events, nil
}
