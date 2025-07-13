# Deployment Setup Guide

Follow these steps to set up your deployment pipeline from scratch.

## Prerequisites Checklist

- [ ] GitHub repository
- [ ] Vercel account
- [ ] Supabase account (for database)
- [ ] Domain name (optional for staging)

## Step-by-Step Setup

### 1. GitHub Repository Setup
```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit"

# Create repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/hangjegyzet.git
git branch -M main
git push -u origin main

# Create develop branch for staging
git checkout -b develop
git push -u origin develop
```

### 2. Vercel Account Setup
1. Go to https://vercel.com/signup
2. Sign up with GitHub
3. Install Vercel CLI: `npm i -g vercel`

### 3. Supabase Setup
1. Go to https://supabase.com
2. Create new project
3. Save your credentials

### 4. Local Environment Setup
```bash
# Install dependencies
npm install

# Setup environment variables
./scripts/setup-env.sh development

# Update .env.local with your Supabase credentials
```

### 5. Database Setup
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate:dev
```

### 6. Vercel Project Setup
```bash
# Login to Vercel
vercel login

# Link to Vercel (from project root)
vercel link

# Deploy to preview (staging)
vercel --env=preview
```

### 7. GitHub Secrets Configuration
Go to: https://github.com/YOUR_USERNAME/hangjegyzet/settings/secrets/actions

Add these secrets:
- VERCEL_TOKEN
- VERCEL_ORG_ID  
- VERCEL_PROJECT_ID_STAGING
- STAGING_DATABASE_URL
- STAGING_NEXTAUTH_SECRET
- STAGING_SUPABASE_URL
- STAGING_SUPABASE_ANON_KEY

### 8. Deploy to Staging
```bash
# Make sure you're on develop branch
git checkout develop

# Push to trigger deployment
git push origin develop
```

## Next Steps
1. Monitor deployment in GitHub Actions
2. Check staging URL in Vercel dashboard
3. Run smoke tests
4. Set up custom domain (optional)