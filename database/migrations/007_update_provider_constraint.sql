-- Update user_connections provider constraint to include all cloud providers
-- First, delete any connections with removed providers (local, mysql)
DELETE FROM user_connections WHERE provider IN ('local', 'mysql');

-- Remove old constraint and add new one with all 18 cloud providers
ALTER TABLE user_connections DROP CONSTRAINT IF EXISTS user_connections_provider_check;

ALTER TABLE user_connections ADD CONSTRAINT user_connections_provider_check 
CHECK (provider IN (
  'supabase', 
  'neon', 
  'railway', 
  'rds',
  'herokupostgres',
  'googlecloudsql',
  'azurepostgres',
  'digitaloceanpostgres',
  'aivenpostgres',
  'render',
  'cockroachdb',
  'timescalecloud',
  'planetscale',
  'azuremysql',
  'googlecloudsqlmysql',
  'digitaloceanmysql',
  'aivenmysql',
  'auroramysql'
));
