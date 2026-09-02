package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type JSONB map[string]interface{}

func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return "{}", nil
	}
	return json.Marshal(j)
}

func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = JSONB{}
		return nil
	}
	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return errors.New("failed to unmarshal JSONB value: invalid type")
	}
	if len(bytes) == 0 {
		*j = JSONB{}
		return nil
	}
	return json.Unmarshal(bytes, j)
}

type User struct {
	ID             string    `gorm:"type:uuid;primaryKey" json:"id"`
	Email          string    `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	PasswordHash   string    `gorm:"type:varchar(255);not null" json:"-"`
	Name           string    `gorm:"type:varchar(255);not null" json:"name"`
	GithubUsername *string   `gorm:"type:varchar(255)" json:"github_username,omitempty"`
	CreatedAt      time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt      time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	Commitments  []Commitment  `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"commitments,omitempty"`
	Integrations []Integration `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"integrations,omitempty"`
}

func (User) TableName() string {
	return "users"
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	now := time.Now().UTC()
	if u.CreatedAt.IsZero() {
		u.CreatedAt = now
	}
	if u.UpdatedAt.IsZero() {
		u.UpdatedAt = now
	}
	return nil
}

type Commitment struct {
	ID           string    `gorm:"type:uuid;primaryKey" json:"id"`
	UserID       string    `gorm:"type:uuid;not null;index" json:"user_id"`
	Title        string    `gorm:"type:varchar(255);not null" json:"title"`
	Description  *string   `gorm:"type:text" json:"description,omitempty"`
	TargetCount  int       `gorm:"not null" json:"target_count"`
	Unit         string    `gorm:"type:varchar(50);not null" json:"unit"`
	DurationDays int       `gorm:"not null" json:"duration_days"`
	StartDate    time.Time `gorm:"not null" json:"start_date"`
	EndDate      time.Time `gorm:"not null" json:"end_date"`
	EvidenceType string    `gorm:"type:varchar(50);not null" json:"evidence_type"`
	AmountPaise  int64     `gorm:"not null" json:"amount_paise"`
	Status       string    `gorm:"type:varchar(50);not null;default:'DRAFT';index" json:"status"`
	QualityScore *float64  `gorm:"type:numeric(5,2)" json:"quality_score,omitempty"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	User                *User                `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Rules               []CommitmentRule     `gorm:"foreignKey:CommitmentID;constraint:OnDelete:CASCADE" json:"rules,omitempty"`
	Payments            []Payment            `gorm:"foreignKey:CommitmentID;constraint:OnDelete:CASCADE" json:"payments,omitempty"`
	Evidence            []Evidence           `gorm:"foreignKey:CommitmentID;constraint:OnDelete:CASCADE" json:"evidence,omitempty"`
	VerificationResults []VerificationResult `gorm:"foreignKey:CommitmentID;constraint:OnDelete:CASCADE" json:"verification_results,omitempty"`
}

func (Commitment) TableName() string {
	return "commitments"
}

func (c *Commitment) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	now := time.Now().UTC()
	if c.CreatedAt.IsZero() {
		c.CreatedAt = now
	}
	if c.UpdatedAt.IsZero() {
		c.UpdatedAt = now
	}
	return nil
}

type CommitmentRule struct {
	ID           string    `gorm:"type:uuid;primaryKey" json:"id"`
	CommitmentID string    `gorm:"type:uuid;not null;index" json:"commitment_id"`
	RuleType     string    `gorm:"type:varchar(100);not null" json:"rule_type"`
	RuleConfig   JSONB     `gorm:"type:jsonb;not null;default:'{}'" json:"rule_config"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (CommitmentRule) TableName() string {
	return "commitment_rules"
}

func (cr *CommitmentRule) BeforeCreate(tx *gorm.DB) error {
	if cr.ID == "" {
		cr.ID = uuid.New().String()
	}
	if cr.CreatedAt.IsZero() {
		cr.CreatedAt = time.Now().UTC()
	}
	return nil
}

type Payment struct {
	ID                string    `gorm:"type:uuid;primaryKey" json:"id"`
	CommitmentID      string    `gorm:"type:uuid;not null;index" json:"commitment_id"`
	RazorpayOrderID   string    `gorm:"type:varchar(255);not null;index" json:"razorpay_order_id"`
	RazorpayPaymentID *string   `gorm:"type:varchar(255)" json:"razorpay_payment_id,omitempty"`
	RazorpaySignature *string   `gorm:"type:varchar(255)" json:"razorpay_signature,omitempty"`
	AmountPaise       int64     `gorm:"not null" json:"amount_paise"`
	Status            string    `gorm:"type:varchar(50);not null;default:'PENDING'" json:"status"`
	CreatedAt         time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	Refunds []Refund `gorm:"foreignKey:PaymentID;constraint:OnDelete:CASCADE" json:"refunds,omitempty"`
}

func (Payment) TableName() string {
	return "payments"
}

func (p *Payment) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	now := time.Now().UTC()
	if p.CreatedAt.IsZero() {
		p.CreatedAt = now
	}
	if p.UpdatedAt.IsZero() {
		p.UpdatedAt = now
	}
	return nil
}

