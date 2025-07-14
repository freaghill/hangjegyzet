#!/usr/bin/env node

/**
 * Smoke tests for production/staging deployments
 * Usage: node scripts/smoke-tests.js [production|staging]
 */

const https = require('https');
const http = require('http');

const environment = process.argv[2] || 'staging';

const config = {
  production: {
    baseUrl: 'https://hangjegyzet.hu',
    healthEndpoint: '/api/health',
    expectedVersion: process.env.EXPECTED_VERSION || '1.0.0'
  },
  staging: {
    baseUrl: 'https://staging.hangjegyzet.hu',
    healthEndpoint: '/api/health',
    expectedVersion: process.env.EXPECTED_VERSION || '1.0.0'
  }
};

const currentConfig = config[environment];

if (!currentConfig) {
  console.error(`Invalid environment: ${environment}. Use 'production' or 'staging'`);
  process.exit(1);
}

// Test functions
async function checkEndpoint(path, expectedStatus = 200) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, currentConfig.baseUrl);
    const protocol = url.protocol === 'https:' ? https : http;
    
    console.log(`Testing ${url.href}...`);
    
    const req = protocol.get(url.href, (res) => {
      if (res.statusCode === expectedStatus) {
        console.log(`✅ ${path} - Status: ${res.statusCode}`);
        resolve(true);
      } else {
        console.error(`❌ ${path} - Expected: ${expectedStatus}, Got: ${res.statusCode}`);
        reject(new Error(`Unexpected status code: ${res.statusCode}`));
      }
    });
    
    req.on('error', (error) => {
      console.error(`❌ ${path} - Error: ${error.message}`);
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function checkHealthEndpoint() {
  return new Promise((resolve, reject) => {
    const url = new URL(currentConfig.healthEndpoint, currentConfig.baseUrl);
    const protocol = url.protocol === 'https:' ? https : http;
    
    console.log(`Testing health endpoint ${url.href}...`);
    
    const req = protocol.get(url.href, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const health = JSON.parse(data);
          
          if (health.status === 'healthy') {
            console.log('✅ Health check passed');
            console.log(`   Version: ${health.version}`);
            console.log(`   Database: ${health.checks.database.status}`);
            console.log(`   Supabase: ${health.checks.supabase.status}`);
            resolve(true);
          } else {
            console.error(`❌ Health check failed - Status: ${health.status}`);
            reject(new Error(`Unhealthy status: ${health.status}`));
          }
        } catch (error) {
          console.error('❌ Failed to parse health response');
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`❌ Health check error: ${error.message}`);
      reject(error);
    });
  });
}

async function runSmokeTests() {
  console.log(`🔥 Running smoke tests for ${environment} environment`);
  console.log(`Base URL: ${currentConfig.baseUrl}\n`);
  
  const tests = [
    // Basic endpoints
    () => checkEndpoint('/', 200),
    () => checkEndpoint('/login', 200),
    () => checkEndpoint('/api/health/live', 200),
    () => checkHealthEndpoint(),
    
    // API endpoints (should return 401 without auth)
    () => checkEndpoint('/api/meetings', 401),
    () => checkEndpoint('/api/teams', 401),
    () => checkEndpoint('/api/user', 401),
    
    // Static assets
    () => checkEndpoint('/favicon.ico', 200),
    
    // Non-existent page (should return 404)
    () => checkEndpoint('/this-page-does-not-exist', 404),
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (error) {
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.error('\n❌ Smoke tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All smoke tests passed!');
    process.exit(0);
  }
}

// Run tests
runSmokeTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});