# HangJegyzet Setup Guide

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier is fine)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Go to [https://supabase.com](https://supabase.com) and create a free account
2. Create a new project (choose a region close to you)
3. Wait for the project to be provisioned (takes about 2 minutes)
4. Once ready, go to **Settings > API** in your Supabase dashboard
5. Copy the following values:
   - **Project URL** (looks like `https://abcdefghijkl.supabase.co`)
   - **anon/public** API key (a long JWT token)

### 3. Update Environment Variables

Edit the `.env.local` file and replace the placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Set Up Database

1. In your Supabase dashboard, go to the **SQL Editor**
2. Copy the contents of `supabase/schema.sql` from this project
3. Paste and run it in the SQL Editor
4. This will create all the necessary tables and functions

### 5. Configure Authentication

1. In Supabase dashboard, go to **Authentication > Providers**
2. Make sure **Email** provider is enabled (it should be by default)
3. (Optional) Configure email templates in **Authentication > Email Templates**

### 6. Run the Application

```bash
npm run dev
```

The app will be available at http://localhost:4000

## Troubleshooting

### "Failed to fetch" error during registration

This error occurs when:
- The Supabase URL or API key is incorrect
- The Supabase project is not accessible
- There's a network connectivity issue

Double-check your `.env.local` file has the correct values from your Supabase dashboard.

### Registration successful but can't log in

By default, Supabase requires email verification. Check:
1. Your email for the verification link
2. Supabase dashboard > Authentication > Users to see if your user was created
3. You can disable email verification in Authentication > Providers > Email > Confirm email (for development)

## Optional Services

The following services are optional but enhance functionality:

- **Deepgram** - For audio transcription
- **OpenAI/Anthropic** - For AI-powered summaries
- **Google OAuth** - For Google Drive integration
- **Zoom OAuth** - For Zoom integration

Add their API keys to `.env.local` if you want to use these features.