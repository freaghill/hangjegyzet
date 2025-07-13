#!/bin/bash

# Initial Hetzner server setup script
set -e

echo "🖥️  Setting up Hetzner server for HangJegyzet.AI..."

# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y \
    docker.io \
    docker-compose \
    nginx \
    certbot \
    python3-certbot-nginx \
    git \
    curl \
    htop \
    fail2ban \
    ufw \
    postgresql-client

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Enable and configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# Configure fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Create application directory
mkdir -p /opt/hangjegyzet/{backups,uploads,ssl}
cd /opt/hangjegyzet

# Setup SSL with Let's Encrypt
read -p "Enter your domain (e.g., hangjegyzet.ai): " DOMAIN
read -p "Enter your email for SSL: " EMAIL

certbot certonly --standalone -d $DOMAIN -m $EMAIL --agree-tos -n

# Copy SSL certificates
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /opt/hangjegyzet/ssl/cert.pem
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /opt/hangjegyzet/ssl/key.pem

# Create .env.production template
cat > .env.production << EOF
# Database
DATABASE_URL=postgresql://postgres:CHANGE_ME@db:5432/hangjegyzet
DB_PASSWORD=CHANGE_ME

# Redis
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=CHANGE_ME

# Meilisearch
MEILISEARCH_HOST=http://meilisearch:7700
MEILISEARCH_MASTER_KEY=CHANGE_ME

# Next.js
NEXTAUTH_SECRET=CHANGE_ME
NEXTAUTH_URL=https://$DOMAIN

# AI Services
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DEEPGRAM_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Email
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Integrations
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=

# Sentry
SENTRY_DSN=
EOF

echo "⚠️  Please edit .env.production with your actual values!"

# Create backup script
cat > /opt/hangjegyzet/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/hangjegyzet/backups"
DB_CONTAINER="hangjegyzet-db-1"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
docker exec $DB_CONTAINER pg_dump -U postgres hangjegyzet > $BACKUP_DIR/db_$DATE.sql

# Uploads backup
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /opt/hangjegyzet/uploads

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/hangjegyzet/backup.sh

# Setup cron for backups
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/hangjegyzet/backup.sh >> /opt/hangjegyzet/backups/backup.log 2>&1") | crontab -

# Create monitoring script
cat > /opt/hangjegyzet/monitor.sh << 'EOF'
#!/bin/bash

# Check if services are running
check_service() {
    if docker ps | grep -q $1; then
        echo "✅ $1 is running"
    else
        echo "❌ $1 is down!"
        # Restart service
        docker-compose restart $2
    fi
}

check_service "hangjegyzet-app" "app"
check_service "hangjegyzet-db" "db"
check_service "hangjegyzet-redis" "redis"
check_service "hangjegyzet-meilisearch" "meilisearch"
check_service "hangjegyzet-worker" "worker"

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "⚠️  Disk usage is high: $DISK_USAGE%"
fi

# Check memory
MEM_USAGE=$(free | grep Mem | awk '{print ($3/$2) * 100.0}' | cut -d. -f1)
if [ $MEM_USAGE -gt 80 ]; then
    echo "⚠️  Memory usage is high: $MEM_USAGE%"
fi
EOF

chmod +x /opt/hangjegyzet/monitor.sh

# Add monitoring to cron
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/hangjegyzet/monitor.sh >> /opt/hangjegyzet/monitor.log 2>&1") | crontab -

# Create systemd service for auto-start
cat > /etc/systemd/system/hangjegyzet.service << EOF
[Unit]
Description=HangJegyzet.AI
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/hangjegyzet
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl enable hangjegyzet.service

echo "✅ Server setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit /opt/hangjegyzet/.env.production with your actual values"
echo "2. Copy your docker-compose.yml and other files to /opt/hangjegyzet/"
echo "3. Run 'docker-compose up -d' to start services"
echo "4. Check logs with 'docker-compose logs -f'"
echo ""
echo "SSL certificates will auto-renew via certbot"
echo "Backups run daily at 2 AM"
echo "Monitoring runs every 5 minutes"