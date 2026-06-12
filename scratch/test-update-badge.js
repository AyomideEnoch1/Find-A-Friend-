const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vcbtvhociaioeyhhsczh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYnR2aG9jaWFpb2V5aGhzY3poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM2NzgzMCwiZXhwIjoyMDkxOTQzODMwfQ.LfxRzV3NOQIFdGcN0_OYkHplPVeGRe7sX-vn-qOpaU0',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function test() {
  console.log('Testing updating a profile badge...');
  
  // Let's find one student user in the profiles table
  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('role', 'student')
    .limit(1);

  if (fetchError || !profiles || profiles.length === 0) {
    console.error('Fetch error:', fetchError);
    return;
  }

  const testUser = profiles[0];
  console.log(`Test user selected: ${testUser.full_name} (${testUser.email}), ID: ${testUser.id}, Role: ${testUser.role}`);

  // Attempt to assign them a badge
  const { data, error } = await supabase
    .from('profiles')
    .update({
      badge_type: 'verified',
      badge_color: '#3b82f6'
    })
    .eq('id', testUser.id)
    .select();

  if (error) {
    console.error('❌ Update failed with error:', error);
  } else {
    console.log('✅ Update succeeded!', JSON.stringify(data, null, 2));
    
    // Revert the update so we don't mess up their profile
    await supabase
      .from('profiles')
      .update({
        badge_type: null,
        badge_color: null
      })
      .eq('id', testUser.id);
    console.log('Reverted test badge assignment.');
  }
}

test();
