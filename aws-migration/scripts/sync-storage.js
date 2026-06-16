/**
 * sync-storage.js
 * Programmatic Storage Bucket Synchronization (Supabase Storage -> AWS S3)
 *
 * This script runs locally. It:
 *   1. Reads credentials from the root .env file.
 *   2. Connects to the Supabase Storage HTTP API over IPv4.
 *   3. Recursively lists all files in the avatars, chat_files, and post_attachments buckets.
 *   4. Downloads each file locally and uploads it directly to your AWS S3 bucket using the AWS CLI.
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');
const { execSync } = require('child_process');

const AWS_S3_BUCKET_NAME = "faf-infra-prod-v2-appstoragebucket-prasmiamuew2";
const BUCKETS = ['avatars', 'chat_files', 'post_attachments'];

// 1. Read environment variables from .env
function loadEnv() {
  const envPath = path.join(__dirname, '../../.env');
  if (!fs.existsSync(envPath)) {
    console.error(`Error: .env file not found at ${envPath}`);
    process.exit(1);
  }
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      env[match[1]] = match[2].trim();
    }
  });
  return env;
}

const env = loadEnv();
const supabaseUrl = env['EXPO_PUBLIC_SUPABASE_URL'];
const supabaseAnonKey = env['EXPO_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set in .env');
  process.exit(1);
}

// 2. Helper to perform Supabase Storage API requests
async function apiRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(supabaseUrl + endpoint);
    const options = {
      method: method,
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// 3. Helper to recursively list files in a bucket
async function listFilesRecursively(bucket, folderPath = '') {
  let files = [];
  const body = {
    limit: 100,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' },
    prefix: folderPath
  };

  while (true) {
    const list = await apiRequest('POST', `/storage/v1/object/list/${bucket}`, body);
    if (!list || list.length === 0) break;

    for (const item of list) {
      const isFolder = !item.id && !item.metadata;
      const itemPath = folderPath ? `${folderPath}/${item.name}` : item.name;

      if (isFolder) {
        const subFiles = await listFilesRecursively(bucket, itemPath);
        files = files.concat(subFiles);
      } else {
        files.push(itemPath);
      }
    }

    if (list.length < body.limit) break;
    body.offset += body.limit;
  }

  return files;
}

// 4. Helper to download a file from Supabase
async function downloadFile(bucket, filePath) {
  return new Promise((resolve, reject) => {
    const encodedPath = encodeURIComponent(filePath).replace(/%2F/g, '/');
    const fileUrl = `${supabaseUrl}/storage/v1/object/authenticated/${bucket}/${encodedPath}`;
    const tempFilePath = path.join(os.tmpdir(), `faf_sync_${Date.now()}_${path.basename(filePath)}`);

    const options = {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    };

    https.get(fileUrl, options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed with HTTP ${res.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(tempFilePath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(tempFilePath);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// 5. Helper to upload to S3 using local AWS CLI
function uploadToS3(tempPath, bucket, filePath) {
  const awsCliPath = "C:\\Program Files\\Amazon\\AWSCLIV2\\aws.exe";
  const s3Uri = `s3://${AWS_S3_BUCKET_NAME}/${bucket}/${filePath}`;
  const cmd = `"${awsCliPath}" s3 cp "${tempPath}" "${s3Uri}" --no-verify-ssl`;
  execSync(cmd, { stdio: 'ignore' });
}

// Main execution function
async function main() {
  console.log('=================================================================');
  console.log('   Find-A-Friend: Replicating Storage Buckets to AWS S3');
  console.log('=================================================================');
  console.log(`Target S3 Bucket: ${AWS_S3_BUCKET_NAME}\n`);

  let totalFilesCount = 0;

  for (const bucket of BUCKETS) {
    console.log(`Processing bucket "${bucket}"...`);
    try {
      const files = await listFilesRecursively(bucket);
      console.log(`Found ${files.length} files in "${bucket}".`);
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        process.stdout.write(`  [${i + 1}/${files.length}] Synchronizing ${file}... `);
        
        try {
          // Download
          const tempPath = await downloadFile(bucket, file);
          
          // Upload
          uploadToS3(tempPath, bucket, file);
          
          // Cleanup
          fs.unlinkSync(tempPath);
          
          console.log('SUCCESS');
          totalFilesCount++;
        } catch (fileErr) {
          console.log(`FAILED (${fileErr.message})`);
        }
      }
    } catch (bucketErr) {
      console.warn(`Warning: Could not process bucket "${bucket}":`, bucketErr.message);
    }
    console.log('');
  }

  console.log('=================================================================');
  console.log(`   Storage synchronization completed successfully!`);
  console.log(`   Total files replicated: ${totalFilesCount}`);
  console.log('=================================================================');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
