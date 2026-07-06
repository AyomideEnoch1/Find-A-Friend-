process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const fs = require('fs');
const path = require('path');

// Manually parse .env file
try {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim();
        process.env[key] = val;
      }
    });
  }
} catch (e) {
  console.warn('Could not read .env file:', e.message);
}

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vcbtvhociaioeyhhsczh.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('Error: EXPO_PUBLIC_SUPABASE_ANON_KEY is missing in env!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function simulate() {
  console.log('--- STARTING USER REGISTRATION & VERIFICATION SIMULATION ---');

  // Generate a unique test email
  const testEmail = `simulated_${Math.random().toString(36).substring(7)}@lasu.edu.ng`;
  const testPassword = 'Password123!';

  console.log(`[1/5] Registering new user auth session for: ${testEmail}...`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  });

  if (signUpError) {
    console.error('❌ Sign Up Failed:', signUpError.message);
    return;
  }

  const user = signUpData.user;
  if (!user) {
    console.error('❌ No user returned from signup!');
    return;
  }
  console.log(`✅ User registered successfully. UUID: ${user.id}`);

  // Fetch universities to link a valid one
  console.log('[2/5] Fetching registered universities...');
  const { data: unis, error: uniError } = await supabase
    .from('universities')
    .select('id, name, domain')
    .limit(5);

  if (uniError || !unis || unis.length === 0) {
    console.error('❌ Failed to fetch universities:', uniError?.message || 'Empty table');
    return;
  }

  // Find university matching the email domain
  const matchedUni = unis.find(u => testEmail.endsWith(u.domain)) || unis[0];
  console.log(`✅ Using university: ${matchedUni.name} (ID: ${matchedUni.id})`);

  // Step 3: Onboarding
  console.log('[3/5] Simulating onboarding profile creation...');
  const { error: onboardingError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email,
      full_name: 'Simulated Test User',
      university_id: matchedUni.id,
      level: '200L',
      bio: 'This is a simulated bio for flow testing.',
      interests: ['Tech', 'Gaming', 'Music'],
      badge_type: 'guest',
      badge_color: '#ec4899',
    });

  if (onboardingError) {
    console.error('❌ Onboarding profile creation failed:', onboardingError.message);
    return;
  }
  console.log('✅ Onboarding profile saved successfully.');

  // Step 4: Complete Profile & ID Card Upload
  console.log('[4/5] Simulating Student ID Card upload to storage...');
  
  // A 1x1 transparent pixel GIF to act as mock image data
  const mockImageBase64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const buffer = Buffer.from(mockImageBase64, 'base64');
  const storagePath = `id-cards/${user.id}.gif`;

  const { error: uploadError } = await supabase.storage
    .from('id-cards')
    .upload(storagePath, buffer, {
      contentType: 'image/gif',
      upsert: true,
    });

  if (uploadError) {
    console.error('❌ Storage upload failed:', uploadError.message);
    return;
  }

  const { data: urlData } = supabase.storage
    .from('id-cards')
    .getPublicUrl(storagePath);
  
  const idCardUrl = urlData.publicUrl;
  console.log(`✅ ID Card uploaded successfully. Public URL: ${idCardUrl}`);

  console.log('[5/5] Updating profile with gender and ID card status...');
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      gender: 'male',
      id_card_url: idCardUrl,
      id_card_status: 'pending',
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('❌ Profile status update failed:', updateError.message);
    return;
  }
  console.log('✅ Profile updated. id_card_status is now: pending');

  // Verify the updated row
  console.log('\n--- VERIFICATION STATS ---');
  const { data: verifiedProfile, error: getError } = await supabase
    .from('profiles')
    .select('id, full_name, email, id_card_url, id_card_status, role, badge_type')
    .eq('id', user.id)
    .single();

  if (getError || !verifiedProfile) {
    console.error('❌ Failed to verify profile in database:', getError?.message);
    return;
  }

  console.log('Profile details in database:');
  console.log(` - ID: ${verifiedProfile.id}`);
  console.log(` - Name: ${verifiedProfile.full_name}`);
  console.log(` - Email: ${verifiedProfile.email}`);
  console.log(` - ID Card URL: ${verifiedProfile.id_card_url}`);
  console.log(` - ID Card Status: ${verifiedProfile.id_card_status}`);
  console.log(` - Role: ${verifiedProfile.role}`);
  console.log(` - Badge: ${verifiedProfile.badge_type}`);
  console.log('\n🎉 SIMULATION SUCCESS: All registration, onboarding, and ID card upload flows are verified and working smoothly!');
}

simulate().catch(console.error);
