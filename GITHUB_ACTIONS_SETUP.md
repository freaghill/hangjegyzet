# 🚀 GitHub Actions Setup Guide

This guide ensures your GitHub Actions workflows run smoothly without failures.

## 📋 Required GitHub Secrets

Configure these secrets in your GitHub repository settings (Settings → Secrets and variables → Actions):

### 🔐 Core Secrets
```yaml
# Supabase
NEXT_PUBLIC_SUPABASE_URL        # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY       # Supabase service role key (keep secret!)

# Authentication
NEXTAUTH_SECRET                 # Random string for NextAuth
NEXTAUTH_URL                    # https://hangjegyzet.hu

# Database
DATABASE_URL                    # PostgreSQL connection string
DIRECT_URL                      # Direct PostgreSQL connection (for migrations)
```

### 💳 Payment Provider Secrets
```yaml
# Barion
BARION_WEBHOOK_SECRET          # Generate with: openssl rand -hex 32
BARION_POS_KEY                 # From Barion dashboard
BARION_PAYEE_EMAIL             # Your Barion account email
BARION_ENVIRONMENT             # 'test' or 'production'

# SimplePay
SIMPLEPAY_MERCHANT             # Merchant ID
SIMPLEPAY_SECRET_KEY           # Secret key from SimplePay
```

### 🚀 Deployment Secrets
```yaml
# Vercel
VERCEL_TOKEN                   # Personal access token from Vercel
VERCEL_ORG_ID                  # Organization ID
VERCEL_PROJECT_ID_PRODUCTION   # Production project ID
VERCEL_PROJECT_ID_STAGING      # Staging project ID

# Monitoring
SENTRY_AUTH_TOKEN              # For source map uploads
SENTRY_ORG                     # Sentry organization slug
SENTRY_PROJECT                 # Sentry project slug

# Notifications
SLACK_WEBHOOK                  # For deployment notifications
```

### 🌍 Environment-Specific Secrets

Prefix with `PRODUCTION_` or `STAGING_`:
- `PRODUCTION_DATABASE_URL`
- `STAGING_DATABASE_URL`
- etc.

## 🛠️ Required Setup Steps

### 1. Update Package Manager
The workflows use `pnpm`. If you're using `npm`:

```bash
# Install pnpm
npm install -g pnpm

# Create pnpm-lock.yaml
pnpm import
```

### 2. Add Missing Scripts to package.json
```json
{
  "scripts": {
    "format:check": "prettier --check .",
    "test:smoke": "node scripts/smoke-tests.js",
    "db:backup": "node scripts/db-backup.js"
  }
}
```

### 3. Create Missing Files

**lighthouserc.json** (for performance tests):
```json
{
  "ci": {
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "categories:best-practices": ["error", {"minScore": 0.9}],
        "categories:seo": ["error", {"minScore": 0.9}]
      }
    }
  }
}
```

### 4. Fix Workflow Files

Replace the existing workflow files with the fixed versions:

1. **Update Node version** from 18.x to 20.x
2. **Update cache actions** from v3 to v4
3. **Add missing environment variables**
4. **Add timeouts** to prevent hanging jobs

### 5. Database Backup Script

Create `scripts/db-backup.js`:
```javascript
#!/usr/bin/env node
const { exec } = require('child_process');
const fs = require('fs');

const databaseUrl = process.env.DATABASE_URL;
const backupName = `backup-${new Date().toISOString().split('T')[0]}.sql`;

exec(`pg_dump ${databaseUrl} > ${backupName}`, (error) => {
  if (error) {
    console.error('Backup failed:', error);
    process.exit(1);
  }
  console.log(`Backup created: ${backupName}`);
  // Upload to S3 or other storage here
});
```

## ✅ Verification Checklist

Before pushing:

1. **Local tests pass**:
   ```bash
   pnpm test
   pnpm lint
   pnpm typecheck
   pnpm build
   ```

2. **Environment variables documented**:
   - Create `.env.example` with all required variables
   - Update README with setup instructions

3. **Secrets configured in GitHub**:
   - Go to Settings → Secrets → Actions
   - Add all required secrets
   - Use different values for staging/production

4. **Branch protection rules**:
   - Require PR reviews
   - Require status checks to pass
   - Require branches to be up to date

## 🔍 Common Issues & Solutions

### Issue: pnpm not found
**Solution**: The workflow uses pnpm. Either migrate to pnpm or update workflows to use npm.

### Issue: Test failures due to missing env vars
**Solution**: Add all required environment variables to the test job in CI.

### Issue: Build out of memory
**Solution**: Added `NODE_OPTIONS: "--max-old-space-size=4096"` to build steps.

### Issue: Deployment fails with missing secrets
**Solution**: Ensure all secrets are added to GitHub with correct names.

### Issue: Smoke tests fail
**Solution**: Update URLs in `scripts/smoke-tests.js` to match your domains.

## 🚦 Workflow Status Badges

Add these to your README:

```markdown
![CI](https://github.com/freaghill/hangjegyzet/workflows/CI%20Pipeline/badge.svg)
![Tests](https://github.com/freaghill/hangjegyzet/workflows/Test%20Suite/badge.svg)
![Security](https://github.com/freaghill/hangjegyzet/workflows/Security%20Scan/badge.svg)
```

## 📝 Final Notes

1. **Use the fixed CI workflow** (`ci-fixed.yml`) as a template
2. **Test workflows locally** with [act](https://github.com/nektos/act)
3. **Monitor workflow runs** in the Actions tab
4. **Set up notifications** for failed workflows
5. **Review and update** dependencies regularly

With these configurations, your GitHub Actions should run reliably without failures!