# Third-Party Library Philosophy & Usage Guide

## 🎯 Core Principle: Don't Reinvent the Wheel

**Always use well-maintained open source libraries when they match our needs.** This reduces:
- Development time
- Maintenance overhead  
- Bug surface area
- Documentation burden
- Onboarding complexity

## 🚨 Current Library Duplication Issues

### 1. **PDF Generation (4 libraries!)**
We currently have:
- `puppeteer` - HTML to PDF via headless Chrome
- `@react-pdf/renderer` - React components to PDF
- `react-pdf` - Display PDFs in browser
- `pdfkit` - Programmatic PDF creation
- `jspdf` - Another PDF library

**Action Required:**
```bash
# Remove these
npm uninstall pdfkit jspdf @react-pdf/renderer

# Keep only:
# - puppeteer (for HTML->PDF export)
# - react-pdf (for viewing PDFs in browser)
```

### 2. **Email Services (3 solutions!)**
We have:
- `@sendgrid/mail` - SendGrid API
- `resend` - Resend API
- `nodemailer` - SMTP client

**Action Required:**
```bash
# Pick ONE primary service
# Recommendation: Keep Resend (modern, good DX)
npm uninstall @sendgrid/mail nodemailer
```

### 3. **Redis Clients (2 libraries)**
We have:
- `@upstash/redis` - Serverless Redis
- `ioredis` - Traditional Redis client

**Action Required:**
```bash
# If using Hetzner VPS with self-hosted Redis:
npm uninstall @upstash/redis  # Keep ioredis

# If going serverless:
npm uninstall ioredis  # Keep @upstash/redis
```

### 4. **File Upload**
We have:
- `@uppy/*` - Complete upload solution
- `react-dropzone` - Just dropzone functionality

**Action Required:**
```bash
# Uppy includes dropzone functionality
npm uninstall react-dropzone
```

## 🔄 Custom Code to Replace

### 1. **Rate Limiting**
**Current:** Custom implementation in `/lib/monitoring/rate-limiter.ts`
**Solution:** We already have `@upstash/ratelimit` installed!

```typescript
// Replace custom implementation with:
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
});
```

### 2. **Caching**
**Current:** Custom cache manager in `/lib/cache/cache-manager.ts`
**Solution:** Use existing libraries

```bash
npm install cache-manager cache-manager-redis-store
```

```typescript
import { caching } from 'cache-manager';
import { redisStore } from 'cache-manager-redis-store';

const cache = await caching(redisStore, {
  socket: { host: 'localhost', port: 6379 },
  ttl: 600 // seconds
});
```

### 3. **WebSocket Management**
**Current:** Using both `socket.io` and `ws`
**Solution:** Socket.io handles all our needs

```bash
npm uninstall ws
```

## ✅ Well-Chosen Libraries

These are excellent choices that should be kept:

### Core Framework
- **Next.js 14** - Modern React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS

### UI Components
- **Radix UI** - Accessible, unstyled components
- **shadcn/ui** - Beautiful component library
- **Tremor** - Analytics components

### Backend Services
- **Supabase** - Complete BaaS solution
- **BullMQ** - Robust job queuing
- **Meilisearch** - Fast search engine

### AI/ML
- **OpenAI SDK** - GPT integration
- **Anthropic SDK** - Claude integration
- **Deepgram** - Speech-to-text
- **LangChain** - AI orchestration

### Developer Experience
- **Zod** - Schema validation
- **react-hook-form** - Form management
- **Zustand** - State management
- **date-fns** - Date utilities

## 📋 Library Selection Criteria

When considering a new library, ask:

1. **Is it actively maintained?**
   - Recent commits (< 3 months)
   - Responsive to issues
   - Regular releases

2. **Does it have good TypeScript support?**
   - First-class TS support or quality @types

3. **Is it well documented?**
   - Clear examples
   - API reference
   - Migration guides

4. **What's the bundle size impact?**
   - Check on bundlephobia.com
   - Consider tree-shaking support

5. **Does it duplicate existing functionality?**
   - Check if we already have something similar
   - Can existing libraries be extended instead?

## 🔧 Migration Priority

1. **High Priority (This Week)**
   - Remove duplicate PDF libraries
   - Consolidate email services
   - Replace custom rate limiter with Upstash

2. **Medium Priority (Next Sprint)**
   - Pick one Redis client
   - Replace custom cache manager
   - Remove react-dropzone

3. **Low Priority (When Convenient)**
   - Remove ws in favor of socket.io
   - Clean up unused dependencies

## 💡 Going Forward

### Do's
- ✅ Search npm for existing solutions first
- ✅ Check our package.json for similar libraries
- ✅ Prefer libraries with > 1000 weekly downloads
- ✅ Choose libraries that integrate well with our stack
- ✅ Document why a library was chosen

### Don'ts
- ❌ Don't install multiple libraries for the same purpose
- ❌ Don't build custom solutions for solved problems
- ❌ Don't choose libraries with no recent updates
- ❌ Don't pick heavy libraries for simple tasks
- ❌ Don't install without checking bundle size

## 📊 Library Audit Checklist

Run quarterly:
```bash
# Check for duplicate functionality
npm ls | grep -E "(pdf|email|redis|cache|rate)"

# Find unused dependencies
npx depcheck

# Check for outdated packages
npm outdated

# Analyze bundle size
npm run analyze
```

## 🎯 Recommended Libraries for Common Tasks

### Need to Add These:
```json
{
  "monitoring": {
    "use": "prom-client",
    "not": "custom metrics implementation"
  },
  "logging": {
    "use": "winston or pino",
    "not": "console.log everywhere"
  },
  "http-client": {
    "use": "axios or native fetch",
    "not": "multiple HTTP libraries"
  },
  "validation": {
    "use": "zod (already have it!)",
    "not": "custom validation functions"
  },
  "testing": {
    "use": "vitest",
    "not": "jest (slower, more config)"
  }
}
```

Remember: **Every line of code we don't write is a line we don't have to maintain!**