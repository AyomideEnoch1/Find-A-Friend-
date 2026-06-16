/**
 * download.js
 * Lightweight Node.js helper to download files over HTTPS.
 * Usage: node download.js <url> <dest-path>
 */
const https = require('https');
const fs = require('fs');

const url = process.argv[2];
const dest = process.argv[3];

if (!url || !dest) {
  console.error('Usage: node download.js <url> <dest-path>');
  process.exit(1);
}

console.log(`Downloading: ${url} -> ${dest}`);

const file = fs.createWriteStream(dest);

// Allow self-signed certificates if running in restricted environments
const options = {
  rejectUnauthorized: false
};

https.get(url, options, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Failed to download: Status Code ${response.statusCode}`);
    process.exit(1);
  }
  
  response.pipe(file);
  
  file.on('finish', () => {
    file.close();
    console.log('Download completed successfully.');
    process.exit(0);
  });
}).on('error', (err) => {
  fs.unlink(dest, () => {});
  console.error('Download error:', err.message);
  process.exit(1);
});
