#!/bin/bash

# Supabase setup script for Hangjegyzet

set -e

echo "🗄️  Hangjegyzet Supabase Setup"
echo "============================="
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local from template..."
    ./scripts/setup-env.sh development
fi

echo "📝 Supabase Project Setup"
echo "========================"
echo ""
echo "1. Go to https://supabase.com and create a new project"
echo "2. Choose a strong database password and save it"
echo "3. Wait for the project to be ready (~2 minutes)"
echo ""
echo "Press Enter when your Supabase project is ready..."
read

echo ""
echo "🔑 Enter your Supabase credentials:"
echo ""

# Get Supabase URL
echo "Project URL (https://xxxxx.supabase.co):"
read SUPABASE_URL

# Get Anon Key
echo ""
echo "Anon/Public Key (starts with 'eyJ...'):"
read SUPABASE_ANON_KEY

# Get Service Role Key
echo ""
echo "Service Role Key (starts with 'eyJ...'):"
read SUPABASE_SERVICE_KEY

# Get Database URL
echo ""
echo "Database URL (Settings → Database → Connection string):"
echo "Example: postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
read DATABASE_URL

# Update .env.local
echo ""
echo "📝 Updating .env.local..."

# Backup existing .env.local
cp .env.local .env.local.backup

# Update values
sed -i.bak "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=\"$SUPABASE_URL\"|" .env.local
sed -i.bak "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=\"$SUPABASE_ANON_KEY\"|" .env.local
sed -i.bak "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=\"$SUPABASE_SERVICE_KEY\"|" .env.local
sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|" .env.local

# Clean up backup files
rm .env.local.bak

echo "✅ Environment variables updated"

# Test database connection
echo ""
echo "🔍 Testing database connection..."
if npm run db:generate 2>/dev/null; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed. Please check your DATABASE_URL"
    exit 1
fi

# Run migrations
echo ""
echo "🔄 Running database migrations..."
read -p "Do you want to run database migrations now? [Y/n] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    npm run db:migrate:dev
    echo "✅ Migrations completed"
else
    echo "⚠️  Skipped migrations. Run 'npm run db:migrate:dev' later"
fi

# Create staging environment file
echo ""
echo "📋 Creating staging environment configuration..."
cp .env.local .env.staging

# Generate staging secrets
STAGING_NEXTAUTH_SECRET=$(openssl rand -base64 32)
sed -i.bak "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=\"$STAGING_NEXTAUTH_SECRET\"|" .env.staging
sed -i.bak "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=\"https://staging.hangjegyzet.hu\"|" .env.staging
sed -i.bak "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=\"https://staging.hangjegyzet.hu\"|" .env.staging
rm .env.staging.bak

echo ""
echo "✅ Supabase setup complete!"
echo ""
echo "📋 GitHub Secrets for Staging:"
echo "=============================="
echo "STAGING_DATABASE_URL=$DATABASE_URL"
echo "STAGING_SUPABASE_URL=$SUPABASE_URL"
echo "STAGING_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
echo "STAGING_NEXTAUTH_SECRET=$STAGING_NEXTAUTH_SECRET"
echo ""
echo "📋 Vercel Environment Variables:"
echo "==============================="
echo "Copy the contents of .env.staging to Vercel dashboard"
echo ""
echo "Next steps:"
echo "1. Add secrets to GitHub"
echo "2. Configure Vercel environment variables"
echo "3. Run: npm run dev (to test locally)"