# Library Cleanup Progress

## 📧 Email Services Consolidation

### Status: ✅ SendGrid Already Implemented
- SendGrid service exists at `/lib/email/sendgrid.ts`
- Has welcome, password reset, meeting summary templates
- Just needs to be connected to API routes

### To Remove:
```bash
npm uninstall resend nodemailer
```

### To Connect SendGrid:
1. User registration → Send welcome email
2. Password reset → Send reset email
3. Meeting completed → Send summary
4. Mentions → Send notification

---

## 📄 PDF Libraries Consolidation

### Current State:
- puppeteer (HTML to PDF) ✅ KEEP
- @react-pdf/renderer ❌ REMOVE
- react-pdf (PDF viewer) ✅ KEEP
- pdfkit ❌ REMOVE
- jspdf ❌ REMOVE

### To Remove:
```bash
npm uninstall @react-pdf/renderer pdfkit jspdf
```

### Migration:
- Use Puppeteer for all PDF generation (already implemented)
- Keep react-pdf only for viewing PDFs in browser

---

## 🔄 Redis Clients Consolidation

### Current State:
- ioredis ✅ KEEP (for self-hosted Redis)
- @upstash/redis ❌ REMOVE (unless going serverless)
- @upstash/ratelimit ✅ KEEP (can work with ioredis)

### To Remove:
```bash
npm uninstall @upstash/redis
```

### Migration:
- Use ioredis for all Redis operations
- Configure @upstash/ratelimit to use ioredis adapter

---

## 🚀 WebSocket Libraries

### Current State:
- socket.io ✅ KEEP (high-level, feature-rich)
- ws ❌ REMOVE (low-level, redundant)

### To Remove:
```bash
npm uninstall ws @types/ws
```

---

## 📤 File Upload

### Current State:
- Uppy suite installed but underutilized
- react-dropzone ❌ REMOVE (Uppy has this)

### To Remove:
```bash
npm uninstall react-dropzone
```

### Migration:
- Use Uppy Dashboard component everywhere
- Already implemented for Google Drive integration

---

## 🔒 Rate Limiting

### Current State:
- Custom implementation in `/lib/security/rate-limiter.ts`
- @upstash/ratelimit installed but not used

### To Do:
1. Replace custom rate limiter with @upstash/ratelimit
2. Delete `/lib/security/rate-limiter.ts`
3. Update middleware to use library

---

## 💾 Cache Manager

### Current State:
- Custom implementation in `/lib/cache/`
- Could use existing solutions

### To Do:
1. Install cache-manager: `npm install cache-manager cache-manager-ioredis`
2. Replace custom implementation
3. Delete `/lib/cache/cache-manager.ts`

---

## 🧹 Complete Cleanup Script

```bash
# Remove duplicate libraries
npm uninstall resend nodemailer @react-pdf/renderer pdfkit jspdf @upstash/redis ws @types/ws react-dropzone

# Add missing cache solution
npm install cache-manager cache-manager-ioredis

# Verify removals
npm ls resend nodemailer pdfkit jspdf ws react-dropzone

# Check for unused dependencies
npx depcheck
```

---

## 📊 Expected Impact

### Before:
- ~90,477 lines of code
- 168 dependencies
- Multiple implementations of same functionality

### After Cleanup:
- ~78,000 lines of code (13% reduction)
- ~155 dependencies
- Single implementation per functionality
- Cleaner, more maintainable codebase

---

## ⚠️ Testing After Cleanup

1. **Email System**
   - Test registration flow
   - Test password reset
   - Test meeting notifications

2. **PDF Generation**
   - Test meeting export
   - Test report generation
   - Verify PDF viewing still works

3. **Real-time Features**
   - Test live transcription
   - Test notifications
   - Verify WebSocket connections

4. **File Upload**
   - Test meeting upload
   - Test drag-and-drop
   - Test Google Drive integration

5. **Rate Limiting**
   - Test API rate limits
   - Verify Redis connection
   - Check rate limit headers