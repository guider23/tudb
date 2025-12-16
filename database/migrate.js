const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  const connectionString = getConnectionString();
  
  if (!connectionString) {
    console.error('Error: No database connection string found');
    console.error('Please set DATABASE_URL or provider-specific connection string in .env');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('amazonaws.com') || process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false,
  });

  try {
    console.log('Running migrations...');
    
    // Run migrations in order
    const migrationFiles = [
      '001_initial_schema.sql',
      '003_user_connections.sql',
      '004_system_settings.sql',
      '005_saved_queries.sql',
      '006_collaboration.sql'
    ];
    
    for (const file of migrationFiles) {
      console.log(`Running ${file}...`);
      const migrationFile = path.join(__dirname, 'migrations', file);
      if (fs.existsSync(migrationFile)) {
        const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
        await pool.query(migrationSQL);
        console.log(`✓ ${file} completed`);
      } else {
        console.log(`⚠ ${file} not found, skipping`);
      }
    }
    
    console.log('✓ All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

function getConnectionString() {
  const provider = process.env.DB_PROVIDER || 'local';
  
  switch (provider) {
    case 'local':
      return process.env.DATABASE_URL;
    case 'supabase':
      return process.env.SUPABASE_DB_URL;
    case 'neon':
      return process.env.NEON_DATABASE_URL;
    case 'railway':
      return process.env.RAILWAY_DATABASE_URL;
    case 'rds':
      return process.env.RDS_DATABASE_URL;
    default:
      return process.env.DATABASE_URL;
  }
}

runMigrations();
