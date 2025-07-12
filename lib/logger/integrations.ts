// Integrations with external services for log aggregation

import { log } from './index'

// Sentry integration for error tracking
export function initSentryIntegration(): void {
  if (process.env.SENTRY_DSN) {
    // Note: Sentry should be initialized in the app, this just adds breadcrumbs
    try {
      const Sentry = require('@sentry/nextjs')
      
      // Add Winston logs as Sentry breadcrumbs
      log.on('data', (info: any) => {
        if (info.level === 'error' || info.level === 'warn') {
          Sentry.addBreadcrumb({
            message: info.message,
            level: info.level === 'error' ? 'error' : 'warning',
            category: 'logger',
            data: info,
            timestamp: Date.now() / 1000,
          })
        }
      })
      
      log.info('Sentry integration initialized for logging')
    } catch (error) {
      log.warn('Failed to initialize Sentry integration', { error })
    }
  }
}

// Datadog integration
export function initDatadogIntegration(): void {
  if (process.env.DD_API_KEY) {
    try {
      const tracer = require('dd-trace')
      
      // Add trace ID to all logs
      log.defaultMeta = {
        ...log.defaultMeta,
        dd: {
          trace_id: () => tracer.scope().active()?.context()?.toTraceId(),
          span_id: () => tracer.scope().active()?.context()?.toSpanId(),
        },
      }
      
      log.info('Datadog integration initialized for logging')
    } catch (error) {
      log.warn('Failed to initialize Datadog integration', { error })
    }
  }
}

// Elasticsearch integration for log aggregation
export function initElasticsearchIntegration(): void {
  if (process.env.ELASTICSEARCH_URL) {
    try {
      const { Client } = require('@elastic/elasticsearch')
      const client = new Client({ node: process.env.ELASTICSEARCH_URL })
      
      // Buffer logs and send in batches
      const logBuffer: any[] = []
      const BATCH_SIZE = 100
      const FLUSH_INTERVAL = 5000 // 5 seconds
      
      // Add custom transport
      const ElasticsearchTransport = require('winston-elasticsearch')
      const esTransport = new ElasticsearchTransport({
        client,
        index: `logs-${process.env.NODE_ENV}-${new Date().toISOString().slice(0, 10)}`,
        level: 'info',
        bufferLimit: BATCH_SIZE,
        flushInterval: FLUSH_INTERVAL,
        transformer: (logData: any) => {
          return {
            '@timestamp': logData.timestamp || new Date().toISOString(),
            severity: logData.level,
            message: logData.message,
            fields: logData.meta,
            service: logData.service || 'hangjegyzet-api',
            environment: process.env.NODE_ENV,
          }
        },
      })
      
      log.add(esTransport)
      log.info('Elasticsearch integration initialized for logging')
    } catch (error) {
      log.warn('Failed to initialize Elasticsearch integration', { error })
    }
  }
}

// Slack integration for critical alerts
export function initSlackIntegration(): void {
  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      const axios = require('axios')
      const webhookUrl = process.env.SLACK_WEBHOOK_URL
      
      // Send critical errors to Slack
      log.on('data', async (info: any) => {
        if (info.level === 'error' && info.critical) {
          try {
            await axios.post(webhookUrl, {
              text: `🚨 Critical Error in ${process.env.NODE_ENV}`,
              attachments: [
                {
                  color: 'danger',
                  fields: [
                    {
                      title: 'Error',
                      value: info.message,
                      short: false,
                    },
                    {
                      title: 'Service',
                      value: info.service || 'Unknown',
                      short: true,
                    },
                    {
                      title: 'Environment',
                      value: process.env.NODE_ENV,
                      short: true,
                    },
                    {
                      title: 'Timestamp',
                      value: new Date(info.timestamp).toISOString(),
                      short: true,
                    },
                  ],
                },
              ],
            })
          } catch (error) {
            // Don't log errors about logging to avoid infinite loops
            console.error('Failed to send Slack notification:', error)
          }
        }
      })
      
      log.info('Slack integration initialized for critical alerts')
    } catch (error) {
      log.warn('Failed to initialize Slack integration', { error })
    }
  }
}

// CloudWatch integration for AWS
export function initCloudWatchIntegration(): void {
  if (process.env.AWS_REGION && process.env.CLOUDWATCH_LOG_GROUP) {
    try {
      const WinstonCloudWatch = require('winston-cloudwatch')
      
      const cloudWatchTransport = new WinstonCloudWatch({
        logGroupName: process.env.CLOUDWATCH_LOG_GROUP,
        logStreamName: `${process.env.NODE_ENV}-${new Date().toISOString().slice(0, 10)}`,
        awsRegion: process.env.AWS_REGION,
        jsonMessage: true,
        retentionInDays: 30,
        uploadRate: 2000, // 2 seconds
        errorHandler: (err: Error) => {
          console.error('CloudWatch logging error:', err)
        },
      })
      
      log.add(cloudWatchTransport)
      log.info('CloudWatch integration initialized for logging')
    } catch (error) {
      log.warn('Failed to initialize CloudWatch integration', { error })
    }
  }
}

// Prometheus metrics from logs
export function initPrometheusIntegration(): void {
  if (process.env.ENABLE_PROMETHEUS_METRICS) {
    try {
      const client = require('prom-client')
      const register = new client.Registry()
      
      // Create metrics from logs
      const logCounter = new client.Counter({
        name: 'app_logs_total',
        help: 'Total number of log entries',
        labelNames: ['level', 'service'],
        registers: [register],
      })
      
      const errorCounter = new client.Counter({
        name: 'app_errors_total',
        help: 'Total number of errors logged',
        labelNames: ['type', 'service'],
        registers: [register],
      })
      
      // Update metrics on log events
      log.on('data', (info: any) => {
        logCounter.inc({
          level: info.level,
          service: info.service || 'unknown',
        })
        
        if (info.level === 'error') {
          errorCounter.inc({
            type: info.error?.name || 'unknown',
            service: info.service || 'unknown',
          })
        }
      })
      
      // Export metrics endpoint
      global.prometheusRegister = register
      
      log.info('Prometheus integration initialized for metrics')
    } catch (error) {
      log.warn('Failed to initialize Prometheus integration', { error })
    }
  }
}

// Initialize all integrations
export function initializeLogIntegrations(): void {
  // Only initialize in production
  if (process.env.NODE_ENV === 'production') {
    initSentryIntegration()
    initDatadogIntegration()
    initElasticsearchIntegration()
    initSlackIntegration()
    initCloudWatchIntegration()
    initPrometheusIntegration()
  }
}