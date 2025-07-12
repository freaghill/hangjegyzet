# PostgreSQL Hosting Cost Comparison

## Overview
Comparing PostgreSQL hosting options for HangJegyzet with estimated 500-1000 users.

## Database Requirements
- **Storage**: ~20GB (transcripts, metadata, user data)
- **Connections**: 50-100 concurrent
- **Backups**: Daily automated backups
- **High availability**: Not critical initially

## 1. Self-hosted on Hetzner (Current Plan)

### Costs
- **Included in CX41 server**: €39/month
- **No additional cost** - runs alongside app
- **Backup storage**: €0.05/GB = ~€1/month

### Pros
- ✅ No additional monthly cost
- ✅ Full control over configuration
- ✅ Low latency (same server)
- ✅ No connection limits
- ✅ Can optimize for specific needs

### Cons
- ❌ Manual backup management
- ❌ Manual security updates
- ❌ No automatic failover
- ❌ DIY monitoring

### Setup Requirements
```bash
# PostgreSQL 15 installation
sudo apt install postgresql-15 postgresql-contrib
# Automated backups with pg_dump
# Manual replication setup if needed
```

## 2. Supabase

### Costs (Pro Plan)
- **Monthly**: $25/month (~€23)
- **Includes**:
  - 8GB database
  - 250GB bandwidth
  - Unlimited API requests
  - Daily backups (7 days)

### Additional Costs
- **Extra storage**: $0.125/GB/month
- **For 20GB**: $25 + (12GB × $0.125) = $26.50/month (~€24.50)

### Pros
- ✅ Managed service
- ✅ Built-in auth
- ✅ Realtime subscriptions
- ✅ Automatic backups
- ✅ Dashboard & monitoring

### Cons
- ❌ Additional €24.50/month
- ❌ Vendor lock-in (auth system)
- ❌ Connection pooling required
- ❌ Bandwidth limits

## 3. Neon (Serverless Postgres)

### Costs (Pro Plan)
- **Monthly**: $19/month (~€17.50)
- **Includes**:
  - 50GB storage
  - 500 compute hours
  - Branching
  - Autoscaling

### Pros
- ✅ Serverless (scales to zero)
- ✅ Branching for dev/test
- ✅ Automatic scaling
- ✅ Good for variable load

### Cons
- ❌ Cold starts
- ❌ Limited regions
- ❌ Newer service
- ❌ Connection limits

## 4. DigitalOcean Managed Database

### Costs
- **Basic (1GB RAM, 1 vCPU)**: $15/month (~€14)
- **For production (2GB RAM)**: $30/month (~€28)
- **Includes**: 
  - Automated backups
  - High availability option
  - Monitoring

### Pros
- ✅ Simple pricing
- ✅ Good documentation
- ✅ Reliable service
- ✅ Easy scaling

### Cons
- ❌ More expensive than self-hosted
- ❌ Limited customization
- ❌ Network latency (different server)

## 5. AWS RDS

### Costs (db.t3.micro)
- **Monthly**: ~$15-20 for instance
- **Storage**: $0.115/GB/month
- **Total**: ~$25-30/month (~€23-28)
- **Plus**: Data transfer costs

### Pros
- ✅ Enterprise-grade
- ✅ Multi-AZ options
- ✅ Extensive monitoring
- ✅ AWS ecosystem

### Cons
- ❌ Complex pricing
- ❌ Overkill for small app
- ❌ AWS learning curve
- ❌ Hidden costs

## 6. Hetzner Cloud Managed Database (New!)

### Costs
- **PG-1 (1 vCPU, 2GB RAM)**: €15.50/month
- **PG-2 (2 vCPU, 4GB RAM)**: €31/month
- **Includes**: 
  - 60GB SSD storage
  - Daily backups
  - High availability

### Pros
- ✅ Same datacenter as app
- ✅ Simple pricing
- ✅ Good performance
- ✅ European company

### Cons
- ❌ Limited regions
- ❌ Newer service
- ❌ Less features than AWS/Supabase

## Cost Summary Table

| Provider | Monthly Cost | Setup Effort | Maintenance | Best For |
|----------|-------------|--------------|-------------|----------|
| **Self-hosted** | €0 (+€1 backup) | High | High | Cost-conscious, technical teams |
| **Supabase** | €24.50 | Low | None | Rapid development, built-in auth |
| **Neon** | €17.50 | Low | None | Variable load, serverless |
| **DigitalOcean** | €28 | Medium | Low | Simple, reliable hosting |
| **AWS RDS** | €23-28+ | High | Low | Enterprise, AWS users |
| **Hetzner Managed** | €15.50 | Low | None | Hetzner users, EU focus |

## Recommendation for HangJegyzet

### Start with Self-hosted (€0/month)
1. **Why**: You already have the server capacity
2. **Setup time**: 2-4 hours
3. **Automated backups**: Easy to configure
4. **Monitoring**: Use free tools (Prometheus/Grafana)

### Migration Path
When you reach 1000+ active users or €5000 MRR:
1. **First choice**: Hetzner Managed Database (€15.50/month)
   - Same datacenter = low latency
   - Simple migration
   - Managed backups

2. **Alternative**: Neon (€17.50/month)
   - If you need serverless features
   - Better for spiky traffic

### Backup Strategy for Self-hosted
```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="hangjegyzet"

# Create backup
pg_dump $DB_NAME | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

# Upload to object storage (optional)
# rclone copy $BACKUP_DIR/backup_$TIMESTAMP.sql.gz remote:backups/
```

### Monitoring Setup
```yaml
# docker-compose.yml addition
postgres_exporter:
  image: prometheuscommunity/postgres-exporter
  environment:
    DATA_SOURCE_NAME: "postgresql://user:password@localhost:5432/hangjegyzet"
  ports:
    - 9187:9187
```

## Conclusion

**For launch**: Use self-hosted PostgreSQL (€0/month additional)
- You save €200-300/year
- Performance will be excellent (same server)
- 2-4 hours setup is worth the savings

**When to switch**: 
- If maintenance takes >2 hours/month
- If you need automatic failover
- When revenue > €5000 MRR

The €15-30/month for managed database only makes sense when your time is more valuable than the cost savings.