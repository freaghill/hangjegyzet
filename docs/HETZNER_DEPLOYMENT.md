# Hetzner Deployment Guide

## Server Configuration

**Server**: Hetzner CX41  
**Specs**: 8 vCPU, 16GB RAM, 160GB NVMe  
**Location**: Helsinki, Finland (optimal for Hungary)  
**Cost**: €39/month  
**OS**: Ubuntu 22.04 LTS

## Initial Server Setup

```bash
# 1. SSH into your new server
ssh root@your-server-ip

# 2. Update system
apt update && apt upgrade -y

# 3. Create application user
adduser hangjegyzet
usermod -aG sudo hangjegyzet

# 4. Set up SSH key for hangjegyzet user
su - hangjegyzet
mkdir ~/.ssh
chmod 700 ~/.ssh
# Add your public key to ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# 5. Secure SSH
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

## Install Required Software

```bash
# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL 15
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo tee /etc/apt/trusted.gpg.d/pgdg.asc &>/dev/null
sudo apt update
sudo apt install postgresql-15 postgresql-client-15 -y

# Redis
sudo apt install redis-server -y
sudo systemctl enable redis-server

# Nginx
sudo apt install nginx -y

# PM2
sudo npm install -g pm2

# Other utilities
sudo apt install git htop ncdu certbot python3-certbot-nginx -y
```

## PostgreSQL Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE USER hangjegyzet WITH PASSWORD 'your-secure-password';
CREATE DATABASE hangjegyzet_production OWNER hangjegyzet;
GRANT ALL PRIVILEGES ON DATABASE hangjegyzet_production TO hangjegyzet;

# Enable required extensions
\c hangjegyzet_production
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
\q

# Configure PostgreSQL for performance
sudo nano /etc/postgresql/15/main/postgresql.conf
```

Add these settings:
```conf
# Memory (for 16GB RAM server)
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 64MB
maintenance_work_mem = 1GB

# Connections
max_connections = 200

# Write performance
wal_buffers = 16MB
checkpoint_completion_target = 0.9
random_page_cost = 1.1

# Enable query stats
shared_preload_libraries = 'pg_stat_statements'
```

## Redis Configuration

```bash
sudo nano /etc/redis/redis.conf
```

Update:
```conf
# Memory limit
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Security
requirepass your-redis-password
```

## Application Setup

```bash
# Clone repository
cd /home/hangjegyzet
git clone https://github.com/yourusername/hangjegyzet-app.git
cd hangjegyzet-app

# Install dependencies
npm install

# Create .env.production
nano .env.production
```

Add environment variables:
```env
# Database
DATABASE_URL="postgresql://hangjegyzet:your-secure-password@localhost:5432/hangjegyzet_production"

# Redis
REDIS_URL="redis://:your-redis-password@localhost:6379"

# Supabase (self-hosted)
NEXT_PUBLIC_SUPABASE_URL="https://api.hangjegyzet.hu"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-key"

# API Keys
OPENAI_API_KEY="your-openai-key"
ANTHROPIC_API_KEY="your-anthropic-key"

# App
NEXTAUTH_URL="https://hangjegyzet.hu"
NEXTAUTH_SECRET="your-secret-key"

# Storage
UPLOAD_DIR="/var/hangjegyzet/uploads"
```

## Build and Deploy

```bash
# Build application
npm run build

# Run database migrations
npm run migrate:production

# Set up PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'hangjegyzet',
      script: 'npm',
      args: 'start',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/hangjegyzet/error.log',
      out_file: '/var/log/hangjegyzet/out.log',
      log_file: '/var/log/hangjegyzet/combined.log',
      time: true
    },
    {
      name: 'hangjegyzet-worker',
      script: 'npm',
      args: 'run worker',
      instances: 1,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
```

## Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/hangjegyzet
```

```nginx
server {
    server_name hangjegyzet.hu www.hangjegyzet.hu;
    
    client_max_body_size 2G;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/hangjegyzet /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL Setup

```bash
sudo certbot --nginx -d hangjegyzet.hu -d www.hangjegyzet.hu
```

## Monitoring Setup

```bash
# Install Netdata
wget -O /tmp/netdata-kickstart.sh https://my-netdata.io/kickstart.sh
sh /tmp/netdata-kickstart.sh

# Access at: http://your-server-ip:19999
```

## Backup Configuration

Create `/home/hangjegyzet/backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/hangjegyzet"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
PGPASSWORD="your-secure-password" pg_dump -U hangjegyzet -h localhost hangjegyzet_production | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/hangjegyzet/uploads

# Keep only last 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

# Optional: Upload to S3/B2
# aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz s3://your-backup-bucket/
```

Add to crontab:
```bash
crontab -e
# Add: 0 3 * * * /home/hangjegyzet/backup.sh
```

## Security Hardening

```bash
# Firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban

# Automatic updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Performance Tuning

```bash
# Increase file limits
sudo nano /etc/security/limits.conf
# Add:
# hangjegyzet soft nofile 65536
# hangjegyzet hard nofile 65536

# Tune kernel
sudo nano /etc/sysctl.conf
# Add:
# net.core.somaxconn = 65536
# net.ipv4.tcp_max_syn_backlog = 65536
# net.ipv4.ip_local_port_range = 1024 65535

sudo sysctl -p
```

## Deployment Script

Create `/home/hangjegyzet/deploy.sh`:
```bash
#!/bin/bash
cd /home/hangjegyzet/hangjegyzet-app

# Pull latest code
git pull origin main

# Install dependencies
npm ci

# Build
npm run build

# Run migrations
npm run migrate:production

# Restart services
pm2 reload hangjegyzet
pm2 reload hangjegyzet-worker

echo "Deployment complete!"
```

## Monitoring Checklist

Daily:
- [ ] Check Netdata dashboard
- [ ] Review PM2 logs: `pm2 logs`
- [ ] Check disk space: `df -h`
- [ ] Review error logs: `/var/log/hangjegyzet/error.log`

Weekly:
- [ ] Review backup logs
- [ ] Check for system updates
- [ ] Review PostgreSQL slow queries
- [ ] Analyze Redis memory usage

## Troubleshooting

```bash
# Check application logs
pm2 logs hangjegyzet

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check system resources
htop
ncdu /

# Restart everything
pm2 restart all
sudo systemctl restart postgresql
sudo systemctl restart redis
sudo systemctl restart nginx
```

---

*Remember: This is a production server. Always test changes locally first!*