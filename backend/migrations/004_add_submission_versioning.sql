-- Add submission versioning support (submitted history + parent link)
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS version INTEGER;

ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS parent_submission_id INTEGER REFERENCES submissions(id) ON DELETE SET NULL;

-- Ensure submitted versions are unique per customer
CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_customer_version_unique
ON submissions(customer_id, version)
WHERE status = 'submitted';

-- Speed up parent lookups
CREATE INDEX IF NOT EXISTS idx_submissions_parent_submission_id
ON submissions(parent_submission_id);

