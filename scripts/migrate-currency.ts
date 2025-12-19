import { sql } from '../lib/db';

async function migrate() {
  console.log('Running migration: Add funding_currency to projects table');
  try {
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS funding_currency VARCHAR(10) DEFAULT 'USD'`;
    console.log('Successfully added funding_currency column');
  } catch (err) {
    console.error('Error adding funding_currency column:', err);
  }
  process.exit(0);
}

migrate();
