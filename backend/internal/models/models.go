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
		return nil, nil
	}
	b, err := json.Marshal(j)
	if err != nil {
		return nil, err
	}
	return string(b), nil
}

func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return errors.New("type assertion to []byte or string failed")
	}
	return json.Unmarshal(bytes, j)
}

type User struct {
	ID                   string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Email                string    `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	PasswordHash         string    `gorm:"type:varchar(255);not null" json:"-"`
	Name                 string    `gorm:"type:varchar(255);not null" json:"name"`
	GithubUsername       *string   `gorm:"type:varchar(255)" json:"github_username"`
	CodeforcesUsername   *string   `gorm:"type:varchar(255)" json:"codeforces_username"`
	Role                 string    `gorm:"type:varchar(50);default:'user'" json:"role"`
	CreatedAt            time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt            time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	Integrations []Integration `gorm:"foreignKey:UserID" json:"integrations,omitempty"`
	Commitments  []Commitment  `gorm:"foreignKey:UserID" json:"commitments,omitempty"`
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

func (u *User) BeforeUpdate(tx *gorm.DB) error {
	u.UpdatedAt = time.Now().UTC()
	return nil
}

type Charity struct {
	ID                     string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name                   string    `gorm:"type:varchar(255);not null" json:"name"`
	Category               string    `gorm:"type:varchar(100);not null" json:"category"`
	Description            string    `gorm:"type:text;not null" json:"description"`
	LogoURL                *string   `gorm:"type:varchar(500)" json:"logo_url"`
	WebsiteURL             *string   `gorm:"type:varchar(500);default:'https://giveindia.org'" json:"website_url"`
	RazorpayxContactID     *string   `gorm:"type:varchar(255);default:'cont_test_charity'" json:"razorpayx_contact_id"`
	RazorpayxFundAccountID *string   `gorm:"type:varchar(255)" json:"razorpayx_fund_account_id"`
	IsActive               bool      `gorm:"default:true;not null" json:"is_active"`
	CreatedAt              time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt              time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (c *Charity) BeforeCreate(tx *gorm.DB) error {
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

func (c *Charity) BeforeUpdate(tx *gorm.DB) error {
	c.UpdatedAt = time.Now().UTC()
	return nil
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
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	User     *User            `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Charity  *Charity         `gorm:"foreignKey:CharityID" json:"charity,omitempty"`
	Rules    []CommitmentRule `gorm:"foreignKey:CommitmentID" json:"rules,omitempty"`
	Payment  *Payment         `gorm:"foreignKey:CommitmentID" json:"payment,omitempty"`
	Donation *Donation        `gorm:"foreignKey:CommitmentID" json:"donation,omitempty"`
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

func (c *Commitment) BeforeUpdate(tx *gorm.DB) error {
	c.UpdatedAt = time.Now().UTC()
	return nil
}

type CommitmentRule struct {
	ID           string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CommitmentID string    `gorm:"type:uuid;not null;index" json:"commitment_id"`
	RuleType     string    `gorm:"type:varchar(100);not null" json:"rule_type"`
	RuleConfig   JSONB     `gorm:"type:jsonb;not null" json:"rule_config"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
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

type Integration struct {
	ID               string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID           string    `gorm:"type:uuid;not null;index" json:"user_id"`
	Provider         string    `gorm:"type:varchar(50);not null" json:"provider"`
	AccessTokenEnc   string    `gorm:"type:text;not null" json:"-"`
	ExternalUsername *string   `gorm:"type:varchar(255)" json:"external_username"`
	ConnectedAt      time.Time `gorm:"autoCreateTime" json:"connected_at"`
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
	ID           string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CommitmentID string    `gorm:"type:uuid;not null;index;uniqueIndex:uq_evidence_commitment_source" json:"commitment_id"`
	Source       string    `gorm:"type:varchar(50);not null" json:"source"`
	SourceRef    string    `gorm:"type:varchar(255);not null;uniqueIndex:uq_evidence_commitment_source" json:"source_ref"`
	RawPayload   JSONB     `gorm:"type:jsonb;not null" json:"raw_payload"`
	OccurredAt   time.Time `gorm:"not null" json:"occurred_at"`
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
	ID            string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CommitmentID  string    `gorm:"type:uuid;not null;index" json:"commitment_id"`
	EvidenceCount int       `gorm:"not null" json:"evidence_count"`
	VerifiedCount int       `gorm:"not null" json:"verified_count"`
	ProgressPct   float64   `gorm:"type:numeric(5,2);not null" json:"progress_pct"`
	AnomalyFlag   bool      `gorm:"default:false;not null" json:"anomaly_flag"`
	AnomalyReason *string   `gorm:"type:text" json:"anomaly_reason"`
	AIConfidence  *float64  `gorm:"type:numeric(5,2)" json:"ai_confidence"`
	AISummary     JSONB     `gorm:"type:jsonb" json:"ai_summary"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`
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

type Payment struct {
	ID                string     `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CommitmentID      string     `gorm:"type:uuid;not null;uniqueIndex" json:"commitment_id"`
	RazorpayOrderID   string     `gorm:"type:varchar(255);uniqueIndex;not null" json:"razorpay_order_id"`
	RazorpayPaymentID *string    `gorm:"type:varchar(255);index" json:"razorpay_payment_id"`
	RazorpaySignature *string    `gorm:"type:varchar(255)" json:"razorpay_signature"`
	AmountPaise       int64      `gorm:"not null" json:"amount_paise"`
	Currency          string     `gorm:"type:varchar(10);default:'INR';not null" json:"currency"`
	Status            string     `gorm:"type:varchar(50);not null;default:'PENDING';index" json:"status"`
	CreatedAt         time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time  `gorm:"autoUpdateTime" json:"updated_at"`

	Refunds []Refund `gorm:"foreignKey:PaymentID" json:"refunds,omitempty"`
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

func (p *Payment) BeforeUpdate(tx *gorm.DB) error {
	p.UpdatedAt = time.Now().UTC()
	return nil
}

type Refund struct {
	ID               string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	PaymentID        string    `gorm:"type:uuid;not null;index" json:"payment_id"`
	RazorpayRefundID string    `gorm:"type:varchar(255);uniqueIndex;not null" json:"razorpay_refund_id"`
	AmountPaise      int64     `gorm:"not null" json:"amount_paise"`
	Status           string    `gorm:"type:varchar(50);not null;default:'PENDING';index" json:"status"`
	CreatedAt        time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (r *Refund) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	if r.CreatedAt.IsZero() {
		r.CreatedAt = time.Now().UTC()
	}
	return nil
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
	CreatedAt         time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	Charity *Charity `gorm:"foreignKey:CharityID" json:"charity,omitempty"`
}

func (d *Donation) BeforeCreate(tx *gorm.DB) error {
	if d.ID == "" {
		d.ID = uuid.New().String()
	}
	now := time.Now().UTC()
	if d.CreatedAt.IsZero() {
		d.CreatedAt = now
	}
	if d.UpdatedAt.IsZero() {
		d.UpdatedAt = now
	}
	return nil
}

func (d *Donation) BeforeUpdate(tx *gorm.DB) error {
	d.UpdatedAt = time.Now().UTC()
	return nil
}

type WebhookEvent struct {
	ID             string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Provider       string    `gorm:"type:varchar(50);not null" json:"provider"`
	EventID        string    `gorm:"type:varchar(255);not null;uniqueIndex:uq_provider_event_id"`
	EventType      string    `gorm:"type:varchar(100);not null" json:"event_type"`
	Payload        JSONB     `gorm:"type:jsonb;not null" json:"payload"`
	Processed      bool      `gorm:"default:false;not null" json:"processed"`
	ProcessedError *string   `gorm:"type:text" json:"processed_error"`
	ReceivedAt     time.Time `gorm:"autoCreateTime" json:"received_at"`
	CreatedAt      time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (we *WebhookEvent) BeforeCreate(tx *gorm.DB) error {
	if we.ID == "" {
		we.ID = uuid.New().String()
	}
	now := time.Now().UTC()
	if we.ReceivedAt.IsZero() {
		we.ReceivedAt = now
	}
	if we.CreatedAt.IsZero() {
		we.CreatedAt = now
	}
	return nil
}
