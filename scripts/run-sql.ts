import fs from 'fs';
import path from 'path';
import { sql } from './db';

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Please provide a SQL file path");
    process.exit(1);
  }

  const sqlPath = path.resolve(file);
  if (!fs.existsSync(sqlPath)) {
    console.error("File not found:", sqlPath);
    process.exit(1);
  }

  const content = fs.readFileSync(sqlPath, 'utf8');
  console.log(`Executing SQL from ${file}...`);
  
  try {
    const sqlArr = [content];
    (sqlArr as any).raw = [content];
    await sql(sqlArr as unknown as TemplateStringsArray);
    console.log("✅ Success");
  } catch (e) {
    console.error("❌ Error:", e);
    process.exit(1);
  }
}

main();
