const { Client } = require('pg');

const RDS_CONFIG = {
  host: 'faf-infra-prod-v2-rdsinstance-jmrivbavtegl.csr8okcacgur.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'faf_db',
  user: 'postgres',
  password: 'wG9cTdjIGynxAStS',
  ssl: {
    rejectUnauthorized: false
  }
};

async function fixNulls() {
  const client = new Client(RDS_CONFIG);
  try {
    await client.connect();
    console.log('Connected to RDS database.');

    console.log('Updating posts set posted_to_global_hub = false where it is null...');
    const postsRes = await client.query('UPDATE posts SET posted_to_global_hub = false WHERE posted_to_global_hub IS NULL');
    console.log('Updated posts count:', postsRes.rowCount);

    console.log('Updating profiles set joined_global_hub = false where it is null...');
    const profilesRes = await client.query('UPDATE profiles SET joined_global_hub = false WHERE joined_global_hub IS NULL');
    console.log('Updated profiles count:', profilesRes.rowCount);

    // Let's verify by checking some posts
    console.log('Verifying posts values...');
    const verifyRes = await client.query('SELECT id, body, posted_to_global_hub FROM posts LIMIT 3');
    console.log('Sample verified posts:', verifyRes.rows);

  } catch (err) {
    console.error('Database update failed:', err);
  } finally {
    await client.end();
  }
}

fixNulls();
