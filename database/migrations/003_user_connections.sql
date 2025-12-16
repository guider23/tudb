-- User database connections table
CREATE TABLE IF NOT EXISTS user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('local', 'supabase', 'neon', 'railway', 'rds')),
  connection_string TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_connected_at TIMESTAMP,
  
  UNIQUE(user_id, name)
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_active ON user_connections(user_id, is_active);

-- Update query_audit_log to properly support user_id
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='query_audit_log' AND column_name='user_id') THEN
    ALTER TABLE query_audit_log ADD COLUMN user_id VARCHAR(255);
  END IF;
  
  -- Make user_id VARCHAR if it's not already
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='query_audit_log' AND column_name='user_id' 
             AND data_type != 'character varying') THEN
    ALTER TABLE query_audit_log ALTER COLUMN user_id TYPE VARCHAR(255);
  END IF;
END $$;

-- Add connection_id to track which connection was used
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='query_audit_log' AND column_name='connection_id') THEN
    ALTER TABLE query_audit_log ADD COLUMN connection_id UUID REFERENCES user_connections(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index on user_id for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON query_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_connection ON query_audit_log(connection_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for user_connections
DROP TRIGGER IF EXISTS update_user_connections_updated_at ON user_connections;
CREATE TRIGGER update_user_connections_updated_at 
  BEFORE UPDATE ON user_connections 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample connection for testing (optional - remove in production)
-- INSERT INTO user_connections (user_id, name, provider, connection_string, is_active)
-- VALUES ('test_user', 'Local Development', 'local', 'postgresql://postgres:postgres@localhost:5432/tudb', true)
-- ON CONFLICT (user_id, name) DO NOTHING;

COMMENT ON TABLE user_connections IS 'Stores user database connections with encrypted credentials';
COMMENT ON COLUMN user_connections.connection_string IS 'Encrypted database connection string';
COMMENT ON COLUMN user_connections.is_active IS 'Only one connection per user can be active at a time';