type Refund struct {
	ID               string    `gorm:"type:uuid;primaryKey" json:"id"`
	PaymentID        string    `gorm:"type:uuid;not null;index" json:"payment_id"`
	RazorpayRefundID string    `gorm:"type:varchar(255);not null" json:"razorpay_refund_id"`
	AmountPaise      int64     `gorm:"not null" json:"amount_paise"`
	Status           string    `gorm:"type:varchar(50);not null;default:'PENDING'" json:"status"`
	CreatedAt        time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt        time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Refund) TableName() string {
	return "refunds"
}

func (r *Refund) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	now := time.Now().UTC()
	if r.CreatedAt.IsZero() {
		r.CreatedAt = now
	}
	if r.UpdatedAt.IsZero() {
		r.UpdatedAt = now
	}
	return nil
}

type Integration struct {
	ID               string    `gorm:"type:uuid;primaryKey" json:"id"`
	UserID           string    `gorm:"type:uuid;not null;index" json:"user_id"`
	Provider         string    `gorm:"type:varchar(50);not null" json:"provider"`
	AccessTokenEnc   string    `gorm:"type:text;not null" json:"-"`
	RefreshTokenEnc  *string   `gorm:"type:text" json:"-"`
	ExternalUsername *string   `gorm:"type:varchar(255)" json:"external_username,omitempty"`
	ConnectedAt      time.Time `gorm:"autoCreateTime" json:"connected_at"`
}

func (Integration) TableName() string {
	return "integrations"
}

func (i *Integration) BeforeCreate(tx *gorm.DB) error {
	if i.ID == "" {
		i.ID = uuid.New().String()
	}
	if i.ConnectedAt.IsZero() {
		i.ConnectedAt = time.Now().UTC()
	}
	return nil
}

type Evidence struct {
	ID           string    `gorm:"type:uuid;primaryKey" json:"id"`
	CommitmentID string    `gorm:"type:uuid;not null;index" json:"commitment_id"`
	Source       string    `gorm:"type:varchar(50);not null" json:"source"`
	SourceRef    string    `gorm:"type:varchar(255);not null" json:"source_ref"`
	RawPayload   JSONB     `gorm:"type:jsonb;not null;default:'{}'" json:"raw_payload"`
	OccurredAt   time.Time `gorm:"not null;index" json:"occurred_at"`
	IngestedAt   time.Time `gorm:"autoCreateTime" json:"ingested_at"`
}

func (Evidence) TableName() string {
	return "evidence"
}

func (e *Evidence) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	if e.IngestedAt.IsZero() {
		e.IngestedAt = time.Now().UTC()
	}
	return nil
}

type VerificationResult struct {
	ID             string    `gorm:"type:uuid;primaryKey" json:"id"`
	CommitmentID   string    `gorm:"type:uuid;not null;index" json:"commitment_id"`
	EvidenceCount  int       `gorm:"not null;default:0" json:"evidence_count"`
	VerifiedCount  int       `gorm:"not null;default:0" json:"verified_count"`
	ProgressPct    float64   `gorm:"type:numeric(5,2);not null;default:0" json:"progress_pct"`
	AnomalyFlag    bool      `gorm:"not null;default:false" json:"anomaly_flag"`
	AnomalyReason  *string   `gorm:"type:text" json:"anomaly_reason,omitempty"`
	AIConfidence   *float64  `gorm:"type:numeric(5,2)" json:"ai_confidence,omitempty"`
	AISummary      JSONB     `gorm:"type:jsonb" json:"ai_summary,omitempty"`
	CreatedAt      time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (VerificationResult) TableName() string {
	return "verification_results"
}

func (vr *VerificationResult) BeforeCreate(tx *gorm.DB) error {
	if vr.ID == "" {
		vr.ID = uuid.New().String()
	}
	if vr.CreatedAt.IsZero() {
		vr.CreatedAt = time.Now().UTC()
	}
	return nil
}

type WebhookEvent struct {
	ID         string    `gorm:"type:uuid;primaryKey" json:"id"`
	Provider   string    `gorm:"type:varchar(50);not null;index:idx_wh_prov_proc" json:"provider"`
	EventType  string    `gorm:"type:varchar(100);not null" json:"event_type"`
	Payload    JSONB     `gorm:"type:jsonb;not null;default:'{}'" json:"payload"`
	Processed  bool      `gorm:"not null;default:false;index:idx_wh_prov_proc" json:"processed"`
	ReceivedAt time.Time `gorm:"autoCreateTime" json:"received_at"`
}

func (WebhookEvent) TableName() string {
	return "webhook_events"
}

func (we *WebhookEvent) BeforeCreate(tx *gorm.DB) error {
	if we.ID == "" {
		we.ID = uuid.New().String()
	}
	if we.ReceivedAt.IsZero() {
		we.ReceivedAt = time.Now().UTC()
	}
	return nil
}
