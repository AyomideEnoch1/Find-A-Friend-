const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vcbtvhociaioeyhhsczh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYnR2aG9jaWFpb2V5aGhzY3poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM2NzgzMCwiZXhwIjoyMDkxOTQzODMwfQ.LfxRzV3NOQIFdGcN0_OYkHplPVeGRe7sX-vn-qOpaU0',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  console.log('--- Running Student Sync ---');
  const res1 = await supabase
    .from('profiles')
    .update({ badge_type: 'verified', badge_color: '#3b82f6' })
    .eq('role', 'student')
    .select('id, email, role, badge_type, badge_color');
  console.log('Student Sync Error:', res1.error);
  console.log('Student Sync Count:', res1.data ? res1.data.length : 0);

  console.log('\n--- Running Vendor Sync ---');
  const res2 = await supabase
    .from('profiles')
    .update({ badge_type: 'vendor', badge_color: '#f97316' })
    .eq('role', 'vendor')
    .select('id, email, role, badge_type, badge_color');
  console.log('Vendor Sync Error:', res2.error);
  console.log('Vendor Sync Count:', res2.data ? res2.data.length : 0);

  console.log('\n--- Running Guest Sync ---');
  const res3 = await supabase
    .from('profiles')
    .update({ badge_type: 'guest', badge_color: '#ec4899' })
    .eq('role', 'guest')
    .select('id, email, role, badge_type, badge_color');
  console.log('Guest Sync Error:', res3.error);
  console.log('Guest Sync Count:', res3.data ? res3.data.length : 0);

  console.log('\n--- Running Admin Sync ---');
  const res4 = await supabase
    .from('profiles')
    .update({ badge_type: 'official', badge_color: '#f59e0b' })
    .eq('role', 'admin')
    .select('id, email, role, badge_type, badge_color');
  console.log('Admin Sync Error:', res4.error);
  console.log('Admin Sync Count:', res4.data ? res4.data.length : 0);
}

run();
