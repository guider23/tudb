require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

async function checkProviders() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query('SELECT DISTINCT provider FROM user_connections ORDER BY provider');
    console.log('Current providers in database:');
    result.rows.forEach(row => console.log(`  - ${row.provider}`));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkProviders();
