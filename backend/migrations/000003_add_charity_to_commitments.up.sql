ALTER TABLE commitments ADD COLUMN IF NOT EXISTS charity_id UUID REFERENCES charities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_commitments_charity_id ON commitments(charity_id);
