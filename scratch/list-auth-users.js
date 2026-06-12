const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vcbtvhociaioeyhhsczh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYnR2aG9jaWFpb2V5aGhzY3poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM2NzgzMCwiZXhwIjoyMDkxOTQzODMwfQ.LfxRzV3NOQIFdGcN0_OYkHplPVeGRe7sX-vn-qOpaU0',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  console.log('--- DB DASHBOARD USERS ---');
  const { data: dbUsers, error: dbErr } = await supabase.from('dashboard_users').select('*');
  console.log('dashboard_users error:', dbErr);
  console.log('dashboard_users rows:', dbUsers);

  console.log('\n--- AUTH USERS ---');
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error('auth listUsers error:', authErr);
  } else {
    console.log(`Total auth users: ${authUsers.users.length}`);
    authUsers.users.forEach(u => {
      console.log(`- ID: ${u.id} | Email: ${u.email} | AppMeta: ${JSON.stringify(u.app_metadata)}`);
    });
  }
}

run();
