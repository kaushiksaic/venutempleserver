require('dotenv').config();

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing. Copy .env.example to .env and set it.');
  }

  const dbName = new URL(databaseUrl).pathname.replace(/^\//, '') || 'venutemple';
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = '/postgres';

  const adminClient = new Client({ connectionString: adminUrl.toString() });
  await adminClient.connect();

  const exists = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [
    dbName,
  ]);

  if (exists.rowCount === 0) {
    await adminClient.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Created database: ${dbName}`);
  } else {
    console.log(`Database already exists: ${dbName}`);
  }

  await adminClient.end();

  const appClient = new Client({ connectionString: databaseUrl });
  await appClient.connect();

  const schemaPath = path.join(__dirname, '..', '..', 'sql', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await appClient.query(schemaSql);
  console.log('Applied schema.sql');

  const migratePath = path.join(__dirname, '..', '..', 'sql', 'migrate.sql');
  const migrateSql = fs.readFileSync(migratePath, 'utf8');
  await appClient.query(migrateSql);
  console.log('Applied migrate.sql');

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(password, 10);

  await appClient.query(
    `INSERT INTO admins (username, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [username, passwordHash]
  );
  console.log(`Admin user ready: ${username}`);

  const tickerCount = await appClient.query('SELECT COUNT(*)::int AS count FROM ticker_items');
  if (tickerCount.rows[0].count === 0) {
    const seedPath = path.join(__dirname, '..', '..', 'sql', 'seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await appClient.query(seedSql);
    console.log('Applied seed.sql');
  } else {
    console.log('Seed skipped (ticker_items already has data)');
  }

  await appClient.end();
  console.log('Database init complete.');
}

main().catch((err) => {
  console.error('Database init failed:', err.message);
  process.exit(1);
});
