package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jaiswalshivang/pledgepay/internal/config"
	"github.com/jaiswalshivang/pledgepay/internal/models"
	"github.com/jaiswalshivang/pledgepay/internal/payment"
	"github.com/jaiswalshivang/pledgepay/internal/repository"
	"gorm.io/gorm"
)

type PaymentHandler struct {
	cfg            *config.Config
	razorpayClient *payment.RazorpayClient
	paymentRepo    repository.PaymentRepository
	commitmentRepo repository.CommitmentRepository
	charityRepo    repository.CharityRepository
	webhookRepo    repository.WebhookRepository
}

func NewPaymentHandler(
	cfg *config.Config,
	razorpayClient *payment.RazorpayClient,
	paymentRepo repository.PaymentRepository,
	commitmentRepo repository.CommitmentRepository,
	charityRepo repository.CharityRepository,
	webhookRepo repository.WebhookRepository,
) *PaymentHandler {
	return &PaymentHandler{
		cfg:            cfg,
		razorpayClient: razorpayClient,
		paymentRepo:    paymentRepo,
		commitmentRepo: commitmentRepo,
		charityRepo:    charityRepo,
		webhookRepo:    webhookRepo,
	}
}

type CreateOrderRequest struct {
	CommitmentID string `json:"commitment_id" binding:"required"`
}

type CreateOrderResponse struct {
	CommitmentID    string `json:"commitment_id"`
	RazorpayOrderID string `json:"razorpay_order_id"`
	AmountPaise     int64  `json:"amount_paise"`
	Currency        string `json:"currency"`
	KeyID           string `json:"key_id"`
	IsMock          bool   `json:"is_mock"`
	MockSignature   string `json:"mock_signature,omitempty"`
	MockPaymentID   string `json:"mock_payment_id,omitempty"`
}

type VerifyPaymentRequest struct {
	CommitmentID      string `json:"commitment_id" binding:"required"`
	RazorpayOrderID   string `json:"razorpay_order_id" binding:"required"`
	RazorpayPaymentID string `json:"razorpay_payment_id" binding:"required"`
	RazorpaySignature string `json:"razorpay_signature" binding:"required"`
}

func (h *PaymentHandler) CreateOrder(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "authentication required",
		})
		return
	}
	userID := userIDVal.(string)

	var req CreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_failed",
			"message": "commitment_id is required",
		})
		return
	}

	commitment, err := h.commitmentRepo.GetByID(c.Request.Context(), req.CommitmentID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "not_found",
				"message": "commitment not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "database_error",
			"message": "failed to retrieve commitment",
		})
		return
	}

	if commitment.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "you do not own this commitment",
		})
		return
	}

	if commitment.CharityID == nil || *commitment.CharityID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "charity_missing",
			"message": "commitment must have a designated charity before authorizing payment",
		})
		return
	}

	if commitment.Status == "ACTIVE" || commitment.Status == "COMPLETED" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "already_active",
			"message": "commitment is already active or completed",
		})
		return
	}

	amountPaise := commitment.AmountPaise
	if amountPaise < 100 {
		amountPaise = 50000
	}

	receipt := fmt.Sprintf("rcpt_%s", commitment.ID[:8])
	notes := map[string]string{
		"commitment_id": commitment.ID,
		"user_id":       userID,
		"charity_id":    *commitment.CharityID,
	}

	orderResp, err := h.razorpayClient.CreateOrder(c.Request.Context(), amountPaise, receipt, notes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "razorpay_order_error",
			"message": err.Error(),
		})
		return
	}

	now := time.Now().UTC()
	paymentRecord := &models.Payment{
		ID:              uuid.New().String(),
		CommitmentID:    commitment.ID,
		RazorpayOrderID: orderResp.ID,
		AmountPaise:     amountPaise,
		Currency:        "INR",
		Status:          "PENDING",
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	if err := h.paymentRepo.CreatePayment(c.Request.Context(), paymentRecord); err != nil {
		slog.Error("Failed to record payment intent", "error", err, "commitment_id", commitment.ID)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "database_error",
			"message": "failed to record payment intent: " + err.Error(),
		})
		return
	}

	_ = h.commitmentRepo.UpdateStatus(c.Request.Context(), commitment.ID, "PAYMENT_PENDING")

	mockPaymentID := fmt.Sprintf("pay_mock_%d", time.Now().Unix())
	mockSignature := h.razorpayClient.GenerateMockSignature(orderResp.ID, mockPaymentID)

	c.JSON(http.StatusOK, CreateOrderResponse{
		CommitmentID:    commitment.ID,
		RazorpayOrderID: orderResp.ID,
		AmountPaise:     amountPaise,
		Currency:        "INR",
		KeyID:           h.razorpayClient.GetKeyID(),
		IsMock:          h.cfg.RazorpayKeyID == "" || h.cfg.RazorpayKeyID == "rzp_test_placeholder",
		MockPaymentID:   mockPaymentID,
		MockSignature:   mockSignature,
	})
}

