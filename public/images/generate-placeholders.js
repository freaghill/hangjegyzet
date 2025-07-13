// Script to generate placeholder images
// Run with: node public/images/generate-placeholders.js

const fs = require('fs')
const path = require('path')

// 1x1 transparent PNG
const transparentPNG = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
  0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x62, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
])

// Generate SVG placeholders
const placeholders = {
  'placeholder.svg': `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="300" fill="#f3f4f6"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-family="system-ui" font-size="20">Kép betöltése...</text>
</svg>`,
  
  'default-avatar.svg': `<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="32" fill="#e5e7eb"/>
  <path d="M32 32c-5.5 0-10-4.5-10-10s4.5-10 10-10 10 4.5 10 10-4.5 10-10 10zm0 5c11 0 20 9 20 20H12c0-11 9-20 20-20z" fill="#9ca3af"/>
</svg>`,

  'meeting-placeholder.svg': `<svg width="640" height="360" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="360" fill="#1f2937"/>
  <rect x="280" y="150" width="80" height="60" rx="4" fill="#4b5563"/>
  <polygon points="380,180 420,160 420,200" fill="#4b5563"/>
  <text x="50%" y="70%" text-anchor="middle" fill="#9ca3af" font-family="system-ui" font-size="16">Nincs előnézet</text>
</svg>`,

  'waveform-placeholder.svg': `<svg width="800" height="128" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="128" fill="#f9fafb"/>
  <g stroke="#e5e7eb" stroke-width="2">
    ${Array.from({ length: 100 }, (_, i) => {
      const x = i * 8
      const height = Math.random() * 60 + 20
      const y = 64 - height / 2
      return `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + height}"/>`
    }).join('\n    ')}
  </g>
</svg>`
}

// Write files
Object.entries(placeholders).forEach(([filename, content]) => {
  fs.writeFileSync(path.join(__dirname, filename), content, 'utf8')
  console.log(`Generated ${filename}`)
})

// Also generate PNG versions for better compatibility
fs.writeFileSync(path.join(__dirname, 'placeholder.png'), transparentPNG)
fs.writeFileSync(path.join(__dirname, 'default-avatar.png'), transparentPNG)
fs.writeFileSync(path.join(__dirname, 'meeting-placeholder.png'), transparentPNG)

console.log('Placeholder images generated successfully!')