const { Client } = require('pg');

const connectionString = 'postgres://postgres:wG9cTdjIGynxAStS@faf-infra-prod-v2-rdsinstance-jmrivbavtegl.csr8okcacgur.us-east-1.rds.amazonaws.com:5432/faf_db';

async function testConnection() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Successfully connected to AWS Aurora DB!');
    
    const res = await client.query('SELECT NOW()');
    console.log('Current Database Time:', res.rows[0].now);
  } catch (err) {
    console.error('Connection failed:', err);
  } finally {
    await client.end();
  }
}

testConnection();
