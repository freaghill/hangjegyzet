# Hangjegyzet Deployment Recommendations

## Architecture Overview

### Local Development
- **Frontend**: Next.js on port 3000
- **WebSocket**: Port 3001
- **Database**: Local PostgreSQL
- **Redis**: Local Redis instance (optional)

### Staging Environment (staging.hangjegyzet.hu)
- **Hosting**: Hetzner Cloud (Germany) - Good balance of price/performance
- **Database**: Supabase (Free tier for staging)
- **Redis**: Upstash (Serverless Redis)
- **File Storage**: Hetzner Object Storage or Supabase Storage

### Production Environment
- **Hosting**: Hetzner Cloud (Germany) - GDPR compliance
- **Database**: Supabase Pro or self-hosted PostgreSQL on Hetzner
- **Redis**: Upstash or dedicated Redis instance
- **File Storage**: Hetzner Object Storage
- **CDN**: Cloudflare (Free tier)

## Hetzner Setup Recommendations

### Server Specifications

#### Staging (CX21)
- 2 vCPU
- 4 GB RAM
- 40 GB NVMe SSD
- €5.83/month
- Location: Nuremberg or Falkenstein

#### Production (CX31 or higher)
- 2 vCPU
- 8 GB RAM
- 80 GB NVMe SSD
- €11.19/month
- Can scale to CX41/CX51 as needed

### Services Setup

1. **Main Application Server**
   - Nginx as reverse proxy
   - PM2 for process management
   - Next.js app on port 3000
   - WebSocket server on port 3001

2. **Database**
   - Supabase (managed) OR
   - PostgreSQL on separate Hetzner instance

3. **Redis**
   - Upstash (serverless) for staging
   - Dedicated instance for production

4. **Object Storage**
   - Hetzner Object Storage for file uploads
   - €1.19/month per 10GB

## Deployment Process

### Staging Deployment
```bash
# 1. SSH to staging server
ssh root@staging.hangjegyzet.hu

# 2. Clone repository
git clone https://github.com/your-repo/hangjegyzet.git
cd hangjegyzet

# 3. Install dependencies
npm install

# 4. Build application
npm run build

# 5. Start with PM2
pm2 start npm --name "hangjegyzet" -- start
pm2 start npm --name "hangjegyzet-ws" -- run start:ws
```

### Production Deployment
- Use GitHub Actions for CI/CD
- Deploy on push to main branch
- Run tests before deployment
- Zero-downtime deployment with PM2

## Nginx Configuration

```nginx
server {
    listen 80;
    server_name staging.hangjegyzet.hu;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging.hangjegyzet.hu;

    ssl_certificate /etc/letsencrypt/live/staging.hangjegyzet.hu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.hangjegyzet.hu/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Environment Variables Management

### Staging
- Use `.env.staging` file
- Store secrets in Hetzner Cloud Secrets (when available) or encrypted

### Production
- Use environment variables
- Store in CI/CD secrets
- Never commit sensitive data

## Monitoring & Logging

1. **Application Monitoring**
   - Sentry for error tracking
   - Uptime monitoring with Uptime Robot

2. **Server Monitoring**
   - Hetzner monitoring
   - PM2 monitoring
   - Custom health checks

3. **Logs**
   - Centralized logging with PM2
   - Log rotation with logrotate

## Backup Strategy

1. **Database**
   - Daily automated backups
   - Store in Hetzner Object Storage
   - Keep 30 days of backups

2. **User Files**
   - Real-time sync to object storage
   - Weekly full backup

## Security Considerations

1. **Firewall**
   - UFW configuration
   - Only open necessary ports (80, 443, 22)

2. **SSL/TLS**
   - Let's Encrypt certificates
   - Auto-renewal with certbot

3. **Security Headers**
   - Implement all security headers
   - Use helmet.js in Next.js

## Scaling Strategy

### Horizontal Scaling
1. Start with single server
2. Add load balancer when needed
3. Scale application servers
4. Use managed database

### Vertical Scaling
1. CX21 → CX31 → CX41
2. Monitor resource usage
3. Scale before hitting limits

## Cost Estimation

### Staging (Monthly)
- Server (CX21): €5.83
- Object Storage: €1.19
- Supabase (Free tier): €0
- Total: ~€7/month

### Production (Monthly)
- Server (CX31): €11.19
- Database (Supabase Pro): €25
- Object Storage (100GB): €11.90
- Backup Storage: €5.95
- Total: ~€54/month

### Growth Budget
- Can handle ~1000 active users
- Scale to CX41 for 5000+ users
- Consider dedicated DB at 10,000+ users

## Payment Integration

### Barion
- Test environment for staging
- Production credentials for live
- Webhook endpoints configured

### SimplePay (Optional)
- As secondary payment option
- Hungarian market preference

## Recommended Timeline

1. **Week 1**: Set up staging environment
2. **Week 2**: Configure CI/CD pipeline
3. **Week 3**: Testing and optimization
4. **Week 4**: Production deployment

## Support & Maintenance

- Regular security updates
- Monthly performance reviews
- Quarterly dependency updates
- Annual infrastructure review