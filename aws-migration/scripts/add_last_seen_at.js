/**
 * add_last_seen_at.js
 * Temporary VPC Lambda that connects to AWS RDS to:
 * 1. Add the last_seen_at column to the public.profiles table.
 */

const { Client } = require('pg');

exports.handler = async function(event, context) {
  const client = new Client({
    host: process.env.RDS_HOST,
    port: 5432,
    database: 'faf_db',
    user: 'postgres',
    password: process.env.RDS_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  const results = [];

  try {
    await client.connect();
    console.log('Connected to RDS. Adding last_seen_at column...');

    const queries = [
      {
        label: 'Add last_seen_at column to profiles',
        sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`
      },
      {
        label: 'Grant update on profiles to authenticated role',
        sql: `GRANT UPDATE(last_seen_at) ON public.profiles TO authenticated;`
      }
    ];

    for (const item of queries) {
      console.log(`Running: ${item.label}`);
      await client.query(item.sql);
      results.push({ label: item.label, status: 'OK' });
    }

    console.log('Database schema updated successfully.');
    return { statusCode: 200, message: 'Database schema updated successfully', results };
  } catch (err) {
    console.error('Error applying database schema updates:', err);
    return { statusCode: 500, error: err.message, results };
  } finally {
    await client.end();
  }
};
