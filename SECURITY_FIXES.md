# 🔐 Critical Security Fixes for Hangjegyzet

## 1. SQL Injection in Salesforce CRM Integration

### Vulnerable Code (crm-service.ts:383)
```typescript
// VULNERABLE - Direct string interpolation
const soql = query 
  ? `SELECT Id, Name, Email, Phone, Account.Name, Title FROM Contact WHERE Email LIKE '%${query}%' LIMIT 50`
  : `SELECT Id, Name, Email, Phone, Account.Name, Title FROM Contact LIMIT 50`
```

### Fixed Code
```typescript
// SECURE - Using parameterized query with proper escaping
async getContacts(query?: string): Promise<CRMContact[]> {
  // Sanitize input first
  const sanitizedQuery = query ? query.replace(/['"\\]/g, '\\$&') : '';
  
  // Use SOSL (Salesforce Object Search Language) for safer searching
  if (sanitizedQuery) {
    const sosl = `FIND {${sanitizedQuery}*} IN EMAIL FIELDS RETURNING Contact(Id, Name, Email, Phone, Account.Name, Title) LIMIT 50`;
    const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(sosl)}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    // ... rest of implementation
  } else {
    // Use regular SOQL without user input
    const soql = 'SELECT Id, Name, Email, Phone, Account.Name, Title FROM Contact LIMIT 50';
    const response = await fetch(`${this.baseUrl}/query?q=${encodeURIComponent(soql)}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    // ... rest of implementation
  }
}
```

## 2. SQL Injection in PostgreSQL Search Functions

### Vulnerable Code (20240111_search_indexes.sql)
```sql
-- VULNERABLE - Direct concatenation
WHERE 
  name ILIKE '%' || p_query || '%' OR
  description ILIKE '%' || p_query || '%' OR
  email ILIKE '%' || p_query || '%'
```

### Fixed Code
```sql
CREATE OR REPLACE FUNCTION search_users_secure(p_query text)
RETURNS TABLE(...) AS $$
BEGIN
  -- Use parameterized query with proper escaping
  RETURN QUERY
  SELECT ...
  FROM users
  WHERE 
    name ILIKE '%' || quote_literal(p_query) || '%' OR
    description ILIKE '%' || quote_literal(p_query) || '%' OR
    email ILIKE '%' || quote_literal(p_query) || '%'
    -- Better: Use full-text search
    OR to_tsvector('english', name || ' ' || coalesce(description, '') || ' ' || email) 
       @@ plainto_tsquery('english', p_query)
  ORDER BY 
    ts_rank(search_vector, plainto_tsquery('english', p_query)) DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 3. Enhanced Admin Verification

### Current Vulnerable Code (middleware.ts:78)
```typescript
// WEAK - Only checks email whitelist
const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean)
if (!adminEmails.includes(user.email || '')) {
  // Weak protection
}
```

### Fixed Code
```typescript
// SECURE - Proper role verification
if (request.nextUrl.pathname.startsWith('/admin')) {
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // Check actual user role from database
  const { data: userRecord } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (userRecord?.role !== 'admin') {
    // Log unauthorized access attempt
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'unauthorized_admin_access',
      ip_address: request.headers.get('x-forwarded-for') || request.ip,
      user_agent: request.headers.get('user-agent'),
      path: request.nextUrl.pathname
    })
    
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }
}
```

## 4. Input Validation Middleware

### New Security Middleware
```typescript
// lib/security/input-validation.ts
import { z } from 'zod'

export const searchQuerySchema = z.object({
  q: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9\s\-_.@]+$/, 'Invalid characters in search query')
})

export function validateSearchInput(input: string): string {
  // Remove any SQL injection attempts
  const sqlInjectionPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
    /(-{2}|\/\*|\*\/|;|'|")/g,
    /(x?or|and)\s*\d+\s*=\s*\d+/gi
  ]
  
  let sanitized = input
  for (const pattern of sqlInjectionPatterns) {
    sanitized = sanitized.replace(pattern, '')
  }
  
  return sanitized.trim()
}

// Use in API routes
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  
  try {
    const validated = searchQuerySchema.parse({ q: query })
    const sanitized = validateSearchInput(validated.q)
    // Proceed with sanitized input
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid search query' },
      { status: 400 }
    )
  }
}
```

## 5. Security Headers Enhancement

### Add to middleware.ts
```typescript
// Enhanced security headers
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
}

Object.entries(securityHeaders).forEach(([key, value]) => {
  response.headers.set(key, value)
})
```

## Implementation Priority

1. **Immediate (Today)**: Fix SQL injection vulnerabilities
2. **High (This Week)**: Implement proper admin verification
3. **Medium (This Month)**: Add comprehensive input validation
4. **Ongoing**: Security testing and monitoring

## Testing

```bash
# Test SQL injection protection
curl -X GET "https://dev.vexum.hu/api/search?q=test';DROP TABLE users;--"

# Test admin access
curl -X GET "https://dev.vexum.hu/admin" -H "Authorization: Bearer USER_TOKEN"

# Run security scan
npm run security:scan
```