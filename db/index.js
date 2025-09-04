const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Add your Neon connection string to backend/.env as DATABASE_URL');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('neon.tech') || /sslmode=require/i.test(connectionString)
    ? { rejectUnauthorized: false }
    : undefined
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

module.exports = { pool, query };


