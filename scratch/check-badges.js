const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vcbtvhociaioeyhhsczh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYnR2aG9jaWFpb2V5aGhzY3poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM2NzgzMCwiZXhwIjoyMDkxOTQzODMwfQ.LfxRzV3NOQIFdGcN0_OYkHplPVeGRe7sX-vn-qOpaU0',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, badge_type, badge_color');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total users:', users.length);
  const admins = users.filter(u => u.role === 'admin');
  console.log('Admins count:', admins.length);
  admins.forEach(a => {
    console.log(`Admin - ID: ${a.id} | Name: "${a.full_name}" | Email: "${a.email}" | Badge: ${a.badge_type} (${a.badge_color})`);
  });

  const withBadges = users.filter(u => u.badge_type && u.badge_type !== 'none');
  console.log('\nUsers with badges (excluding admins):');
  withBadges.forEach(u => {
    if (u.role !== 'admin') {
      console.log(`- ID: ${u.id} | Name: "${u.full_name}" | Email: "${u.email}" | Role: ${u.role} | Badge: ${u.badge_type} (${u.badge_color})`);
    }
  });
}

run();
