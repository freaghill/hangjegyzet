#!/usr/bin/env tsx

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { log } from '@/lib/logger'

// Generate comprehensive performance report

async function generatePerformanceReport() {
  log.info('Generating performance report...')
  
  const reportsDir = join(process.cwd(), 'reports')
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true })
  }
  
  // Find the latest analysis file
  const analysisFiles = readdirSync(reportsDir)
    .filter(f => f.startsWith('performance-analysis-'))
    .sort((a, b) => b.localeCompare(a))
  
  if (analysisFiles.length === 0) {
    log.error('No performance analysis found. Run npm run performance:analyze first.')
    process.exit(1)
  }
  
  const latestAnalysis = JSON.parse(
    readFileSync(join(reportsDir, analysisFiles[0]), 'utf-8')
  )
  
  // Generate HTML report
  const htmlReport = generateHTMLReport(latestAnalysis)
  const htmlPath = join(reportsDir, 'performance-report.html')
  writeFileSync(htmlPath, htmlReport)
  
  // Generate Markdown report
  const mdReport = generateMarkdownReport(latestAnalysis)
  const mdPath = join(reportsDir, 'performance-report.md')
  writeFileSync(mdPath, mdReport)
  
  log.info('Performance reports generated', {
    html: htmlPath,
    markdown: mdPath,
  })
  
  console.log(`\nReports generated:`)
  console.log(`- HTML: ${htmlPath}`)
  console.log(`- Markdown: ${mdPath}`)
}

