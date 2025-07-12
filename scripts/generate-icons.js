const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Base SVG icon (simple design - replace with your actual logo)
const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="100" fill="#2563eb"/>
  <g transform="translate(128, 128)">
    <!-- Microphone icon -->
    <path d="M128 0C110.3 0 96 14.3 96 32v96c0 17.7 14.3 32 32 32s32-14.3 32-32V32c0-17.7-14.3-32-32-32z" fill="white"/>
    <path d="M64 112v16c0 35.3 28.7 64 64 64s64-28.7 64-64v-16h-16v16c0 26.5-21.5 48-48 48s-48-21.5-48-48v-16H64z" fill="white"/>
    <path d="M120 208v32h16v-32h-16z" fill="white"/>
    <path d="M96 240h64v16H96v-16z" fill="white"/>
    <!-- AI dots -->
    <circle cx="200" cy="60" r="8" fill="#60a5fa"/>
    <circle cx="220" cy="80" r="8" fill="#60a5fa"/>
    <circle cx="200" cy="100" r="8" fill="#60a5fa"/>
  </g>
  <text x="256" y="420" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="white">HangJegyzet</text>
</svg>
`;

// Upload icon SVG
const uploadIcon = `
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <rect width="96" height="96" rx="20" fill="#2563eb"/>
  <path d="M48 20 L48 60 M30 40 L48 20 L66 40" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M20 70 L76 70" stroke="white" stroke-width="4" stroke-linecap="round"/>
</svg>
`;

// Meetings icon SVG
const meetingsIcon = `
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <rect width="96" height="96" rx="20" fill="#2563eb"/>
  <rect x="20" y="25" width="56" height="40" rx="4" fill="white"/>
  <circle cx="35" cy="45" r="8" fill="#2563eb"/>
  <circle cx="61" cy="45" r="8" fill="#2563eb"/>
  <path d="M35 45 L61 45" stroke="#2563eb" stroke-width="2"/>
</svg>
`;

async function generateIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  
  // Create base icon from SVG
  const svgBuffer = Buffer.from(svgIcon);
  
  for (const size of sizes) {
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(publicDir, `icon-${size}x${size}.png`));
      
      console.log(`✅ Generated icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Failed to generate icon-${size}x${size}.png:`, error);
    }
  }
  
  // Generate special icons
  try {
    // Apple touch icon
    await sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    console.log('✅ Generated apple-touch-icon.png');
    
    // Favicon
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon-32x32.png'));
    console.log('✅ Generated favicon-32x32.png');
    
    await sharp(svgBuffer)
      .resize(16, 16)
      .png()
      .toFile(path.join(publicDir, 'favicon-16x16.png'));
    console.log('✅ Generated favicon-16x16.png');
    
    // Generate favicon.ico (simplified)
    await sharp(svgBuffer)
      .resize(16, 16)
      .png()
      .toFile(path.join(publicDir, 'favicon.ico'));
    console.log('✅ Generated favicon.ico');
    
    // Generate shortcut icons
    await sharp(Buffer.from(uploadIcon))
      .resize(96, 96)
      .png()
      .toFile(path.join(publicDir, 'icon-upload.png'));
    console.log('✅ Generated icon-upload.png');
    
    await sharp(Buffer.from(meetingsIcon))
      .resize(96, 96)
      .png()
      .toFile(path.join(publicDir, 'icon-meetings.png'));
    console.log('✅ Generated icon-meetings.png');
    
  } catch (error) {
    console.error('❌ Failed to generate special icons:', error);
  }
}

// Run if called directly
if (require.main === module) {
  generateIcons().then(() => {
    console.log('✨ Icon generation complete!');
  }).catch(error => {
    console.error('Icon generation failed:', error);
    process.exit(1);
  });
}

module.exports = { generateIcons };