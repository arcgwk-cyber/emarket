import { Pool } from 'pg';
import { parse } from 'pg-connection-string';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const config = parse(process.env.DATABASE_URL);
config.ssl = { rejectUnauthorized: false };
const pool = new Pool(config as any);

async function run() {
  try {
    console.log('Applying 0002_add_subscription_customization_and_spin_rewards.sql manually...');
    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '0002_add_subscription_customization_and_spin_rewards.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('✅ Applied subscription migration successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to apply migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
