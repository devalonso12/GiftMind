#!/usr/bin/env node
/**
 * Run SQL files in supabase_migrations/ in lexical order against a Postgres DATABASE_URL.
 * Usage:
 *  DATABASE_URL="postgresql://..." node scripts/run_supabase_migrations.js
 * or set DATABASE_URL in your environment (.env.local) and run `npm run migrate`.
 */
const fs = require('fs');
const path = require('path');

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
    if (!m) return;
    const key = m[1];
    let val = m[2] || '';
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  });
}

async function main() {
  loadLocalEnv();
  const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.SUPABASE_DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('ERROR: No DATABASE_URL found. Set DATABASE_URL env var to your Supabase DB connection string.');
    process.exit(2);
  }

  let { Client } = require('pg');

  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
  } catch (err) {
    console.error('Failed to connect to database:', err.message || err);
    process.exit(3);
  }

  const migrationsDir = path.join(process.cwd(), 'supabase_migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error('No supabase_migrations directory found.');
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`Running migration: ${file}`);
    try {
      await client.query(sql);
      console.log(`✔ ${file}`);
    } catch (err) {
      console.error(`Migration failed: ${file}`);
      console.error(err.message || err);
      await client.end();
      process.exit(4);
    }
  }

  await client.end();
  console.log('All migrations applied successfully.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
