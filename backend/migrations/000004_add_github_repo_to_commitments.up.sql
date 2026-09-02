ALTER TABLE commitments ADD COLUMN IF NOT EXISTS github_repo VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_commitments_github_repo ON commitments(github_repo);
