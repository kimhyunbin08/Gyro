import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL must be configured before running database migrations.');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'disable' ? false : { rejectUnauthorized: true },
  connectionTimeoutMillis: 5000,
});
const client = await pool.connect();

try {
  const migration = await readFile(new URL('../migrations/001_builder_platform.sql', import.meta.url), 'utf8');
  await client.query('BEGIN');
  await client.query(migration);
  await client.query('COMMIT');
  console.log('Gyro builder database migration completed.');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Gyro builder database migration failed.');
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
