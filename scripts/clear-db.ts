import { sql } from './db';

async function main() {
  console.log('🧹 Starting database cleanup...');
  
  try {
    // Truncate tables in order to respect foreign key constraints
    console.log('🗑️ Truncating tables...');
    
    // We can use TRUNCATE with CASCADE to clear everything efficiently
    await sql`TRUNCATE TABLE projects, milestones, activity_logs RESTART IDENTITY CASCADE`;
    
    console.log('✅ All tables cleared successfully.');
    console.log('🎉 Database cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    process.exit(1);
  }
}

main();
