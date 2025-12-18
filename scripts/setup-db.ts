import fs from 'fs';
import path from 'path';
import { sql } from './db';

async function main() {
  console.log('🚀 Starting database initialization...');
  
  try {
    // 1. Read create tables SQL
    const sqlPath = path.join(__dirname, '01-create-tables.sql');
    if (!fs.existsSync(sqlPath)) {
        throw new Error('Create tables script not found at ' + sqlPath);
    }
    const createTableSql = fs.readFileSync(sqlPath, 'utf8');

    // 2. Execute create tables
    console.log('📦 Creating tables...');
    // We now have a unified `sql` function in lib/db.ts that handles both
    // tagged templates and string arrays (our custom implementation).
    // So we can just call it with the array workaround.
    const sqlArr = [createTableSql];
    (sqlArr as any).raw = [createTableSql];
    await sql(sqlArr as unknown as TemplateStringsArray);
    console.log('✅ Tables created successfully.');

    // 3. (Optional) Seed data
    if (process.argv.includes('--seed')) {
        const seedPath = path.join(__dirname, '02-seed-data.sql');
        if (fs.existsSync(seedPath)) {
            console.log('🌱 Seeding data...');
            const seedSql = fs.readFileSync(seedPath, 'utf8');
            
            const seedArr = [seedSql];
            (seedArr as any).raw = [seedSql];
            await sql(seedArr as unknown as TemplateStringsArray);
            
            console.log('✅ Seed data injected.');
        } else {
            console.log('⚠️ Seed file not found, skipping seed.');
        }
    }
    
    console.log('🎉 Database setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during database setup:', error);
    process.exit(1);
  }
}

main();
