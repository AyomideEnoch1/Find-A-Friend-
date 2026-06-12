const fs = require('fs');
const path = require('path');

const oldPath = path.join(__dirname, 'dist', 'assets', 'node_modules');
const newPath = path.join(__dirname, 'dist', 'assets', 'vendor');

if (fs.existsSync(oldPath)) {
  console.log('Renaming dist/assets/node_modules to dist/assets/vendor to bypass Vercel ignore rules...');
  if (fs.existsSync(newPath)) {
    fs.rmSync(newPath, { recursive: true, force: true });
  }
  fs.renameSync(oldPath, newPath);
  console.log('Successfully renamed assets folder!');
} else {
  console.log('dist/assets/node_modules not found. Skipping rename.');
}

const swPath = path.join(__dirname, 'dist', 'sw.js');
if (fs.existsSync(swPath)) {
  console.log('Injecting dynamic cache name into dist/sw.js...');
  let content = fs.readFileSync(swPath, 'utf8');
  content = content.replace(/const\s+CACHE_NAME\s*=\s*['"][^'"]+['"];/, `const CACHE_NAME = "faf-${Date.now()}";`);
  fs.writeFileSync(swPath, content, 'utf8');
  console.log('Successfully injected dynamic cache name!');
} else {
  console.log('dist/sw.js not found. Skipping cache name injection.');
}
