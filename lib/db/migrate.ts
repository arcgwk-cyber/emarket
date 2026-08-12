import { Pool } from 'pg';
import { parse } from 'pg-connection-string';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in environment variables.');
  process.exit(1);
}

const config = parse(process.env.DATABASE_URL);
config.ssl = { rejectUnauthorized: false };

const pool = new Pool(config as any);

async function runMigration() {
  console.log('🚀 Starting manual database migration...');
  
  try {
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    
    if (files.length === 0) {
      console.log('No SQL migration files found in supabase/migrations.');
      return;
    }
    
    // Sort files alphabetically to ensure correct order
    files.sort();
    
    for (const file of files) {
      console.log(`Running migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      
      // Execute the migration SQL script
      await pool.query(sqlContent);
      console.log(`✅ Successfully applied: ${file}`);
    }
    
    console.log('✨ All migrations applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
