ALTER TABLE charities ADD COLUMN IF NOT EXISTS website_url VARCHAR(500) DEFAULT 'https://giveindia.org';
ALTER TABLE charities ADD COLUMN IF NOT EXISTS razorpayx_contact_id VARCHAR(255) DEFAULT 'cont_test_charity';

CREATE TABLE IF NOT EXISTS donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commitment_id UUID NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
    charity_id UUID NOT NULL REFERENCES charities(id) ON DELETE CASCADE,
    amount_paise BIGINT NOT NULL,
    outcome VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    razorpayx_payout_id VARCHAR(255),
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_commitment_donation UNIQUE(commitment_id)
);

CREATE INDEX IF NOT EXISTS idx_donations_commitment_id ON donations(commitment_id);
CREATE INDEX IF NOT EXISTS idx_donations_charity_id ON donations(charity_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
