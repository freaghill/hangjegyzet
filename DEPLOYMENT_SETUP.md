# 🚀 Hangjegyzet Deployment Setup Guide

This guide will walk you through setting up the complete deployment pipeline from scratch.

## 📋 Prerequisites

Before starting, make sure you have:
- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] A GitHub account
- [ ] A code editor (VS Code recommended)

## 🎯 Step 1: Create Accounts

### 1.1 GitHub Repository
1. Go to [GitHub](https://github.com)
2. Click "New repository"
3. Name: `hangjegyzet`
4. Keep it private initially
5. Don't initialize with README (we already have files)

### 1.2 Vercel Account
1. Go to [Vercel](https://vercel.com/signup)
2. Sign up with GitHub (recommended)
3. No need to import project yet

### 1.3 Supabase Account
1. Go to [Supabase](https://supabase.com)
2. Sign up with GitHub
3. Create new project:
   - Project name: `hangjegyzet-staging`
   - Database password: Generate a strong one and save it!
   - Region: Choose closest to you
4. Wait ~2 minutes for project to be ready

## 🔧 Step 2: Local Setup

### 2.1 Initialize Git Repository
```bash
# In your project directory (/opt/hangjegyzet)
git init
git add .
git commit -m "Initial commit"

# Add GitHub remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/hangjegyzet.git
git branch -M main
git push -u origin main

# Create and push develop branch
git checkout -b develop
git push -u origin develop
```

### 2.2 Install Dependencies
```bash
npm install

# Install global tools
npm install -g vercel
```

### 2.3 Setup Environment Variables
```bash
# Run the setup script
./scripts/setup-env.sh development

# This creates .env.local - we'll update it next
```

## 🗄️ Step 3: Database Setup (Supabase)

### 3.1 Run Supabase Setup Script
```bash
./scripts/setup-supabase.sh
```

Follow the prompts and enter:
1. **Project URL**: Find in Supabase Dashboard → Settings → API
2. **Anon Key**: Same page, under "Project API keys"
3. **Service Role Key**: Same page (keep this secret!)
4. **Database URL**: Settings → Database → Connection string

### 3.2 Run Database Migrations
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate:dev
```

### 3.3 Test Database Connection
```bash
# This should start without errors
npm run dev
```

Visit http://localhost:3000 to verify the app loads.

## 🌐 Step 4: Vercel Setup

### 4.1 Run Vercel Setup Script
```bash
./scripts/setup-vercel.sh
```

This will:
1. Install Vercel CLI (if needed)
2. Log you in to Vercel
3. Link your project
4. Show you the IDs you need for GitHub

### 4.2 Create Staging Project in Vercel
When prompted by the script, choose "Y" to create a separate staging project.

Save these values from the script output:
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID_STAGING`
- `VERCEL_PROJECT_ID_PRODUCTION`

### 4.3 Get Vercel Token
1. Go to https://vercel.com/account/tokens
2. Create token named `hangjegyzet-ci`
3. Copy the token immediately (won't show again!)

## 🔐 Step 5: GitHub Secrets Configuration

Go to your GitHub repository:
`https://github.com/YOUR_USERNAME/hangjegyzet/settings/secrets/actions`

Add these secrets:

| Secret Name | Value | Where to Find |
|------------|-------|---------------|
| `VERCEL_TOKEN` | Your token | From Step 4.3 |
| `VERCEL_ORG_ID` | org_xxx | From setup script |
| `VERCEL_PROJECT_ID_STAGING` | prj_xxx | From setup script |
| `VERCEL_PROJECT_ID_PRODUCTION` | prj_xxx | From setup script |
| `STAGING_DATABASE_URL` | postgresql://... | From Supabase |
| `STAGING_SUPABASE_URL` | https://xxx.supabase.co | From Supabase |
| `STAGING_SUPABASE_ANON_KEY` | eyJ... | From Supabase |
| `STAGING_NEXTAUTH_SECRET` | Random string | Generate with `openssl rand -base64 32` |

## 📝 Step 6: Vercel Environment Variables

### 6.1 Go to Vercel Dashboard
1. Select your staging project
2. Go to Settings → Environment Variables

### 6.2 Add Variables for Staging
Add all variables from your `.env.staging` file:

```env
DATABASE_URL=[your-staging-database-url]
NEXT_PUBLIC_SUPABASE_URL=[your-supabase-url]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-key]
NEXTAUTH_URL=https://[your-project].vercel.app
NEXTAUTH_SECRET=[your-secret]
NEXT_PUBLIC_APP_URL=https://[your-project].vercel.app
```

## 🚀 Step 7: First Deployment

### 7.1 Deploy Manually First
```bash
# Make sure you're on develop branch
git checkout develop

# Deploy to staging
vercel

# Follow prompts, choose:
# - Set up and deploy
# - Link to existing project (if asked)
# - Which scope: (your account)
# - Link to existing project? N (first time)
# - Project name: hangjegyzet-staging
# - In which directory? ./ (current)
# - Override settings? N
```

### 7.2 Test Deployment
1. Wait for deployment to complete
2. Visit the URL shown
3. Check if the app loads

### 7.3 Enable Automatic Deployments
```bash
# Push to develop branch to trigger automatic deployment
git add .
git commit -m "chore: configure deployment"
git push origin develop
```

Watch the deployment at:
`https://github.com/YOUR_USERNAME/hangjegyzet/actions`

## ✅ Step 8: Verify Everything Works

### 8.1 Run Smoke Tests
```bash
# Once deployed, test it
npm run test:smoke:staging
```

### 8.2 Check GitHub Actions
- Go to Actions tab in your repository
- You should see "Deploy to Staging" workflow
- It should be green ✅

### 8.3 Check Vercel Dashboard
- See your deployments
- Check function logs
- Monitor performance

## 🎉 Success Checklist

- [ ] GitHub repository created and code pushed
- [ ] Supabase project created and database migrated
- [ ] Vercel projects created (staging + production)
- [ ] GitHub secrets configured
- [ ] Vercel environment variables set
- [ ] First manual deployment successful
- [ ] Automatic deployment working
- [ ] Smoke tests passing

## 🔧 Troubleshooting

### "Command not found: vercel"
```bash
npm install -g vercel
```

### Database connection errors
- Check DATABASE_URL format
- Ensure Supabase project is active
- Try the connection string with SSL required

### Build failures
```bash
# Test locally first
npm run build

# Check for TypeScript errors
npm run typecheck
```

### Deployment not triggering
- Ensure you're pushing to `develop` branch
- Check GitHub Actions is enabled
- Verify secrets are set correctly

## 📚 Next Steps

1. **Custom Domain** (optional)
   - Add domain in Vercel project settings
   - Update NEXTAUTH_URL in environment variables

2. **Production Setup**
   - Repeat process for production environment
   - Use `main` branch for production
   - Create separate Supabase project

3. **Monitoring**
   - Set up Sentry (error tracking)
   - Configure Vercel Analytics
   - Set up uptime monitoring

4. **Team Access**
   - Invite team members to GitHub repo
   - Add them to Vercel project
   - Configure Supabase team access

---

Need help? Check the [deployment documentation](./docs/deployment/README.md) or create an issue!