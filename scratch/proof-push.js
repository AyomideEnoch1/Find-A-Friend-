// scratch/proof-push.js
// Retrieves a push token and dispatches a test push notification to prove it works outside the app.

const SUPABASE_URL = 'https://vcbtvhociaioeyhhsczh.supabase.co';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYnR2aG9jaWFpb2V5aGhzY3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjc4MzAsImV4cCI6MjA5MTk0MzgzMH0.BqvLjyfeDnYBDtsY5OW_LtewCAUtO-twTIMvpjbDvRM';

async function testPush() {
  console.log('Fetching push tokens from Supabase...');
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?push_token=not.is.null&select=id,full_name,push_token&limit=1`,
    {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
    }
  );

  const profiles = await res.json();

  if (!profiles.length || !profiles[0].push_token) {
    console.log('⚠️ No push tokens found in the database. Open the app on a physical device, log in, and allow push notifications to register a token.');
    return;
  }

  const { full_name, push_token } = profiles[0];
  console.log(`Found registered push token for: ${full_name ?? 'User'}`);
  console.log(`Token: ${push_token}`);

  console.log('Sending push notification via Expo Push Notification API...');
  const pushRes = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      to: push_token,
      title: 'FAF Campus 🔔',
      body: 'Hello! This is a test notification confirming push alerts work outside the app.',
      sound: 'default',
      channelId: 'default',
      data: { route: '/notifications' },
    }),
  });

  const result = await pushRes.json();
  console.log('Expo API Response:', JSON.stringify(result, null, 2));

  if (result.data && result.data.status === 'ok') {
    console.log('✅ Success! The push notification has been queued by Expo and dispatched to FCM/APNs for delivery outside the app.');
  } else {
    console.log('❌ Failed to queue push notification.');
  }
}

testPush();