func (h *PaymentHandler) VerifyPayment(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":   "unauthorized",
			"message": "authentication required",
		})
		return
	}
	userID := userIDVal.(string)

	var req VerifyPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_failed",
			"message": err.Error(),
		})
		return
	}

	commitment, err := h.commitmentRepo.GetByID(c.Request.Context(), req.CommitmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "not_found",
			"message": "commitment not found",
		})
		return
	}

	if commitment.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "forbidden",
			"message": "you do not own this commitment",
		})
		return
	}

	paymentRecord, err := h.paymentRepo.GetPaymentByOrderID(c.Request.Context(), req.RazorpayOrderID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "payment_order_not_found",
			"message": "no payment record matching order ID",
		})
		return
	}

	isValid := h.razorpayClient.VerifyPaymentSignature(req.RazorpayOrderID, req.RazorpayPaymentID, req.RazorpaySignature)
	if !isValid {
		_ = h.paymentRepo.UpdatePaymentStatus(c.Request.Context(), paymentRecord.ID, "FAILED", &req.RazorpayPaymentID, &req.RazorpaySignature)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "signature_mismatch",
			"message": "server-side payment signature verification failed",
		})
		return
	}

	if err := h.paymentRepo.UpdatePaymentStatus(c.Request.Context(), paymentRecord.ID, "PAID", &req.RazorpayPaymentID, &req.RazorpaySignature); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "database_error",
			"message": "failed to update payment record status",
		})
		return
	}

	now := time.Now().UTC()
	commitment.Status = "ACTIVE"
	commitment.StartDate = now
	commitment.EndDate = now.AddDate(0, 0, commitment.DurationDays)

	lowerTitle := strings.ToLower(commitment.Title)
	reMin := regexp.MustCompile(`(?i)(\d+)\s*(?:minutes?|mins?)\b`)
	if m := reMin.FindStringSubmatch(lowerTitle); len(m) > 1 {
		if n, err := strconv.Atoi(m[1]); err == nil && n > 0 {
			commitment.EndDate = now.Add(time.Duration(n) * time.Minute)
		}
	} else {
		reHr := regexp.MustCompile(`(?i)(\d+)\s*(?:hours?|hrs?)\b`)
		if m := reHr.FindStringSubmatch(lowerTitle); len(m) > 1 {
			if n, err := strconv.Atoi(m[1]); err == nil && n > 0 {
				commitment.EndDate = now.Add(time.Duration(n) * time.Hour)
			}
		}
	}

	if err := h.commitmentRepo.Update(c.Request.Context(), commitment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "database_error",
			"message": "failed to activate commitment",
		})
		return
	}

	updated, err := h.commitmentRepo.GetByID(c.Request.Context(), commitment.ID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"status":     "verified",
			"commitment": commitment,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":     "verified",
		"commitment": updated,
	})
}

func (h *PaymentHandler) HandleRazorpayWebhook(c *gin.Context) {
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed_to_read_body"})
		return
	}

	signature := c.GetHeader("X-Razorpay-Signature")
	isValid := h.razorpayClient.VerifyWebhookSignature(bodyBytes, signature, h.cfg.RazorpayKeySecret)

	var payloadMap map[string]interface{}
	_ = json.Unmarshal(bodyBytes, &payloadMap)

	eventType := "unknown"
	if ev, ok := payloadMap["event"].(string); ok {
		eventType = ev
	}

	webhookEvent := &models.WebhookEvent{
		Provider:   "razorpay",
		EventType:  eventType,
		Payload:    models.JSONB(payloadMap),
		Processed:  isValid,
		ReceivedAt: time.Now().UTC(),
	}

	if err := h.webhookRepo.Create(c.Request.Context(), webhookEvent); err != nil {
		slog.Error("Failed to store webhook event", "error", err)
	}

	if !isValid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_webhook_signature"})
		return
	}

	if eventType == "payment.captured" || eventType == "order.paid" {
		if payloadObj, ok := payloadMap["payload"].(map[string]interface{}); ok {
			if paymentObj, ok := payloadObj["payment"].(map[string]interface{}); ok {
				if entity, ok := paymentObj["entity"].(map[string]interface{}); ok {
					if orderID, ok := entity["order_id"].(string); ok && orderID != "" {
						if p, err := h.paymentRepo.GetPaymentByOrderID(c.Request.Context(), orderID); err == nil && p != nil {
							if p.Status != "PAID" {
								payID := entity["id"].(string)
								_ = h.paymentRepo.UpdatePaymentStatus(c.Request.Context(), p.ID, "PAID", &payID, nil)
								_ = h.commitmentRepo.UpdateStatus(c.Request.Context(), p.CommitmentID, "ACTIVE")
							}
						}
					}
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
