-- Users table (edustajat and suunnittelijat)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('edustaja', 'suunnittelija')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  edustaja_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  created_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP
);

-- Submission fields table (for text/radio/select answers)
CREATE TABLE IF NOT EXISTS submission_fields (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  field_name VARCHAR(255) NOT NULL,
  field_value TEXT NOT NULL,
  UNIQUE(submission_id, field_name)
);

-- Submission files table (for file uploads)
CREATE TABLE IF NOT EXISTS submission_files (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  field_name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_token ON customers(token);
CREATE INDEX IF NOT EXISTS idx_customers_edustaja ON customers(edustaja_id);
CREATE INDEX IF NOT EXISTS idx_submissions_customer ON submissions(customer_id);
CREATE INDEX IF NOT EXISTS idx_submission_fields_submission ON submission_fields(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_files_submission ON submission_files(submission_id);