function generateHTMLReport(data: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Report - ${new Date(data.timestamp).toLocaleDateString()}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        h1 {
            margin: 0;
            color: #2c3e50;
        }
        .timestamp {
            color: #7f8c8d;
            font-size: 14px;
        }
        .section {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        h2 {
            color: #34495e;
            border-bottom: 2px solid #ecf0f1;
            padding-bottom: 10px;
        }
        .metric {
            display: inline-block;
            background: #f8f9fa;
            padding: 10px 20px;
            border-radius: 5px;
            margin: 5px;
        }
        .metric-label {
            font-size: 12px;
            color: #6c757d;
            display: block;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ecf0f1;
        }
        th {
            background: #f8f9fa;
            font-weight: 600;
        }
        .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 15px 0;
        }
        .success {
            background: #d4edda;
            border-left: 4px solid #28a745;
            padding: 15px;
            margin: 15px 0;
        }
        .error {
            background: #f8d7da;
            border-left: 4px solid #dc3545;
            padding: 15px;
            margin: 15px 0;
        }
        .chart {
            margin: 20px 0;
            height: 300px;
            background: #f8f9fa;
            border-radius: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6c757d;
        }
        .recommendations {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 20px;
            margin: 20px 0;
        }
        .recommendations h3 {
            margin-top: 0;
            color: #1976d2;
        }
        .recommendations ul {
            margin-bottom: 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Report</h1>
        <div class="timestamp">Generated on ${new Date(data.timestamp).toLocaleString()}</div>
    </div>

    <div class="section">
        <h2>Executive Summary</h2>
        <div class="metrics">
            <div class="metric">
                <span class="metric-label">Slow Queries</span>
                <span class="metric-value">${data.database?.slowQueries?.length || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Missing Indexes</span>
                <span class="metric-value">${data.database?.missingIndexes?.length || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Slow Endpoints</span>
                <span class="metric-value">${data.api?.slowEndpoints?.length || 0}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Avg Error Rate</span>
                <span class="metric-value">${calculateAvgErrorRate(data)}%</span>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Database Performance</h2>
        
        <h3>Slow Queries (>500ms)</h3>
        ${data.database?.slowQueries?.length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>Query</th>
                    <th>Calls</th>
                    <th>Avg Time (ms)</th>
                    <th>Max Time (ms)</th>
                </tr>
            </thead>
            <tbody>
                ${data.database.slowQueries.slice(0, 10).map((q: any) => `
                <tr>
                    <td><code>${truncate(q.query, 100)}</code></td>
                    <td>${q.calls}</td>
                    <td>${Math.round(q.mean_time)}</td>
                    <td>${Math.round(q.max_time)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : '<p class="success">No slow queries detected!</p>'}
        
        <h3>Table Sizes</h3>
        ${data.database?.tableSizes?.length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>Table</th>
                    <th>Size</th>
                    <th>Rows</th>
                </tr>
            </thead>
            <tbody>
                ${data.database.tableSizes.slice(0, 10).map((t: any) => `
                <tr>
                    <td>${t.table_name}</td>
                    <td>${t.size_pretty}</td>
                    <td>${t.row_count?.toLocaleString()}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : '<p>No table size data available</p>'}
    </div>

    <div class="section">
        <h2>API Performance</h2>
        
        <h3>Endpoint Statistics</h3>
        ${Object.keys(data.api?.endpoints || {}).length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>Endpoint</th>
                    <th>Calls</th>
                    <th>Avg (ms)</th>
                    <th>p95 (ms)</th>
                    <th>p99 (ms)</th>
                    <th>Success Rate</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(data.api.endpoints)
                    .filter(([_, stats]: any) => stats !== null)
                    .sort(([_, a]: any, [__, b]: any) => b.p95 - a.p95)
                    .slice(0, 20)
                    .map(([endpoint, stats]: any) => `
                <tr>
                    <td>${endpoint}</td>
                    <td>${stats.count}</td>
                    <td>${Math.round(stats.avgDuration)}</td>
                    <td class="${stats.p95 > 1000 ? 'warning' : ''}">${Math.round(stats.p95)}</td>
                    <td class="${stats.p99 > 2000 ? 'warning' : ''}">${Math.round(stats.p99)}</td>
                    <td>${stats.successRate.toFixed(1)}%</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : '<p>No API performance data available</p>'}
    </div>

    <div class="section">
        <h2>Load Test Results</h2>
        
        ${Object.entries(data.loadTests || {}).map(([test, results]: any) => `
        <h3>${test.replace('.json', '').replace('-', ' ').toUpperCase()}</h3>
        ${results?.summary ? `
        <div class="metrics">
            <div class="metric">
                <span class="metric-label">Total Requests</span>
                <span class="metric-value">${results.summary.total_requests?.toLocaleString() || 'N/A'}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Error Rate</span>
                <span class="metric-value ${results.summary.error_rate > 0.05 ? 'error' : ''}">${(results.summary.error_rate * 100).toFixed(2)}%</span>
            </div>
            <div class="metric">
                <span class="metric-label">p95 Response Time</span>
                <span class="metric-value">${results.summary.response_times?.p95 || results.summary.percentiles?.p95 || 'N/A'}ms</span>
            </div>
        </div>
        ` : '<p>No data available for this test</p>'}
        `).join('')}
    </div>

    <div class="section recommendations">
        <h3>Recommendations</h3>
        ${data.recommendations?.length > 0 ? `
        <ul>
            ${data.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
        </ul>
        ` : '<p>No specific recommendations at this time.</p>'}
    </div>
</body>
</html>
  `
}

function generateMarkdownReport(data: any): string {
  return `# Performance Report

Generated: ${new Date(data.timestamp).toLocaleString()}

## Executive Summary

- **Slow Queries**: ${data.database?.slowQueries?.length || 0}
- **Missing Indexes**: ${data.database?.missingIndexes?.length || 0}
- **Slow API Endpoints**: ${data.api?.slowEndpoints?.length || 0}
- **Average Error Rate**: ${calculateAvgErrorRate(data)}%

## Database Performance

### Slow Queries (>500ms)

${data.database?.slowQueries?.length > 0 ? 
`| Query | Calls | Avg Time (ms) | Max Time (ms) |
|-------|-------|---------------|---------------|
${data.database.slowQueries.slice(0, 10).map((q: any) => 
`| \`${truncate(q.query, 60)}\` | ${q.calls} | ${Math.round(q.mean_time)} | ${Math.round(q.max_time)} |`
).join('\n')}` 
: 'No slow queries detected! ✅'}

### Table Sizes

${data.database?.tableSizes?.length > 0 ?
`| Table | Size | Rows |
|-------|------|------|
${data.database.tableSizes.slice(0, 10).map((t: any) =>
`| ${t.table_name} | ${t.size_pretty} | ${t.row_count?.toLocaleString() || 'N/A'} |`
).join('\n')}`
: 'No table size data available'}

## API Performance

### Top Endpoints by p95 Latency

${Object.keys(data.api?.endpoints || {}).length > 0 ?
`| Endpoint | Calls | Avg (ms) | p95 (ms) | p99 (ms) | Success Rate |
|----------|-------|----------|----------|----------|--------------|
${Object.entries(data.api.endpoints)
  .filter(([_, stats]: any) => stats !== null)
  .sort(([_, a]: any, [__, b]: any) => b.p95 - a.p95)
  .slice(0, 15)
  .map(([endpoint, stats]: any) =>
`| ${endpoint} | ${stats.count} | ${Math.round(stats.avgDuration)} | ${Math.round(stats.p95)} | ${Math.round(stats.p99)} | ${stats.successRate.toFixed(1)}% |`
  ).join('\n')}`
: 'No API performance data available'}

## Load Test Results

${Object.entries(data.loadTests || {}).map(([test, results]: any) => `
### ${test.replace('.json', '').replace(/-/g, ' ').toUpperCase()}

${results?.summary ? `
- **Total Requests**: ${results.summary.total_requests?.toLocaleString() || 'N/A'}
- **Error Rate**: ${(results.summary.error_rate * 100).toFixed(2)}%
- **p95 Response Time**: ${results.summary.response_times?.p95 || results.summary.percentiles?.p95 || 'N/A'}ms
- **p99 Response Time**: ${results.summary.response_times?.p99 || results.summary.percentiles?.p99 || 'N/A'}ms
` : 'No data available for this test'}
`).join('\n')}

## Recommendations

${data.recommendations?.length > 0 ?
data.recommendations.map((rec: string, i: number) => `${i + 1}. ${rec}`).join('\n')
: 'No specific recommendations at this time.'}

## Next Steps

1. Review and prioritize the recommendations above
2. Create optimization tasks for slow queries and endpoints
3. Plan index creation based on missing index analysis
4. Consider caching strategies for frequently accessed data
5. Review application architecture for bottlenecks
6. Schedule regular performance testing (weekly/monthly)

---

*This report was automatically generated. For questions or concerns, contact the engineering team.*
`
}

function truncate(str: string, length: number): string {
  if (!str) return ''
  return str.length > length ? str.substring(0, length) + '...' : str
}

function calculateAvgErrorRate(data: any): string {
  const errorRates: number[] = []
  
  Object.values(data.loadTests || {}).forEach((test: any) => {
    if (test?.summary?.error_rate !== undefined) {
      errorRates.push(test.summary.error_rate)
    }
  })
  
  if (errorRates.length === 0) return '0.0'
  
  const avg = errorRates.reduce((a, b) => a + b, 0) / errorRates.length
  return (avg * 100).toFixed(2)
}

// Run report generation
generatePerformanceReport().catch(console.error)