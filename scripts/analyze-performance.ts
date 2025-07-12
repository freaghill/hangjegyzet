#!/usr/bin/env tsx

import { DatabaseOptimizer } from '@/lib/performance/database-optimizer'
import { performanceMonitor } from '@/lib/performance/monitor'
import { log } from '@/lib/logger'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

// Performance analysis script

async function analyzePerformance() {
  log.info('Starting performance analysis...')
  
  const results: any = {
    timestamp: new Date().toISOString(),
    database: {},
    api: {},
    loadTests: {},
    recommendations: [],
  }
  
  try {
    // 1. Analyze database performance
    log.info('Analyzing database performance...')
    const dbOptimizer = new DatabaseOptimizer()
    
    results.database = {
      slowQueries: await dbOptimizer.analyzeSlowQueries(500),
      missingIndexes: await dbOptimizer.getMissingIndexes(),
      tableSizes: await dbOptimizer.getTableSizes(),
      queryStats: await dbOptimizer.getQueryStats(),
    }
    
    // 2. Analyze API performance (from logs/metrics)
    log.info('Analyzing API performance...')
    const apiMetrics = performanceMonitor.getAllStats()
    
    results.api = {
      endpoints: apiMetrics,
      slowEndpoints: Object.entries(apiMetrics)
        .filter(([_, stats]: any) => stats && stats.p95 > 1000)
        .map(([endpoint, stats]) => ({ endpoint, ...stats })),
    }
    
    // 3. Load test results
    log.info('Collecting load test results...')
    const loadTestDir = join(process.cwd(), 'reports')
    
    if (existsSync(loadTestDir)) {
      const files = ['smoke-test-summary.json', 'load-test-summary.json', 
                     'stress-test-summary.json', 'spike-test-summary.json']
      
      for (const file of files) {
        const path = join(loadTestDir, file)
        if (existsSync(path)) {
          try {
            results.loadTests[file] = JSON.parse(readFileSync(path, 'utf-8'))
          } catch (error) {
            log.warn(`Failed to read ${file}`, { error })
          }
        }
      }
    }
    
    // 4. Generate recommendations
    results.recommendations = generateRecommendations(results)
    
    // 5. Save results
    const outputPath = join(process.cwd(), 'reports', `performance-analysis-${Date.now()}.json`)
    writeFileSync(outputPath, JSON.stringify(results, null, 2))
    
    log.info('Performance analysis complete', { outputPath })
    
    // 6. Print summary
    printSummary(results)
    
  } catch (error) {
    log.error('Performance analysis failed', { error })
    process.exit(1)
  }
}

function generateRecommendations(results: any): string[] {
  const recommendations: string[] = []
  
  // Database recommendations
  if (results.database.slowQueries?.length > 0) {
    recommendations.push(
      `Found ${results.database.slowQueries.length} slow queries. Consider optimizing or adding indexes.`
    )
  }
  
  if (results.database.missingIndexes?.length > 0) {
    recommendations.push(
      `${results.database.missingIndexes.length} potential missing indexes identified.`
    )
  }
  
  // API recommendations
  const slowEndpoints = results.api.slowEndpoints || []
  if (slowEndpoints.length > 0) {
    recommendations.push(
      `${slowEndpoints.length} API endpoints have p95 latency > 1s. Consider optimization.`
    )
  }
  
  // Load test recommendations
  if (results.loadTests['stress-test-summary.json']) {
    const stressTest = results.loadTests['stress-test-summary.json']
    if (stressTest.summary?.error_rate > 0.05) {
      recommendations.push(
        'System shows high error rate under stress. Consider scaling or optimization.'
      )
    }
  }
  
  // Memory recommendations
  const memoryUsage = process.memoryUsage()
  if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.8) {
    recommendations.push(
      'High memory usage detected. Consider memory optimization or increasing limits.'
    )
  }
  
  return recommendations
}

function printSummary(results: any) {
  console.log('\n=== PERFORMANCE ANALYSIS SUMMARY ===\n')
  
  // Database summary
  console.log('DATABASE PERFORMANCE:')
  console.log(`- Slow queries: ${results.database.slowQueries?.length || 0}`)
  console.log(`- Missing indexes: ${results.database.missingIndexes?.length || 0}`)
  console.log(`- Largest tables: ${results.database.tableSizes?.slice(0, 3).map((t: any) => t.table_name).join(', ')}`)
  
  // API summary
  console.log('\nAPI PERFORMANCE:')
  console.log(`- Total endpoints analyzed: ${Object.keys(results.api.endpoints || {}).length}`)
  console.log(`- Slow endpoints (p95 > 1s): ${results.api.slowEndpoints?.length || 0}`)
  
  if (results.api.slowEndpoints?.length > 0) {
    console.log('  Top 3 slowest:')
    results.api.slowEndpoints.slice(0, 3).forEach((ep: any) => {
      console.log(`    - ${ep.endpoint}: p95=${ep.p95}ms`)
    })
  }
  
  // Load test summary
  console.log('\nLOAD TEST RESULTS:')
  Object.entries(results.loadTests).forEach(([test, data]: any) => {
    if (data?.summary) {
      console.log(`- ${test}:`)
      console.log(`    Error rate: ${(data.summary.error_rate * 100).toFixed(2)}%`)
      console.log(`    p95 latency: ${data.summary.response_times?.p95 || 'N/A'}ms`)
    }
  })
  
  // Recommendations
  console.log('\nRECOMMENDATIONS:')
  results.recommendations.forEach((rec: string, index: number) => {
    console.log(`${index + 1}. ${rec}`)
  })
  
  console.log('\n=== END OF SUMMARY ===\n')
}

// Run analysis
analyzePerformance().catch(console.error)