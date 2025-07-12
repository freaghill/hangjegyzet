# Staging Environment Setup Guide

This guide explains how to set up and maintain the staging environment for HangJegyzet.AI.

## Overview

The staging environment is a complete replica of production used for testing new features, updates, and integrations before deploying to production. It uses separate databases, API keys, and services to ensure isolation from production data.

## Infrastructure Requirements

### Server Specifications
- **VPS**: Hetzner CX31 (4 vCPU, 8GB RAM, 80GB NVMe)
- **Location**: Helsinki, Finland
- **OS**: Ubuntu 22.04 LTS
- **Domain**: staging.hangjegyzet.ai

### Services
- PostgreSQL 15 (separate database)
- Redis (separate database index)
- Nginx (reverse proxy)
- PM2 (process manager)
- SSL via Let's Encrypt

## Initial Setup

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y nodejs npm postgresql redis-server nginx certbot python3-certbot-nginx git

# Install PM2 globally
sudo npm install -g pm2

# Create deployment user
sudo adduser deploy
sudo usermod -aG sudo deploy
```

### 2. PostgreSQL Setup

```bash
# Create staging database and user
sudo -u postgres psql

CREATE DATABASE hangjegyzet_staging;
CREATE USER hangjegyzet_staging WITH ENCRYPTED PASSWORD 'your-staging-password';
GRANT ALL PRIVILEGES ON DATABASE hangjegyzet_staging TO hangjegyzet_staging;
\q
```

### 3. Redis Configuration

Edit `/etc/redis/redis.conf`:
```
# Use database 1 for staging (0 is for production)
databases 16
requirepass your-redis-password
```

### 4. Nginx Configuration

Create `/etc/nginx/sites-available/staging.hangjegyzet.ai`:

```nginx
server {
    listen 80;
    server_name staging.hangjegyzet.ai;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging.hangjegyzet.ai;

    ssl_certificate /etc/letsencrypt/live/staging.hangjegyzet.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.hangjegyzet.ai/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Main application
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket endpoint
    location /ws {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # File upload limits
    client_max_body_size 500M;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/staging.hangjegyzet.ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. SSL Certificate

```bash
sudo certbot --nginx -d staging.hangjegyzet.ai
```

## Environment Configuration

### 1. Copy Environment File

```bash
cp .env.staging.example .env.staging
```

### 2. Configure Services

Update `.env.staging` with:
- Staging Supabase project credentials
- Test Stripe API keys
- Test SimplePay credentials
- Staging email configuration
- Staging monitoring endpoints

### 3. Feature Flags

Enable/disable features for testing:
```env
NEXT_PUBLIC_FEATURE_REALTIME_TRANSCRIPTION=true
NEXT_PUBLIC_FEATURE_VOCABULARY_MANAGEMENT=true
NEXT_PUBLIC_FEATURE_TEAM_COLLABORATION=true
NEXT_PUBLIC_FEATURE_PHONE_DIAL_IN=false
```

## Deployment Process

### Manual Deployment

1. **Build locally**:
   ```bash
   npm run build
   ```

2. **Deploy to staging**:
   ```bash
   ./scripts/deploy-staging.sh
   ```

### Automated Deployment

Set up GitHub Actions for automatic staging deployment on push to `staging` branch:

```yaml
name: Deploy to Staging

on:
  push:
    branches: [ staging ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: ./scripts/deploy-staging.sh
```

## Database Management

### Migrations

Run migrations on staging:
```bash
npm run db:migrate:staging
```

### Seed Data

Load test data:
```bash
npm run db:seed:staging
```

### Backup

Daily automated backups:
```bash
pg_dump -U hangjegyzet_staging hangjegyzet_staging > backup-$(date +%Y%m%d).sql
```

## Monitoring

### Health Checks

- Application: https://staging.hangjegyzet.ai/api/health
- WebSocket: wss://staging.hangjegyzet.ai:3002/health

### Logs

View application logs:
```bash
pm2 logs hangjegyzet-staging
pm2 logs hangjegyzet-ws-staging
```

### Performance Monitoring

- PM2 monitoring: `pm2 monit`
- Server metrics: `htop`
- Database: `pg_stat_activity`

## Testing

### Smoke Tests

Run after deployment:
```bash
npm run test:staging
```

### Load Testing

Test with k6:
```bash
k6 run scripts/load-test-staging.js
```

### Security Testing

- SSL Labs: https://www.ssllabs.com/ssltest/analyze.html?d=staging.hangjegyzet.ai
- Security headers: https://securityheaders.com/?q=staging.hangjegyzet.ai

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - Check if PM2 processes are running: `pm2 list`
   - Check logs: `pm2 logs`

2. **Database Connection Failed**
   - Verify PostgreSQL is running: `sudo systemctl status postgresql`
   - Check credentials in `.env`

3. **WebSocket Connection Failed**
   - Verify WebSocket server is running: `pm2 status hangjegyzet-ws-staging`
   - Check Nginx WebSocket configuration

### Rollback Procedure

If deployment fails:
```bash
cd /var/www/staging.hangjegyzet.ai
mv current current-failed
mv backup-[timestamp] current
pm2 restart all
```

## Maintenance

### Regular Tasks

- **Weekly**: Clear old logs and temporary files
- **Monthly**: Update system packages
- **Quarterly**: Review and update SSL certificates

### Staging Reset

To reset staging to match production:
```bash
# Backup staging data
pg_dump -U hangjegyzet_staging hangjegyzet_staging > staging-backup.sql

# Copy production database (sanitized)
pg_dump -U hangjegyzet hangjegyzet | sed 's/production/staging/g' | psql -U hangjegyzet_staging hangjegyzet_staging

# Clear Redis
redis-cli -n 1 FLUSHDB
```

## Security Considerations

1. **Access Control**
   - Limit SSH access to specific IPs
   - Use SSH keys only (no passwords)
   - Regular security updates

2. **Data Protection**
   - Use test data only (no production data)
   - Sanitize any production data copies
   - Regular backup encryption

3. **API Keys**
   - Use test/sandbox API keys
   - Rotate keys quarterly
   - Monitor usage

## Contact

For issues or questions:
- Technical Lead: tech@hangjegyzet.ai
- DevOps: devops@hangjegyzet.ai
- Emergency: +36 XX XXX XXXX