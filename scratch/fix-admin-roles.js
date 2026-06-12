const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vcbtvhociaioeyhhsczh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYnR2aG9jaWFpb2V5aGhzY3poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM2NzgzMCwiZXhwIjoyMDkxOTQzODMwfQ.LfxRzV3NOQIFdGcN0_OYkHplPVeGRe7sX-vn-qOpaU0',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  const admins = [
    {
      id: 'd37e0d67-9e83-4fd6-9ff9-78cf5aab4059',
      email: 'olugbodi13123@run.edu.ng',
      full_name: 'Ayomide Enoch'
    },
    {
      id: '872c8986-97ba-4c6f-900e-99b35592b3c0',
      email: 'ayomidenoch15@gmail.com',
      full_name: 'Ayomide Enoch'
    }
  ];

  for (const admin of admins) {
    console.log(`Processing admin: ${admin.email}`);

    // Update Auth app_metadata
    const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(admin.id, {
      app_metadata: {
        provider: 'email',
        providers: ['email'],
        dashboard_role: 'super_admin'
      }
    });

    if (authError) {
      console.error(`❌ Failed to update app_metadata for ${admin.email}:`, authError.message);
    } else {
      console.log(`✅ app_metadata updated for ${admin.email}:`, JSON.stringify(authData.user.app_metadata));
    }

    // Upsert into dashboard_users table
    const { data: dbData, error: dbError } = await supabase
      .from('dashboard_users')
      .upsert({
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        role: 'admin',
        share_percentage: 0
      })
      .select();

    if (dbError) {
      console.error(`❌ Failed to upsert ${admin.email} in dashboard_users:`, dbError.message);
    } else {
      console.log(`✅ dashboard_users table updated for ${admin.email}:`, JSON.stringify(dbData));
    }
  }
}

run();
