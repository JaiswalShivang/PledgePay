package payout

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
)

type RazorpayXClient struct {
	keyID     string
	keySecret string
	client    *http.Client
	isMock    bool
}

type PayoutRequest struct {
	AccountNumber   string            `json:"account_number,omitempty"`
	FundAccountID   string            `json:"fund_account_id"`
	Amount          int64             `json:"amount"`
	Currency        string            `json:"currency"`
	Mode            string            `json:"mode"`
	Purpose         string            `json:"purpose"`
	QueueIfLowBal   bool              `json:"queue_if_low_balance"`
	ReferenceID     string            `json:"reference_id"`
	Narration       string            `json:"narration"`
	Notes           map[string]string `json:"notes,omitempty"`
}

type PayoutResponse struct {
	ID            string            `json:"id"`
	Entity        string            `json:"entity"`
	FundAccountID string            `json:"fund_account_id"`
	Amount        int64             `json:"amount"`
	Currency      string            `json:"currency"`
	Status        string            `json:"status"`
	Purpose       string            `json:"purpose"`
	UTRN          string            `json:"utr"`
	Mode          string            `json:"mode"`
	ReferenceID   string            `json:"reference_id"`
	CreatedAt     int64             `json:"created_at"`
	Notes         map[string]string `json:"notes,omitempty"`
}

func NewRazorpayXClient(keyID, keySecret string, mockPayouts bool) *RazorpayXClient {
	isMock := mockPayouts || keyID == "" || keySecret == "" || keyID == "rzp_test_mock_key_id"
	return &RazorpayXClient{
		keyID:     keyID,
		keySecret: keySecret,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
		isMock: isMock,
	}
}

func (c *RazorpayXClient) CreatePayout(ctx context.Context, fundAccountID string, amountPaise int64, referenceID, purpose string, notes map[string]string) (*PayoutResponse, error) {
	if c.isMock {
		payoutID := fmt.Sprintf("pout_test_%s", uuid.New().String()[:12])
		return &PayoutResponse{
			ID:            payoutID,
			Entity:        "payout",
			FundAccountID: fundAccountID,
			Amount:        amountPaise,
			Currency:      "INR",
			Status:        "processed",
			Purpose:       purpose,
			UTRN:          fmt.Sprintf("UTR_%s", uuid.New().String()[:8]),
			Mode:          "UPI",
			ReferenceID:   referenceID,
			CreatedAt:     time.Now().Unix(),
			Notes:         notes,
		}, nil
	}

	reqBody := PayoutRequest{
		FundAccountID: fundAccountID,
		Amount:        amountPaise,
		Currency:      "INR",
		Mode:          "UPI",
		Purpose:       purpose,
		QueueIfLowBal: true,
		ReferenceID:   referenceID,
		Narration:     "PledgePay Escrow Resolution",
		Notes:         notes,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payout payload: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.razorpay.com/v1/payouts", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create payout request: %w", err)
	}

	httpReq.SetBasicAuth(c.keyID, c.keySecret)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("payout api request failed: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read payout response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("razorpayx payout rejected with status %d: %s", resp.StatusCode, string(respBytes))
	}

	var payoutResp PayoutResponse
	if err := json.Unmarshal(respBytes, &payoutResp); err != nil {
		return nil, fmt.Errorf("failed to decode payout response: %w", err)
	}

	return &payoutResp, nil
}
