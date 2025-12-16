-- Saved Queries Table
CREATE TABLE IF NOT EXISTS saved_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  question TEXT NOT NULL,
  sql TEXT,
  folder TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_saved_queries_user_id ON saved_queries(user_id);

-- Create index on folder for filtering
CREATE INDEX IF NOT EXISTS idx_saved_queries_folder ON saved_queries(folder);

-- Create index on is_favorite for quick favorite queries lookup
CREATE INDEX IF NOT EXISTS idx_saved_queries_favorite ON saved_queries(user_id, is_favorite) WHERE is_favorite = true;
