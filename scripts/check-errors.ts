#!/usr/bin/env tsx

import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'

const execAsync = promisify(exec)

async function checkErrors() {
  console.log('🔍 Checking for errors in the project...\n')

  // 1. Check if server is running
  try {
    await execAsync('curl -s http://localhost:3000/test')
    console.log('✅ Dev server is running')
  } catch {
    console.log('❌ Dev server is not running - start with: npm run dev')
  }

  // 2. Check for missing dependencies
  try {
    const { stdout } = await execAsync('npm ls --depth=0 2>&1 || true')
    const missing = stdout.match(/UNMET DEPENDENCY/g)
    if (missing) {
      console.log(`❌ Missing dependencies: ${missing.length}`)
      console.log('   Run: npm install')
    } else {
      console.log('✅ All dependencies installed')
    }
  } catch (error) {
    console.log('⚠️  Could not check dependencies')
  }

  // 3. Check for TypeScript errors in key files
  const keyFiles = [
    'app/layout.tsx',
    'app/page.tsx',
    'app/test/page.tsx',
    'lib/supabase/client.ts',
    'lib/supabase/server.ts',
  ]

  console.log('\n📝 Checking key files for TypeScript errors...')
  for (const file of keyFiles) {
    try {
      await fs.access(file)
      const { stderr } = await execAsync(`npx tsc --noEmit --skipLibCheck ${file} 2>&1`)
      if (stderr) {
        console.log(`❌ ${file}: Has errors`)
      } else {
        console.log(`✅ ${file}: OK`)
      }
    } catch {
      console.log(`⚠️  ${file}: File not found`)
    }
  }

  // 4. Check environment variables
  console.log('\n🔐 Checking environment variables...')
  
  // Load .env.local
  try {
    const envContent = await fs.readFile('.env.local', 'utf-8')
    const envVars = envContent.split('\n').filter(line => line && !line.startsWith('#'))
    console.log(`✅ Found ${envVars.length} environment variables in .env.local`)
  } catch {
    console.log('❌ No .env.local file found')
  }

  // 5. Check for common runtime errors
  console.log('\n🚨 Common issues to check:')
  console.log('- If using Supabase, ensure credentials are valid')
  console.log('- If seeing hydration errors, check for client/server mismatches')
  console.log('- For module not found errors, check imports and install missing packages')
  console.log('- For type errors, ensure @types packages are installed')

  console.log('\n📊 Summary:')
  console.log('- Run "npm run dev" to start the development server')
  console.log('- Visit http://localhost:3000/test to verify basic functionality')
  console.log('- Check browser console for client-side errors')
  console.log('- Check terminal for server-side errors')
}

checkErrors().catch(console.error)