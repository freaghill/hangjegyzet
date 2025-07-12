# Monitoring Setup Guide

## Overview

HangJegyzet.AI uses a comprehensive monitoring stack with OpenTelemetry, Prometheus metrics, and Sentry for error tracking.

## Components

### 1. Health Check Endpoints

- `/api/health` - Basic health check (returns 200 if healthy)
- `/api/health?detailed=true` - Detailed health information including all services
- `/api/health/live` - Kubernetes liveness probe
- `/api/health/ready` - Kubernetes readiness probe
- `/api/health/metrics` - Prometheus metrics endpoint

### 2. OpenTelemetry Integration

OpenTelemetry is automatically initialized on server startup via `instrumentation.ts`:

- Automatic HTTP instrumentation
- Custom metrics for business KPIs
- Prometheus exporter on port 9464
- Traces and spans for performance monitoring

### 3. Custom Metrics

#### Application Metrics
- `meetings_created_total` - Total number of meetings created
- `transcription_duration_seconds` - Histogram of transcription processing times
- `ai_processing_total` - Total AI processing requests
- `active_users` - Currently active users gauge

#### Business Metrics
- `revenue_total` - Total revenue counter
- `payments_total` - Total payment transactions
- `storage_usage_bytes` - Current storage usage

#### Queue Metrics
- `queue_jobs_total` - Total jobs processed
- `queue_job_duration_seconds` - Job processing duration
- Queue size per queue type (transcription, AI, export, email)

### 4. Sentry Error Tracking

Configured in `sentry.*.config.ts` files:
- Automatic error capture
- Performance monitoring
- Session replay (10% sample rate)
- User context injection
- Environment-specific configuration

## Monitoring Setup

### 1. Prometheus Setup

```bash
# docker-compose.yml addition
prometheus:
  image: prom/prometheus:latest
  ports:
    - "9090:9090"
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
    - prometheus_data:/prometheus
  command:
    - '--config.file=/etc/prometheus/prometheus.yml'
    - '--storage.tsdb.path=/prometheus'
```

Create `prometheus.yml`:
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'hangjegyzet-app'
    static_configs:
      - targets: ['app:9464']  # OpenTelemetry metrics
      - targets: ['app:3000']  # App metrics endpoint
    metrics_path: '/api/health/metrics'
```

### 2. Grafana Setup

```bash
# docker-compose.yml addition
grafana:
  image: grafana/grafana:latest
  ports:
    - "3001:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
  volumes:
    - grafana_data:/var/lib/grafana
```

### 3. Production Deployment

For Hetzner VPS deployment:

```bash
# Install monitoring stack
docker-compose up -d prometheus grafana

# Configure Nginx reverse proxy
location /metrics {
    auth_basic "Metrics";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://localhost:9464/metrics;
}
```

## Admin Dashboard

Access the monitoring dashboard at `/admin/monitoring` which provides:

- Real-time system health status
- Service availability checks
- Queue status and metrics
- External service monitoring
- Detailed error information

## Alerting Setup

### 1. Create Alert Rules

Add to `prometheus.yml`:
```yaml
rule_files:
  - 'alerts.yml'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

Create `alerts.yml`:
```yaml
groups:
  - name: hangjegyzet
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected
          
      - alert: TranscriptionQueueBacklog
        expr: queue_size{queue_name="transcription"} > 100
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: Transcription queue backlog
          
      - alert: DatabaseConnectionPool
        expr: database_connections{state="active"} / database_connections{state="total"} > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: Database connection pool near capacity
```

### 2. Configure Alertmanager

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'email-notifications'

receivers:
  - name: 'email-notifications'
    email_configs:
      - to: 'alerts@hangjegyzet.hu'
        from: 'monitoring@hangjegyzet.hu'
        smarthost: 'smtp.example.com:587'
        auth_username: 'monitoring@hangjegyzet.hu'
        auth_password: 'password'
```

## Monitoring Best Practices

1. **Regular Health Checks**
   - Monitor `/api/health` endpoint every 30 seconds
   - Set up uptime monitoring (e.g., Uptime Kuma)

2. **Log Aggregation**
   - Use structured logging with correlation IDs
   - Aggregate logs to a central location
   - Set up log-based alerts for critical errors

3. **Performance Baselines**
   - Establish normal response time ranges
   - Monitor transcription processing times by mode
   - Track queue processing rates

4. **Capacity Planning**
   - Monitor storage usage trends
   - Track concurrent user peaks
   - Plan for 2x expected load

5. **Incident Response**
   - Document runbooks for common issues
   - Set up on-call rotation
   - Practice incident drills

## Troubleshooting

### High Memory Usage
```bash
# Check memory consumption by service
docker stats

# Analyze Node.js heap
node --inspect app.js
```

### Slow Queries
```sql
-- Check slow queries
SELECT query, calls, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

### Queue Backlogs
```bash
# Check queue status via API
curl http://localhost:3000/api/health?detailed=true | jq '.checks.queues'
```

## Integration with CI/CD

Add monitoring checks to deployment pipeline:

```yaml
# .github/workflows/deploy.yml
- name: Health Check
  run: |
    for i in {1..30}; do
      if curl -f http://app.hangjegyzet.hu/api/health; then
        echo "Health check passed"
        exit 0
      fi
      echo "Waiting for app to be healthy..."
      sleep 10
    done
    echo "Health check failed"
    exit 1
```

## Security Considerations

1. **Metrics Endpoint Protection**
   - Use basic auth for `/metrics` endpoint
   - Restrict access to monitoring dashboards
   - Use VPN for production access

2. **Sensitive Data**
   - Don't log sensitive user data
   - Mask email addresses in logs
   - Exclude auth tokens from error reports

3. **Rate Limiting**
   - Protect monitoring endpoints from abuse
   - Set reasonable scrape intervals
   - Use caching where appropriate