package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

type JSONB map[string]interface{}

func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, j)
}

type User struct {
	ID             string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Email          string    `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	PasswordHash   string    `gorm:"type:varchar(255);not null" json:"-"`
	Name           string    `gorm:"type:varchar(255);not null" json:"name"`
	GithubUsername *string   `gorm:"type:varchar(255)" json:"github_username"`
	CreatedAt      time.Time `gorm:"default:now()" json:"created_at"`
	UpdatedAt      time.Time `gorm:"default:now()" json:"updated_at"`

	Integrations []Integration `gorm:"foreignKey:UserID" json:"integrations,omitempty"`
	Commitments  []Commitment  `gorm:"foreignKey:UserID" json:"commitments,omitempty"`
}

type Charity struct {
	ID                    string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name                  string    `gorm:"type:varchar(255);not null" json:"name"`
	Category              string    `gorm:"type:varchar(100);not null" json:"category"`
	Description           string    `gorm:"type:text;not null" json:"description"`
	LogoURL               *string   `gorm:"type:varchar(500)" json:"logo_url"`
	WebsiteURL            *string   `gorm:"type:varchar(500);default:'https://giveindia.org'" json:"website_url"`
	RazorpayxContactID    *string   `gorm:"type:varchar(255);default:'cont_test_charity'" json:"razorpayx_contact_id"`
	RazorpayxFundAccountID *string  `gorm:"type:varchar(255)" json:"razorpayx_fund_account_id"`
	IsActive              bool      `gorm:"default:true;not null" json:"is_active"`
	CreatedAt             time.Time `gorm:"default:now()" json:"created_at"`
	UpdatedAt             time.Time `gorm:"default:now()" json:"updated_at"`
}

type Commitment struct {
	ID           string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID       string    `gorm:"type:uuid;not null;index" json:"user_id"`
	CharityID    *string   `gorm:"type:uuid;index" json:"charity_id"`
	GithubRepo   *string   `gorm:"type:varchar(255);index" json:"github_repo"`
	Title        string    `gorm:"type:varchar(255);not null" json:"title"`
	Description  *string   `gorm:"type:text" json:"description"`
	TargetCount  int       `gorm:"not null" json:"target_count"`
	Unit         string    `gorm:"type:varchar(50);not null" json:"unit"`
	DurationDays int       `gorm:"not null" json:"duration_days"`
	StartDate    time.Time `gorm:"not null" json:"start_date"`
	EndDate      time.Time `gorm:"not null" json:"end_date"`
	EvidenceType string    `gorm:"type:varchar(100);not null" json:"evidence_type"`
	AmountPaise  int64     `gorm:"not null" json:"amount_paise"`
	Status       string    `gorm:"type:varchar(50);not null;default:'DRAFT';index" json:"status"`
	QualityScore *float64  `json:"quality_score"`
	CreatedAt    time.Time `gorm:"default:now()" json:"created_at"`
	UpdatedAt    time.Time `gorm:"default:now()" json:"updated_at"`

	User     *User            `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Charity  *Charity         `gorm:"foreignKey:CharityID" json:"charity,omitempty"`
	Rules    []CommitmentRule `gorm:"foreignKey:CommitmentID" json:"rules,omitempty"`
	Payment  *Payment         `gorm:"foreignKey:CommitmentID" json:"payment,omitempty"`
	Donation *Donation        `gorm:"foreignKey:CommitmentID" json:"donation,omitempty"`
}

type CommitmentRule struct {
	ID           string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CommitmentID string    `gorm:"type:uuid;not null;index" json:"commitment_id"`
	RuleType     string    `gorm:"type:varchar(100);not null" json:"rule_type"`
	RuleConfig   JSONB     `gorm:"type:jsonb;not null" json:"rule_config"`
	CreatedAt    time.Time `gorm:"default:now()" json:"created_at"`
}

type Integration struct {
	ID               string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID           string    `gorm:"type:uuid;not null;index" json:"user_id"`
	Provider         string    `gorm:"type:varchar(50);not null" json:"provider"`
	AccessTokenEnc   string    `gorm:"type:text;not null" json:"-"`
	ExternalUsername *string   `gorm:"type:varchar(255)" json:"external_username"`
	ConnectedAt      time.Time `gorm:"default:now()" json:"connected_at"`
}

