import "server-only"
import { config } from "@/configs/config"
import { neon, neonConfig } from "@neondatabase/serverless"
import { Pool } from "pg"
import type { Project, Milestone, ActivityLog, GitHubWebhookPayload, DiscordWebhookPayload } from "./types"

// Export types
export type { Project, Milestone, ActivityLog, GitHubWebhookPayload, DiscordWebhookPayload }

// Define a common interface for our SQL function
// This matches the behavior of the `neon` tagged template function
interface SqlTag {
  (strings: TemplateStringsArray | string[], ...values: any[]): Promise<any[]>;
}

let sql: SqlTag;

// Check if we are using a local database or Neon
// Typically local DB URLs contain 'localhost' or '127.0.0.1'
// IMPORTANT: We must rely on process.env.DATABASE_URL directly if config is not fully initialized 
// or if we are running in a script context where config might behave differently.
const dbUrl = process.env.DATABASE_URL || config.databaseUrl || "";
// Force local DB check to be case insensitive and robust
const isLocalDb = dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1") || dbUrl.includes("@postgres");

console.log(`[db] Initializing database connection... Mode: ${isLocalDb ? 'Local (pg)' : 'Remote (neon)'}`);
if (isLocalDb) {
  // --- Local Development (using pg) ---
  const pool = new Pool({
    connectionString: dbUrl,
  });

  // Test connection on startup
  pool.on('error', (err) => {
    console.error('[db] Unexpected error on idle client', err);
  });

  // Create a tagged template function wrapper around pg.Pool
  sql = async (strings: TemplateStringsArray | string[], ...values: any[]) => {
    // Reconstruct the SQL string and parameters
    // neon driver uses $1, $2, etc. which pg also uses.
    // However, tagged templates come in as parts.
    
    // If called as a regular function with a string array (workaround we added earlier)
    // or as a tagged template
    
    let text = "";
    if (Array.isArray(strings) && 'raw' in strings) {
       // It's a TemplateStringsArray
       text = strings[0] || "";
       for (let i = 1; i < strings.length; i++) {
         text += `$${i}` + (strings[i] || "");
       }
    } else if (Array.isArray(strings)) {
      // It's a string array (manual call)
      text = strings[0] || "";
      // If it's a manual array call, we assume the user already constructed the query string 
      // OR we need to handle it. In setup-db.ts we are passing `[sqlString]`.
      // If there are values, we need to append them? 
      // Actually, if we pass `[sqlString]`, values is likely empty or we need to respect the $1 placeholders inside sqlString.
      // So if it's just a raw string in an array, we use it as is.
    }
    
    const client = await pool.connect();
    try {
      // console.log('[db] Executing SQL:', text, values);
      const result = await client.query(text, values);
      return result.rows;
    } finally {
      client.release();
    }
  }
} else {
  // --- Production / Neon (using @neondatabase/serverless) ---
  neonConfig.fetchConnectionCache = true
  
  // The neon function returns a callable that acts as the tagged template tag
  // Use dbUrl if config.databaseUrl is empty
  const connectionString = config.databaseUrl || dbUrl;
  
  const neonSql = neon(connectionString, {
    fetchOptions: {
      cache: "no-store",
    },
  });
  
  // Cast it to our common interface
  sql = neonSql as unknown as SqlTag;
}

export { sql }
