-- Add name1 and name2 columns to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS name1 VARCHAR(255),
ADD COLUMN IF NOT EXISTS name2 VARCHAR(255);

-- Make name1 NOT NULL after adding it (for existing rows, we'll need to handle this)
-- For now, we'll allow NULL temporarily to avoid issues with existing data
-- In production, you may want to backfill existing data first






