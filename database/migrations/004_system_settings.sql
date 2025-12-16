-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  allow_destructive_ops BOOLEAN DEFAULT false,
  require_approval BOOLEAN DEFAULT true,
  max_row_limit INTEGER DEFAULT 1000,
  query_timeout INTEGER DEFAULT 30000,
  enable_audit_log BOOLEAN DEFAULT true,
  api_key TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_user_id ON system_settings(user_id);
