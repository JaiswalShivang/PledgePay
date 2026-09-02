package repository

import (
	"context"

	"github.com/jaiswalshivang/pledgepay/internal/models"
	"gorm.io/gorm"
)

type PaymentRepository interface {
	CreatePayment(ctx context.Context, payment *models.Payment) error
	GetPaymentByID(ctx context.Context, id string) (*models.Payment, error)
	GetPaymentByOrderID(ctx context.Context, orderID string) (*models.Payment, error)
	UpdatePaymentStatus(ctx context.Context, id string, status string, paymentID *string, signature *string) error
	CreateRefund(ctx context.Context, refund *models.Refund) error
	GetRefundByID(ctx context.Context, id string) (*models.Refund, error)
	ListRefundsByPaymentID(ctx context.Context, paymentID string) ([]models.Refund, error)
}

type paymentRepository struct {
	db *gorm.DB
}

func NewPaymentRepository(db *gorm.DB) PaymentRepository {
	return &paymentRepository{db: db}
}

func (r *paymentRepository) CreatePayment(ctx context.Context, payment *models.Payment) error {
	return r.db.WithContext(ctx).Create(payment).Error
}

func (r *paymentRepository) GetPaymentByID(ctx context.Context, id string) (*models.Payment, error) {
	var payment models.Payment
	if err := r.db.WithContext(ctx).Preload("Refunds").First(&payment, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &payment, nil
}

func (r *paymentRepository) GetPaymentByOrderID(ctx context.Context, orderID string) (*models.Payment, error) {
	var payment models.Payment
	if err := r.db.WithContext(ctx).Preload("Refunds").First(&payment, "razorpay_order_id = ?", orderID).Error; err != nil {
		return nil, err
	}
	return &payment, nil
}

func (r *paymentRepository) UpdatePaymentStatus(ctx context.Context, id string, status string, paymentID *string, signature *string) error {
	updates := map[string]interface{}{
		"status": status,
	}
	if paymentID != nil {
		updates["razorpay_payment_id"] = *paymentID
	}
	if signature != nil {
		updates["razorpay_signature"] = *signature
	}
	return r.db.WithContext(ctx).Model(&models.Payment{}).Where("id = ?", id).Updates(updates).Error
}

func (r *paymentRepository) CreateRefund(ctx context.Context, refund *models.Refund) error {
	return r.db.WithContext(ctx).Create(refund).Error
}

func (r *paymentRepository) GetRefundByID(ctx context.Context, id string) (*models.Refund, error) {
	var refund models.Refund
	if err := r.db.WithContext(ctx).First(&refund, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &refund, nil
}

func (r *paymentRepository) ListRefundsByPaymentID(ctx context.Context, paymentID string) ([]models.Refund, error) {
	var refunds []models.Refund
	if err := r.db.WithContext(ctx).Where("payment_id = ?", paymentID).Find(&refunds).Error; err != nil {
		return nil, err
	}
	return refunds, nil
}
