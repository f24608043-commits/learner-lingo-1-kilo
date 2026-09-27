const postgres = require('postgres');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
let dbUrl = '';
for (const line of envFile.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
  }
}

console.log('Connecting to:', dbUrl.replace(/:[^:@]+@/, ':***@'));

const sql = postgres(dbUrl, {
  prepare: false,
  ssl: { rejectUnauthorized: false },
  connect_timeout: 10
});

async function run() {
  try {
    const res = await sql`SELECT 1 as connected, NOW() as time`;
    console.log('✅ Connected successfully!', res);
  } catch (err) {
    console.error('❌ Connection error:', err.message, err.code);
  } finally {
    await sql.end();
  }
}

run();
