# PostgreSQL Migration Plan

## ⚠️ IMPORTANT: Migration Complexity Assessment

**Estimated Time**: 40-60 hours
**Risk Level**: HIGH
**Recommendation**: Keep Supabase for now, optimize costs instead

## Current Supabase Dependencies

### 1. Authentication System
- User registration/login
- Session management
- Password reset
- Email verification
- OAuth providers

**Migration effort**: 15-20 hours
**Alternative**: Use NextAuth.js

### 2. Database (30+ tables)
- Complex schema with relationships
- Row Level Security policies
- Database functions and triggers
- Real-time subscriptions

**Migration effort**: 10-15 hours
**Alternative**: Prisma or Drizzle ORM

### 3. File Storage
- Audio file uploads
- Export downloads
- Profile pictures

**Migration effort**: 5-10 hours
**Alternative**: Local disk + S3/Cloudinary

### 4. Real-time Features
- Live transcription updates
- Collaborative features
- WebSocket subscriptions

**Migration effort**: 10-15 hours
**Alternative**: Custom WebSocket implementation

## Cost-Benefit Analysis

### Keep Supabase
- **Cost**: €23/month (Pro plan)
- **Time to implement**: 0 hours
- **Risk**: None
- **Maintenance**: Minimal

### Migrate to Local PostgreSQL
- **Cost**: €0/month (but hidden costs below)
- **Time to implement**: 40-60 hours
- **Risk**: High (auth migration, data loss)
- **Hidden costs**:
  - File storage solution: €5-10/month
  - Email service: €5-10/month
  - Backup solution: €5/month
  - Your time: 40-60 hours = €2000-3000 opportunity cost

## Recommendation: Optimize Supabase Usage Instead

### 1. Stay on Free Tier Initially
- 500MB database (enough for ~1000 users)
- 1GB file storage
- 50,000 auth users
- **Cost**: €0/month

### 2. Optimize Database Usage
```sql
-- Add indexes for common queries
CREATE INDEX idx_meetings_org_created ON meetings(organization_id, created_at DESC);
CREATE INDEX idx_transcripts_meeting ON transcripts(meeting_id);

-- Archive old data
CREATE TABLE meetings_archive AS 
SELECT * FROM meetings WHERE created_at < NOW() - INTERVAL '6 months';
```

### 3. Implement Caching
```typescript
// Cache frequently accessed data
const cachedMeetings = new Map<string, Meeting[]>()

export async function getMeetings(orgId: string) {
  if (cachedMeetings.has(orgId)) {
    return cachedMeetings.get(orgId)
  }
  
  const meetings = await supabase
    .from('meetings')
    .select('*')
    .eq('organization_id', orgId)
    
  cachedMeetings.set(orgId, meetings.data)
  setTimeout(() => cachedMeetings.delete(orgId), 300000) // 5 min cache
  
  return meetings.data
}
```

### 4. File Storage Optimization
- Compress audio before upload
- Delete old files after processing
- Use direct S3 uploads for large files

## If You Must Migrate: Step-by-Step Plan

### Phase 1: Database Migration (Week 1)
```bash
# 1. Export Supabase schema
pg_dump -h your-project.supabase.co -U postgres -d postgres --schema-only > schema.sql

# 2. Set up local PostgreSQL
brew install postgresql@15
createdb hangjegyzet

# 3. Import schema
psql hangjegyzet < schema.sql

# 4. Remove RLS policies
psql hangjegyzet -c "ALTER TABLE ALL TABLES IN SCHEMA public DISABLE ROW LEVEL SECURITY;"
```

### Phase 2: Replace Supabase Client (Week 2)
```typescript
// /lib/db/client.ts
import { Pool } from 'pg'

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Helper functions to match Supabase API
export async function from(table: string) {
  return {
    select: (columns = '*') => ({
      eq: (column: string, value: any) => ({
        single: async () => {
          const query = `SELECT ${columns} FROM ${table} WHERE ${column} = $1 LIMIT 1`
          const result = await db.query(query, [value])
          return { data: result.rows[0], error: null }
        },
        async execute() {
          const query = `SELECT ${columns} FROM ${table} WHERE ${column} = $1`
          const result = await db.query(query, [value])
          return { data: result.rows, error: null }
        }
      })
    }),
    insert: async (data: any) => {
      const columns = Object.keys(data).join(', ')
      const values = Object.values(data)
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')
      
      const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`
      const result = await db.query(query, values)
      return { data: result.rows[0], error: null }
    }
  }
}
```

### Phase 3: Authentication Migration (Week 3)
```bash
npm install next-auth @auth/prisma-adapter
```

```typescript
// /app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'

export const authOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const user = await db.query(
          'SELECT * FROM auth.users WHERE email = $1',
          [credentials.email]
        )
        
        if (user.rows[0] && await compare(credentials.password, user.rows[0].password)) {
          return {
            id: user.rows[0].id,
            email: user.rows[0].email,
            name: user.rows[0].name
          }
        }
        return null
      }
    })
  ]
}
```

### Phase 4: File Storage (Week 4)
```typescript
// /lib/storage/local.ts
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function uploadFile(file: File, path: string) {
  const uploadDir = join(process.cwd(), 'uploads', path)
  await mkdir(uploadDir, { recursive: true })
  
  const buffer = Buffer.from(await file.arrayBuffer())
  const filePath = join(uploadDir, file.name)
  
  await writeFile(filePath, buffer)
  return `/uploads/${path}/${file.name}`
}
```

## Testing Checklist

- [ ] User registration/login works
- [ ] File uploads work
- [ ] All database queries migrated
- [ ] Real-time features work
- [ ] Email sending works
- [ ] Backups configured
- [ ] Performance acceptable
- [ ] Security review completed

## Rollback Plan

1. Keep Supabase project active during migration
2. Dual-write to both databases during transition
3. Test thoroughly on staging
4. Have database dumps ready
5. Monitor error rates closely

## Conclusion

**Strong Recommendation**: Stay with Supabase
- The €23/month cost is negligible compared to migration effort
- You get battle-tested auth, storage, and real-time features
- Focus your time on growing the business instead

If you're determined to migrate, follow the plan above, but expect 2-4 weeks of work and potential bugs.