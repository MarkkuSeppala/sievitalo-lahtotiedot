import { pool } from '../db';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../../migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (file.endsWith('.sql')) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await pool.query(sql);
      console.log(`Completed: ${file}`);
    }
  }

  console.log('All migrations completed');
  await pool.end();
}

runMigrations().catch(console.error);









