#!/usr/bin/env node

/**
 * Smoke tests for production deployment
 * Run critical path tests to ensure the deployment is working
 */

const https = require('https');
const { URL } = require('url');

const environment = process.argv[2] || 'production';
const baseUrls = {
  production: 'https://hangjegyzet.hu',
  staging: 'https://staging.hangjegyzet.hu',
  local: 'http://localhost:3000'
};

const baseUrl = process.env.SMOKE_TEST_URL || baseUrls[environment];

console.log(`Running smoke tests against: ${baseUrl}`);

// Test endpoints
const endpoints = [
  { path: '/', expectedStatus: 200, description: 'Homepage' },
  { path: '/api/health', expectedStatus: 200, description: 'Health check' },
  { path: '/login', expectedStatus: 200, description: 'Login page' },
  { path: '/register', expectedStatus: 200, description: 'Registration page' },
  { path: '/pricing', expectedStatus: 200, description: 'Pricing page' },
  { path: '/api/auth/providers', expectedStatus: 200, description: 'Auth providers' },
];

// Test utilities
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const module = parsedUrl.protocol === 'https:' ? https : require('http');
    
    const req = module.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runTests() {
  const results = [];
  let passed = 0;
  let failed = 0;

  for (const endpoint of endpoints) {
    const url = `${baseUrl}${endpoint.path}`;
    const startTime = Date.now();
    
    try {
      const response = await makeRequest(url);
      const duration = Date.now() - startTime;
      
      if (response.status === endpoint.expectedStatus) {
        console.log(`✅ ${endpoint.description} - ${response.status} (${duration}ms)`);
        passed++;
        
        // Additional checks for specific endpoints
        if (endpoint.path === '/api/health') {
          const health = JSON.parse(response.data);
          if (health.status !== 'ok') {
            throw new Error(`Health check returned status: ${health.status}`);
          }
        }
      } else {
        console.error(`❌ ${endpoint.description} - Expected ${endpoint.expectedStatus}, got ${response.status}`);
        failed++;
      }
      
      results.push({
        endpoint: endpoint.path,
        description: endpoint.description,
        success: response.status === endpoint.expectedStatus,
        status: response.status,
        duration
      });
    } catch (error) {
      console.error(`❌ ${endpoint.description} - ${error.message}`);
      failed++;
      results.push({
        endpoint: endpoint.path,
        description: endpoint.description,
        success: false,
        error: error.message
      });
    }
  }

  // Performance check
  console.log('\n📊 Performance Summary:');
  const avgDuration = results
    .filter(r => r.duration)
    .reduce((sum, r) => sum + r.duration, 0) / results.filter(r => r.duration).length;
  
  console.log(`Average response time: ${Math.round(avgDuration)}ms`);
  
  if (avgDuration > 3000) {
    console.warn('⚠️  Warning: Average response time is above 3 seconds');
  }

  // Summary
  console.log('\n📋 Test Summary:');
  console.log(`Total tests: ${endpoints.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.error('\n❌ Smoke tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All smoke tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Smoke test runner failed:', error);
  process.exit(1);
});