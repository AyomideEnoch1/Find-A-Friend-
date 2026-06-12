/**
 * Upload FCM V1 Service Account JSON to Expo Push Credentials
 * Run: node upload-fcm-credentials.js
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'c91925a9-42d3-43de-bc48-1bd279422541';
const PACKAGE_NAME = 'com.ayomideenoch.faf';
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'firebase-service-account.json');
const EXPO_API = 'https://api.expo.dev/graphql';

function getExpoSessionSecret() {
  const statePath = path.join(process.env.USERPROFILE || process.env.HOME, '.expo', 'state.json');
  if (!fs.existsSync(statePath)) throw new Error('Not logged in. Run: eas login');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const secret = state?.auth?.sessionSecret;
  if (!secret) throw new Error('No session found. Run: eas login');
  return secret;
}

async function graphql(query, variables, sessionSecret) {
  const res = await fetch(EXPO_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'expo-session': sessionSecret },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map(e => e.message).join(', '));
  return json.data;
}

async function run() {
  console.log('🔥 Uploading FCM V1 Service Account to Expo...\n');

  // Load service account JSON
  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
  console.log('✅ Service account loaded');
  console.log('   Firebase project:', serviceAccount.project_id);
  console.log('   Client email:', serviceAccount.client_email);

  const sessionSecret = getExpoSessionSecret();
  console.log('✅ Expo session found\n');

  // Step 1: Get app + existing Android credentials
  console.log('Step 1: Looking up Android app credentials...');
  const appData = await graphql(`
    query {
      app {
        byId(appId: "${PROJECT_ID}") {
          id
          slug
          androidAppCredentials {
            id
            applicationIdentifier
            googleServiceAccountKeyForFcmV1 {
              id
              createdAt
            }
          }
        }
      }
    }
  `, {}, sessionSecret);

  const app = appData?.app?.byId;
  if (!app) throw new Error('App not found. Check PROJECT_ID.');
  console.log('   App:', app.slug);

  const existingCreds = app.androidAppCredentials ?? [];
  let androidAppCredentialId;
  const existingCred = existingCreds.find(c => c.applicationIdentifier === PACKAGE_NAME);

  if (existingCred) {
    androidAppCredentialId = existingCred.id;
    console.log('   Found existing Android credential:', androidAppCredentialId);
    if (existingCred.googleServiceAccountKeyForFcmV1) {
      console.log('   Existing FCM V1 key found, will replace it.');
    }
  } else {
    // Create new Android app credentials entry
    console.log('   Creating Android app credentials entry...');
    const createResult = await graphql(`
      mutation {
        androidAppCredentials {
          createAndroidAppCredentials(appId: "${app.id}", applicationIdentifier: "${PACKAGE_NAME}") {
            id
            applicationIdentifier
          }
        }
      }
    `, {}, sessionSecret);
    androidAppCredentialId = createResult?.androidAppCredentials?.createAndroidAppCredentials?.id;
    console.log('   Created:', androidAppCredentialId);
  }

  // Step 2: Upload the FCM V1 credential (service account JSON string)
  console.log('\nStep 2: Uploading FCM V1 credential...');
  const credentialJson = JSON.stringify(serviceAccount);

  const uploadResult = await graphql(`
    mutation UploadFcmV1($id: String!, $credential: String!) {
      androidAppCredentials {
        createFcmV1Credential(androidAppCredentialsId: $id, credential: $credential) {
          id
          applicationIdentifier
          googleServiceAccountKeyForFcmV1 {
            id
          }
        }
      }
    }
  `, {
    id: androidAppCredentialId,
    credential: credentialJson,
  }, sessionSecret);

  const updatedCred = uploadResult?.androidAppCredentials?.createFcmV1Credential;
  if (!updatedCred) throw new Error('Upload returned no result');

  console.log('\n🎉 FCM V1 credentials uploaded successfully!');
  console.log('   Android Credential ID:', updatedCred.id);
  console.log('   Package:', updatedCred.applicationIdentifier);
  console.log('   FCM V1 Key ID:', updatedCred.googleServiceAccountKeyForFcmV1?.id);
  console.log('\n✅ Push notifications will now work for all 3 users!');
  console.log('   No app rebuild required.');
}

run().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
