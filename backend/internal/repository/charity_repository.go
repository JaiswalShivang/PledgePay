package repository

import (
	"context"

	"github.com/jaiswalshivang/pledgepay/internal/models"
	"gorm.io/gorm"
)

type CharityRepository interface {
	Create(ctx context.Context, charity *models.Charity) error
	ListActive(ctx context.Context) ([]models.Charity, error)
	GetByID(ctx context.Context, id string) (*models.Charity, error)
	GetByIDs(ctx context.Context, ids []string) ([]models.Charity, error)
}

type charityRepository struct {
	db *gorm.DB
}

func NewCharityRepository(db *gorm.DB) CharityRepository {
	return &charityRepository{db: db}
}

func (r *charityRepository) Create(ctx context.Context, charity *models.Charity) error {
	return r.db.WithContext(ctx).Create(charity).Error
}

func (r *charityRepository) ListActive(ctx context.Context) ([]models.Charity, error) {
	var charities []models.Charity
	if err := r.db.WithContext(ctx).
		Where("is_active = ?", true).
		Order("category ASC, name ASC").
		Find(&charities).Error; err != nil {
		return nil, err
	}
	return charities, nil
}

func (r *charityRepository) GetByID(ctx context.Context, id string) (*models.Charity, error) {
	var charity models.Charity
	if err := r.db.WithContext(ctx).First(&charity, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &charity, nil
}

func (r *charityRepository) GetByIDs(ctx context.Context, ids []string) ([]models.Charity, error) {
	if len(ids) == 0 {
		return []models.Charity{}, nil
	}
	var charities []models.Charity
	if err := r.db.WithContext(ctx).Where("id IN (?) AND is_active = ?", ids, true).Find(&charities).Error; err != nil {
		return nil, err
	}
	return charities, nil
}
