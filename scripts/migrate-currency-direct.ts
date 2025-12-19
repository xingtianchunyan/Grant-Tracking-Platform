import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DATABASE_URL || "";

async function migrate() {
  console.log('Running migration: Add funding_currency to projects table');
  
  const pool = new Pool({
    connectionString: dbUrl,
  });

  try {
    const client = await pool.connect();
    try {
      await client.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS funding_currency VARCHAR(10) DEFAULT \'USD\'');
      console.log('Successfully added funding_currency column');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error adding funding_currency column:', err);
  } finally {
    await pool.end();
  }
}

migrate();
