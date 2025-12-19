require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Use Heroku DATABASE_URL
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL not found in environment');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connected to database');
    
    // Read and execute migration
    const migrationPath = path.join(__dirname, 'migrations', '007_update_provider_constraint.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration...');
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('Provider constraint updated to include all 18 cloud providers');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
