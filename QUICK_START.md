# HangJegyzet - Quick Start Guide

## 🚀 Starting the App on Port 4000

### Prerequisites
1. Node.js 18+ installed
2. A Supabase account (free tier is fine)

### Setup Steps

1. **Configure Supabase**
   - Go to https://supabase.com and create a new project
   - Get your project URL and anon key from Settings > API
   - Update `.env.local` with your credentials:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     ```

2. **Run Database Migrations**
   ```bash
   # Install Supabase CLI if you haven't
   npm install -g supabase
   
   # Link to your project
   supabase link --project-ref your-project-ref
   
   # Run migrations
   supabase db push
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   ```
   The app will start on http://localhost:4000

### First Time Setup
1. Open http://localhost:4000
2. Click "Regisztráció" to create an account
3. You'll be automatically assigned an organization
4. Start uploading meeting recordings!

### Optional Services
To enable transcription, add these to `.env.local`:
- `DEEPGRAM_API_KEY` - For speech-to-text
- `ANTHROPIC_API_KEY` - For AI summaries

### Quick Test
1. Upload a small audio file
2. The system will process it (may take a few minutes without API keys)
3. View the transcript and AI summary

### Troubleshooting
- **Port 4000 in use?** Kill the process: `lsof -ti:4000 | xargs kill -9`
- **Supabase errors?** Check your URL and key in `.env.local`
- **Build errors?** Try: `rm -rf node_modules && npm install`