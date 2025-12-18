// scripts/db.ts
import "dotenv/config"
import { neon, neonConfig } from "@neondatabase/serverless"
import { Pool } from "pg"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set in environment")
}

// Common interface for SQL function
interface SqlTag {
  (strings: TemplateStringsArray | string[], ...values: any[]): Promise<any[]>;
}

let sql: SqlTag;

const isLocalDb = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1") || databaseUrl.includes("@postgres");

if (isLocalDb) {
  console.log('[scripts/db] Using local pg driver');
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  sql = async (strings: TemplateStringsArray | string[], ...values: any[]) => {
    let text = "";
    if (Array.isArray(strings) && 'raw' in strings) {
       text = strings[0] || "";
       for (let i = 1; i < strings.length; i++) {
         text += `$${i}` + (strings[i] || "");
       }
    } else if (Array.isArray(strings)) {
       text = strings[0] || "";
    }
    
    const client = await pool.connect();
    try {
      const result = await client.query(text, values);
      return result.rows;
    } finally {
      client.release();
    }
  }
} else {
  console.log('[scripts/db] Using remote neon driver');
  neonConfig.fetchConnectionCache = true
  const neonSql = neon(databaseUrl, {
    fetchOptions: {
      cache: "no-store",
    },
  });
  sql = neonSql as unknown as SqlTag;
}

export { sql }
