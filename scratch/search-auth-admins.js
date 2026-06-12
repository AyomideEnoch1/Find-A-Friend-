const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vcbtvhociaioeyhhsczh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYnR2aG9jaWFpb2V5aGhzY3poIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM2NzgzMCwiZXhwIjoyMDkxOTQzODMwfQ.LfxRzV3NOQIFdGcN0_OYkHplPVeGRe7sX-vn-qOpaU0',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  const targetEmails = ['olugbodi13123@run.edu.ng', 'ayomidenoch15@gmail.com'];
  let page = 1;
  let hasMore = true;

  console.log('Searching for target admins in Auth users...');

  while (hasMore) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: 50
    });

    if (error) {
      console.error('Error fetching page:', page, error);
      break;
    }

    if (users.length === 0) {
      hasMore = false;
      break;
    }

    users.forEach(u => {
      if (targetEmails.includes(u.email.toLowerCase())) {
        console.log(`Found! - ID: ${u.id} | Email: ${u.email} | AppMeta: ${JSON.stringify(u.app_metadata)}`);
      }
    });

    page++;
  }
  console.log('Search complete.');
}

run();
