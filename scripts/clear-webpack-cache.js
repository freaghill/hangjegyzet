#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const cacheDir = path.join(process.cwd(), '.next', 'cache');

console.log('Clearing webpack cache...');

if (fs.existsSync(cacheDir)) {
  fs.rmSync(cacheDir, { recursive: true, force: true });
  console.log('✓ Webpack cache cleared successfully');
} else {
  console.log('ℹ No webpack cache found');
}

// Also clear Next.js build cache
const buildDir = path.join(process.cwd(), '.next');
if (fs.existsSync(buildDir)) {
  console.log('Clearing Next.js build cache...');
  fs.rmSync(buildDir, { recursive: true, force: true });
  console.log('✓ Next.js build cache cleared successfully');
}

console.log('\nYou can now run your build command without cache issues.');
console.log('If you continue to see serialization warnings, set WEBPACK_DISABLE_FS_CACHE=true in your .env.local file.');