type Evidence struct {
	ID           string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CommitmentID string    `gorm:"type:uuid;not null;index" json:"commitment_id"`
	Source       string    `gorm:"type:varchar(50);not null" json:"source"`
	SourceRef    string    `gorm:"type:varchar(255);not null" json:"source_ref"`
	RawPayload   JSONB     `gorm:"type:jsonb;not null" json:"raw_payload"`
	OccurredAt   time.Time `gorm:"not null" json:"occurred_at"`
	IngestedAt   time.Time `gorm:"default:now()" json:"ingested_at"`
}

type VerificationResult struct {
	ID            string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CommitmentID  string    `gorm:"type:uuid;not null;index" json:"commitment_id"`
	EvidenceCount int       `gorm:"not null" json:"evidence_count"`
	VerifiedCount int       `gorm:"not null" json:"verified_count"`
	ProgressPct   float64   `gorm:"type:numeric(5,2);not null" json:"progress_pct"`
	AnomalyFlag   bool      `gorm:"default:false;not null" json:"anomaly_flag"`
	AnomalyReason *string   `gorm:"type:text" json:"anomaly_reason"`
	AIConfidence  *float64  `gorm:"type:numeric(5,2)" json:"ai_confidence"`
	AISummary     JSONB     `gorm:"type:jsonb" json:"ai_summary"`
	CreatedAt     time.Time `gorm:"default:now()" json:"created_at"`
}

type Payment struct {
	ID                string     `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CommitmentID      string     `gorm:"type:uuid;not null;uniqueIndex" json:"commitment_id"`
	RazorpayOrderID   string     `gorm:"type:varchar(255);uniqueIndex;not null" json:"razorpay_order_id"`
	RazorpayPaymentID *string    `gorm:"type:varchar(255);index" json:"razorpay_payment_id"`
	AmountPaise       int64      `gorm:"not null" json:"amount_paise"`
	Currency          string     `gorm:"type:varchar(10);default:'INR';not null" json:"currency"`
	Status            string     `gorm:"type:varchar(50);not null;default:'PENDING';index" json:"status"`
	CreatedAt         time.Time  `gorm:"default:now()" json:"created_at"`
	UpdatedAt         time.Time  `gorm:"default:now()" json:"updated_at"`

	Refunds           []Refund   `gorm:"foreignKey:PaymentID" json:"refunds,omitempty"`
}

type Refund struct {
	ID               string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	PaymentID        string    `gorm:"type:uuid;not null;index" json:"payment_id"`
	RazorpayRefundID string    `gorm:"type:varchar(255);uniqueIndex;not null" json:"razorpay_refund_id"`
	AmountPaise      int64     `gorm:"not null" json:"amount_paise"`
	Status           string    `gorm:"type:varchar(50);not null;default:'PENDING';index" json:"status"`
	CreatedAt        time.Time `gorm:"default:now()" json:"created_at"`
}

type Donation struct {
	ID                string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CommitmentID      string    `gorm:"type:uuid;not null;uniqueIndex" json:"commitment_id"`
	CharityID         string    `gorm:"type:uuid;not null;index" json:"charity_id"`
	AmountPaise       int64     `gorm:"not null" json:"amount_paise"`
	Outcome           string    `gorm:"type:varchar(50);not null" json:"outcome"`
	Status            string    `gorm:"type:varchar(50);not null;default:'PENDING';index" json:"status"`
	RazorpayxPayoutID *string   `gorm:"type:varchar(255)" json:"razorpayx_payout_id"`
	FailureReason     *string   `gorm:"type:text" json:"failure_reason"`
	CreatedAt         time.Time `gorm:"default:now()" json:"created_at"`
	UpdatedAt         time.Time `gorm:"default:now()" json:"updated_at"`

	Charity           *Charity  `gorm:"foreignKey:CharityID" json:"charity,omitempty"`
}

type WebhookEvent struct {
	ID             string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Provider       string    `gorm:"type:varchar(50);not null" json:"provider"`
	EventID        string    `gorm:"type:varchar(255);not null;uniqueIndex:uq_provider_event_id"`
	EventType      string    `gorm:"type:varchar(100);not null" json:"event_type"`
	Payload        JSONB     `gorm:"type:jsonb;not null" json:"payload"`
	Processed      bool      `gorm:"default:false;not null" json:"processed"`
	ProcessedError *string   `gorm:"type:text" json:"processed_error"`
	ReceivedAt     time.Time `gorm:"default:now()" json:"received_at"`
	CreatedAt      time.Time `gorm:"default:now()" json:"created_at"`
}
