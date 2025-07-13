# Deployment Guide

This guide covers the deployment process for the Hangjegyzet application.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Environments](#environments)
3. [CI/CD Pipeline](#cicd-pipeline)
4. [Deployment Process](#deployment-process)
5. [Configuration](#configuration)
6. [Monitoring](#monitoring)
7. [Rollback](#rollback)
8. [Troubleshooting](#troubleshooting)

## 🎯 Overview

The Hangjegyzet application uses a automated CI/CD pipeline with GitHub Actions for continuous integration and deployment to Vercel.

### Key Features

- ✅ Automated testing (unit, integration, E2E)
- ✅ Code quality checks (ESLint, TypeScript)
- ✅ Security scanning
- ✅ Automated deployments
- ✅ Environment-specific configurations
- ✅ Database migrations
- ✅ Smoke tests
- ✅ Rollback capabilities

## 🌍 Environments

### Development
- **URL**: http://localhost:3000
- **Branch**: feature branches
- **Database**: Local PostgreSQL
- **Purpose**: Local development

### Staging
- **URL**: https://staging.hangjegyzet.hu
- **Branch**: `develop`
- **Database**: Staging PostgreSQL
- **Purpose**: Testing and QA

### Production
- **URL**: https://hangjegyzet.hu
- **Branch**: `main` or `master`
- **Database**: Production PostgreSQL
- **Purpose**: Live application

## 🔄 CI/CD Pipeline

### Continuous Integration

Every push and pull request triggers the CI pipeline:

1. **Lint** - Code style and quality checks
2. **Type Check** - TypeScript compilation
3. **Unit Tests** - Component and function tests
4. **Integration Tests** - API and database tests
5. **Build** - Next.js production build
6. **Security Scan** - Vulnerability scanning
7. **E2E Tests** - Browser automation tests (PRs only)

### Continuous Deployment

#### Staging Deployment
- Triggered on push to `develop`
- Runs all tests
- Deploys to Vercel staging
- Runs database migrations
- Executes smoke tests
- Sends Slack notification

#### Production Deployment
- Triggered on push to `main`/`master`
- Requires manual approval
- Creates database backup
- Deploys to Vercel production
- Purges CDN cache
- Creates release notes
- Monitors deployment health

## 🚀 Deployment Process

### Prerequisites

1. **Vercel Account**
   ```bash
   npm i -g vercel
   vercel login
   ```

2. **Environment Variables**
   Set in Vercel dashboard:
   - Database credentials
   - API keys
   - Service tokens

3. **GitHub Secrets**
   Configure in repository settings:
   ```
   VERCEL_TOKEN
   VERCEL_ORG_ID
   VERCEL_PROJECT_ID_STAGING
   VERCEL_PROJECT_ID_PRODUCTION
   DATABASE_URL
   SENTRY_AUTH_TOKEN
   SLACK_WEBHOOK
   ```

### Manual Deployment

#### Deploy to Staging
```bash
# From develop branch
git checkout develop
git pull origin develop
vercel --env=preview
```

#### Deploy to Production
```bash
# From main branch
git checkout main
git pull origin main
vercel --prod
```

### Automated Deployment

1. **Create Pull Request**
   ```bash
   git checkout -b feature/new-feature
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/new-feature
   ```

2. **Merge to Develop** (Staging)
   - PR approved and merged
   - Automatic deployment starts
   - Monitor in GitHub Actions

3. **Merge to Main** (Production)
   - Create PR from develop to main
   - Requires approval
   - Automatic deployment after merge

## ⚙️ Configuration

### Environment Variables

1. **Create `.env.local` for development**
   ```bash
   ./scripts/setup-env.sh development
   ```

2. **Configure Vercel environment variables**
   - Go to Vercel Dashboard
   - Project Settings → Environment Variables
   - Add variables for each environment

### Database Migrations

#### Automatic (CI/CD)
Migrations run automatically during deployment

#### Manual
```bash
# Development
npm run db:migrate:dev

# Staging
npm run db:migrate:staging

# Production
DATABASE_URL=xxx npm run db:migrate
```

### Feature Flags

Control features per environment:
```env
ENABLE_REALTIME_TRANSCRIPTION=true
ENABLE_AI_FEATURES=true
ENABLE_TEAM_FEATURES=true
```

## 📊 Monitoring

### Deployment Status

1. **GitHub Actions**
   - Check workflow runs
   - View logs and artifacts

2. **Vercel Dashboard**
   - Deployment history
   - Function logs
   - Analytics

3. **Sentry**
   - Error tracking
   - Performance monitoring
   - Release tracking

### Health Checks

```bash
# Check staging
curl https://staging.hangjegyzet.hu/api/health

# Check production
curl https://hangjegyzet.hu/api/health
```

### Smoke Tests

Run manually:
```bash
# Staging
npm run test:smoke:staging

# Production
npm run test:smoke:production
```

## 🔙 Rollback

### Automatic Rollback

If deployment fails:
1. Previous version remains active
2. Rollback notification sent
3. Team alerted via Slack

### Manual Rollback

#### Via Vercel
1. Go to Vercel Dashboard
2. Deployments tab
3. Find previous stable deployment
4. Click "Promote to Production"

#### Via Git
```bash
# Find last stable commit
git log --oneline -10

# Revert to stable version
git revert HEAD
git push origin main

# Or reset (careful!)
git reset --hard <commit-hash>
git push --force origin main
```

### Database Rollback

```bash
# List migrations
npm run prisma migrate status

# Rollback last migration
npm run prisma migrate reset --to <migration-name>
```

## 🔧 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check locally
npm run build

# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

#### Migration Failures
```bash
# Check migration status
npm run prisma migrate status

# Generate client
npm run prisma generate
```

#### Environment Variable Issues
- Verify in Vercel dashboard
- Check for typos
- Ensure quotes are escaped

#### Performance Issues
```bash
# Analyze bundle
npm run analyze

# Check Lighthouse
npm run lighthouse
```

### Debug Commands

```bash
# Check Node version
node -v  # Should be 18+

# Verify dependencies
npm list

# Test environment
npm run test:ci

# Check types
npm run typecheck
```

### Getting Help

1. **Check Logs**
   - GitHub Actions logs
   - Vercel function logs
   - Sentry error reports

2. **Run Diagnostics**
   ```bash
   # System info
   npx envinfo --system --binaries --browsers

   # Dependency audit
   npm audit
   ```

3. **Contact Support**
   - Create GitHub issue
   - Slack #deployment channel
   - Email: devops@hangjegyzet.hu

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)

---

*Last updated: January 2024*