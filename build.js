const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const staticFiles = [
  'index.html',
  'admin.html',
  'login.html',
  'styles.css',
  'script.js',
  'admin.js',
  'login.js',
  'firebase-config.js',
  'firebase-sdk.js'
];

for (const file of staticFiles) {
  const src = path.join(__dirname, file);
  const dest = path.join(publicDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

// Copy assets directories
['images', 'uploads'].forEach(dir => {
  const srcDir = path.join(__dirname, dir);
  const destDir = path.join(publicDir, dir);
  if (fs.existsSync(srcDir)) {
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.cpSync(srcDir, destDir, { recursive: true });
  }
});

console.log('✅ Build complete: Synced all latest assets into public/ for Vercel deployment.');
