import { sql } from './db';

async function migrate() {
  console.log('Running migration: Add funding_details to projects and milestones tables');
  try {
    // Add funding_details to projects
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS funding_details JSONB DEFAULT '[]'`;
    console.log('Successfully added funding_details column to projects');

    // Add funding_details to milestones
    await sql`ALTER TABLE milestones ADD COLUMN IF NOT EXISTS funding_details JSONB DEFAULT '[]'`;
    console.log('Successfully added funding_details column to milestones');

    // Optional: Migrate existing data
    console.log('Migrating existing project data to funding_details...');
    await sql`
      UPDATE projects 
      SET funding_details = jsonb_build_array(
        jsonb_build_object('amount', funding_amount, 'currency', COALESCE(funding_currency, 'USD'))
      )
      WHERE funding_amount IS NOT NULL AND (funding_details IS NULL OR funding_details = '[]'::jsonb)
    `;
    console.log('Successfully migrated project data');

    console.log('Migrating existing milestone data to funding_details...');
    await sql`
      UPDATE milestones m
      SET funding_details = jsonb_build_array(
        jsonb_build_object('amount', m.budget, 'currency', COALESCE(p.funding_currency, 'USD'))
      )
      FROM projects p
      WHERE m.project_id = p.id AND m.budget IS NOT NULL AND (m.funding_details IS NULL OR m.funding_details = '[]'::jsonb)
    `;
    console.log('Successfully migrated milestone data');

  } catch (err) {
    console.error('Error during migration:', err);
  }
  process.exit(0);
}

migrate();
