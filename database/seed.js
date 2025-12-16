const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function seedDatabase() {
  const connectionString = getConnectionString();
  
  if (!connectionString) {
    console.error('Error: No database connection string found');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.DB_SSL === 'true' 
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' }
      : false,
  });

  try {
    console.log('Seeding database...');
    
    const seedFile = path.join(__dirname, 'seed', 'seed_data.sql');
    const seedSQL = fs.readFileSync(seedFile, 'utf8');
    
    await pool.query(seedSQL);
    
    console.log('✓ Database seeded successfully');
    
    // Display summary
    const customerCount = await pool.query('SELECT COUNT(*) FROM customers');
    const productCount = await pool.query('SELECT COUNT(*) FROM products');
    const orderCount = await pool.query('SELECT COUNT(*) FROM orders');
    
    console.log('\nDatabase summary:');
    console.log(`  Customers: ${customerCount.rows[0].count}`);
    console.log(`  Products: ${productCount.rows[0].count}`);
    console.log(`  Orders: ${orderCount.rows[0].count}`);
  } catch (error) {
    console.error('Seeding failed:', error);
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

seedDatabase();
