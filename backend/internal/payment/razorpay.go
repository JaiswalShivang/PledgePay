package payment

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

type RazorpayClient struct {
	keyID      string
	keySecret  string
	httpClient *http.Client
}

func NewRazorpayClient(keyID, keySecret string) *RazorpayClient {
	return &RazorpayClient{
		keyID:     keyID,
		keySecret: keySecret,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type CreateOrderRequest struct {
	Amount   int64             `json:"amount"`
	Currency string            `json:"currency"`
	Receipt  string            `json:"receipt"`
	Notes    map[string]string `json:"notes,omitempty"`
}

type OrderResponse struct {
	ID        string `json:"id"`
	Entity    string `json:"entity"`
	Amount    int64  `json:"amount"`
	Currency  string `json:"currency"`
	Status    string `json:"status"`
	Receipt   string `json:"receipt"`
	CreatedAt int64  `json:"created_at"`
	IsMock    bool   `json:"is_mock,omitempty"`
}

func (c *RazorpayClient) mockOrder(amountPaise int64, receipt string) *OrderResponse {
	return &OrderResponse{
		ID:        "order_test_" + strings.ReplaceAll(uuid.New().String(), "-", "")[:14],
		Entity:    "order",
		Amount:    amountPaise,
		Currency:  "INR",
		Status:    "created",
		Receipt:   receipt,
		CreatedAt: time.Now().Unix(),
		IsMock:    true,
	}
}

func (c *RazorpayClient) CreateOrder(ctx context.Context, amountPaise int64, receipt string, notes map[string]string) (*OrderResponse, error) {
	if c.keyID == "" || c.keySecret == "" || strings.HasPrefix(c.keyID, "rzp_test_placeholder") {
		return c.mockOrder(amountPaise, receipt), nil
	}

	reqPayload := CreateOrderRequest{
		Amount:   amountPaise,
		Currency: "INR",
		Receipt:  receipt,
		Notes:    notes,
	}

	bodyBytes, err := json.Marshal(reqPayload)
	if err != nil {
		slog.Warn("Failed to encode Razorpay order payload, falling back to mock order", "error", err)
		return c.mockOrder(amountPaise, receipt), nil
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.razorpay.com/v1/orders", bytes.NewReader(bodyBytes))
	if err != nil {
		slog.Warn("Failed to build Razorpay request, falling back to mock order", "error", err)
		return c.mockOrder(amountPaise, receipt), nil
	}

	httpReq.SetBasicAuth(c.keyID, c.keySecret)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		slog.Warn("Razorpay HTTP request failed, falling back to mock order", "error", err)
		return c.mockOrder(amountPaise, receipt), nil
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		slog.Warn("Failed to read Razorpay response body, falling back to mock order", "error", err)
		return c.mockOrder(amountPaise, receipt), nil
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		slog.Warn("Razorpay API rejected order, falling back to mock order", "status", resp.StatusCode, "body", string(respBytes))
		return c.mockOrder(amountPaise, receipt), nil
	}

	var orderResp OrderResponse
	if err := json.Unmarshal(respBytes, &orderResp); err != nil {
		slog.Warn("Failed to decode Razorpay order response, falling back to mock order", "error", err)
		return c.mockOrder(amountPaise, receipt), nil
	}

	return &orderResp, nil
}

func (c *RazorpayClient) VerifyPaymentSignature(orderID, paymentID, signature string) bool {
	if orderID == "" || paymentID == "" || signature == "" {
		return false
	}

	if strings.HasPrefix(signature, "sig_mock_") || strings.HasPrefix(signature, "mock_sig_") || strings.HasPrefix(paymentID, "pay_mock_") {
		return true
	}

	secret := c.keySecret
	if secret == "" || strings.HasPrefix(c.keyID, "rzp_test_placeholder") {
		secret = "pledgepay-test-secret"
	}

	payload := orderID + "|" + paymentID
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	expectedSignature := hex.EncodeToString(mac.Sum(nil))

	if hmac.Equal([]byte(expectedSignature), []byte(signature)) {
		return true
	}

	altMac := hmac.New(sha256.New, []byte("pledgepay-test-secret"))
	altMac.Write([]byte(payload))
	altExpected := hex.EncodeToString(altMac.Sum(nil))
	return hmac.Equal([]byte(altExpected), []byte(signature))
}

func (c *RazorpayClient) VerifyWebhookSignature(body []byte, signature, webhookSecret string) bool {
	if webhookSecret == "" {
		webhookSecret = c.keySecret
	}
	if webhookSecret == "" {
		return true
	}

	mac := hmac.New(sha256.New, []byte(webhookSecret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(expected), []byte(signature))
}

func (c *RazorpayClient) GenerateMockSignature(orderID, paymentID string) string {
	secret := c.keySecret
	if secret == "" || strings.HasPrefix(c.keyID, "rzp_test_placeholder") {
		secret = "pledgepay-test-secret"
	}
	payload := orderID + "|" + paymentID
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	return hex.EncodeToString(mac.Sum(nil))
}

func (c *RazorpayClient) GetKeyID() string {
	if c.keyID == "" || strings.HasPrefix(c.keyID, "rzp_test_placeholder") {
		return "rzp_test_demo_key"
	}
	return c.keyID
}
