/**
 * Introspect Expo GraphQL schema for AndroidAppCredentials type
 */
const fs = require('fs');
const path = require('path');

const EXPO_API = 'https://api.expo.dev/graphql';

function getExpoSessionSecret() {
  const statePath = path.join(process.env.USERPROFILE || process.env.HOME, '.expo', 'state.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  return state?.auth?.sessionSecret;
}

async function graphql(query, variables, sessionSecret) {
  const res = await fetch(EXPO_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'expo-session': sessionSecret },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function introspect() {
  const sessionSecret = getExpoSessionSecret();

  // Introspect AndroidAppCredentials fields
  const result = await graphql(`
    {
      __type(name: "AndroidAppCredentials") {
        name
        fields {
          name
          type { name kind ofType { name kind } }
        }
      }
    }
  `, {}, sessionSecret);

  console.log('AndroidAppCredentials fields:');
  (result.data?.__type?.fields ?? []).forEach(f => {
    console.log(`  ${f.name}: ${f.type?.name || f.type?.ofType?.name || f.type?.kind}`);
  });

  // Also check mutation type for fcm-related mutations
  const mutResult = await graphql(`
    {
      __type(name: "AndroidAppCredentialsMutation") {
        name
        fields {
          name
          args { name type { name kind ofType { name } } }
        }
      }
    }
  `, {}, sessionSecret);

  console.log('\nAndroidAppCredentialsMutation fields:');
  (mutResult.data?.__type?.fields ?? []).forEach(f => {
    const args = f.args?.map(a => `${a.name}: ${a.type?.name || a.type?.ofType?.name || a.type?.kind}`).join(', ');
    console.log(`  ${f.name}(${args})`);
  });
}

introspect().catch(console.error);
