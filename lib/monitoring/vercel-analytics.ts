// Custom event tracking
export interface CustomEvent {
  name: string
  properties?: Record<string, any>
}

// Track custom events
export function track(event: CustomEvent) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', event.name, event.properties)
  }
}

// Track page views
export function trackPageView(url: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID!, {
      page_path: url,
    })
  }
}

// Track errors
export function trackError(error: Error | string, context?: Record<string, any>) {
  const errorMessage = typeof error === 'string' ? error : error.message
  
  track({
    name: 'error',
    properties: {
      error_message: errorMessage,
      error_stack: typeof error === 'object' ? error.stack : undefined,
      ...context,
    },
  })
}

// Track performance metrics
export function trackPerformance(metric: {
  name: string
  value: number
  label?: string
}) {
  track({
    name: 'performance',
    properties: {
      metric_name: metric.name,
      metric_value: metric.value,
      metric_label: metric.label,
    },
  })
}

// Track user actions
export function trackAction(action: string, category: string, label?: string, value?: number) {
  track({
    name: action,
    properties: {
      event_category: category,
      event_label: label,
      value,
    },
  })
}

// Track business metrics
export function trackBusinessMetric(metric: {
  name: string
  value: number
  unit?: string
  metadata?: Record<string, any>
}) {
  track({
    name: 'business_metric',
    properties: {
      metric_name: metric.name,
      metric_value: metric.value,
      metric_unit: metric.unit,
      ...metric.metadata,
    },
  })
}

// Track conversion events
export function trackConversion(type: string, value?: number, metadata?: Record<string, any>) {
  track({
    name: 'conversion',
    properties: {
      conversion_type: type,
      conversion_value: value,
      ...metadata,
    },
  })
}