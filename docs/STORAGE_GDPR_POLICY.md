# Storage and GDPR Compliance Policy

## Storage Architecture

### 1. **Temporary Storage** (Processing)
- **Location**: `/tmp/uploads/` or Redis cache
- **Duration**: Maximum 24 hours
- **Purpose**: Audio/video processing only
- **Auto-deletion**: Cron job every hour

### 2. **Permanent Storage** (Processed Data)
- **Audio files**: Delete after processing OR keep if user opts-in
- **Transcripts**: Database (encrypted at rest)
- **Metadata**: Database
- **Action items**: Database

### 3. **Storage Options for Users**

```typescript
interface StoragePreferences {
  keepOriginalAudio: boolean      // Default: false
  keepProcessedAudio: boolean     // Default: false  
  retentionDays: number          // Default: 90 days
  autoDeleteAfterExport: boolean // Default: false
}
```

## GDPR Requirements

### 1. **Data Minimization**
- Only store what's necessary
- Delete source files after processing (unless user requests otherwise)
- Compress and optimize stored data

### 2. **Purpose Limitation**
- Clearly state: "Audio files are processed to create searchable transcripts"
- Don't use data for unrelated purposes

### 3. **Storage Limitation**
```sql
-- Add to database
ALTER TABLE meetings ADD COLUMN retention_date DATE;
ALTER TABLE meetings ADD COLUMN deletion_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE meetings ADD COLUMN data_sources JSONB; -- Track where data came from

-- Auto-deletion policy
CREATE OR REPLACE FUNCTION auto_delete_expired_meetings()
RETURNS void AS $$
BEGIN
  -- Delete meetings past retention date
  DELETE FROM meetings 
  WHERE retention_date < CURRENT_DATE
  AND deletion_requested = FALSE;
  
  -- Delete orphaned files
  -- This would trigger a cleanup job
END;
$$ LANGUAGE plpgsql;

-- Schedule daily
SELECT cron.schedule('delete-expired-meetings', '0 3 * * *', 'SELECT auto_delete_expired_meetings()');
```

### 4. **User Rights Implementation**

```typescript
// API endpoints needed for GDPR
app.get('/api/gdpr/export/:userId', async (req, res) => {
  // Export all user data in machine-readable format
})

app.delete('/api/gdpr/delete/:userId', async (req, res) => {
  // Delete all user data (right to erasure)
})

app.put('/api/gdpr/consent/:userId', async (req, res) => {
  // Update consent preferences
})

app.get('/api/gdpr/data-sources/:userId', async (req, res) => {
  // Show where each piece of data came from
})
```

### 5. **Consent Management**

```typescript
interface ConsentRecord {
  userId: string
  timestamp: Date
  ipAddress: string
  consentTypes: {
    processing: boolean
    storage: boolean
    analytics: boolean
    marketing: boolean
  }
  version: string // Policy version
}
```

## Implementation Checklist

### Immediate Actions:
1. **Update Terms of Service**
   - Explain data flows
   - Specify retention periods
   - List third-party processors

2. **Privacy Policy Updates**
   - Google Drive is data source, not destination
   - We process but don't permanently store audio (by default)
   - Data deletion policies

3. **Technical Implementation**
```typescript
// services/storage-manager.ts
export class StorageManager {
  async processImportedFile(file: Buffer, userId: string, source: string) {
    const fileId = generateId()
    
    // 1. Store temporarily
    await redis.setex(`temp:${fileId}`, 86400, file) // 24h TTL
    
    // 2. Process
    const transcript = await processAudio(file)
    
    // 3. Check user preferences
    const prefs = await getUserStoragePrefs(userId)
    
    if (prefs.keepOriginalAudio) {
      // Store in Hetzner volume with encryption
      await storeFile(`audio/${userId}/${fileId}`, file, {
        encryption: 'AES-256',
        metadata: { source, importDate: new Date() }
      })
    }
    
    // 4. Log for GDPR compliance
    await db.dataSourceLog.create({
      userId,
      dataType: 'audio_import',
      source, // 'google_drive', 'upload', etc
      timestamp: new Date(),
      fileSize: file.length,
      retained: prefs.keepOriginalAudio
    })
    
    // 5. Clean up temp
    await redis.del(`temp:${fileId}`)
    
    return transcript
  }
}
```

### User-Facing Features:

1. **Privacy Dashboard**
```tsx
export function PrivacyDashboard() {
  return (
    <div>
      <h2>Your Data</h2>
      
      {/* Data sources */}
      <Card>
        <CardTitle>Data Sources</CardTitle>
        <List>
          <ListItem>15 files from Google Drive</ListItem>
          <ListItem>8 files from direct upload</ListItem>
          <ListItem>3 Zoom recordings</ListItem>
        </List>
      </Card>
      
      {/* Storage preferences */}
      <Card>
        <CardTitle>Storage Preferences</CardTitle>
        <Switch label="Keep original audio files" />
        <Select label="Auto-delete after">
          <Option value="30">30 days</Option>
          <Option value="90">90 days</Option>
          <Option value="365">1 year</Option>
          <Option value="never">Never</Option>
        </Select>
      </Card>
      
      {/* Actions */}
      <Card>
        <CardTitle>Your Rights</CardTitle>
        <Button onClick={exportData}>Export All My Data</Button>
        <Button onClick={deleteAccount} variant="destructive">
          Delete My Account & Data
        </Button>
      </Card>
    </div>
  )
}
```

2. **Consent Banner**
```tsx
export function ConsentBanner() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg">
      <h3>We value your privacy</h3>
      <p>
        HangJegyzet.AI processes your meeting audio to create searchable transcripts.
        Audio files are deleted after processing unless you choose to keep them.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => acceptConsent('essential')}>
          Essential Only
        </Button>
        <Button onClick={() => acceptConsent('all')} variant="primary">
          Accept All
        </Button>
        <Link href="/privacy">Customize</Link>
      </div>
    </div>
  )
}
```

## Data Retention Schedule

| Data Type | Default Retention | User Override | GDPR Basis |
|-----------|------------------|---------------|------------|
| Raw Audio | 24 hours | Up to 1 year | Consent |
| Transcripts | 90 days | Unlimited | Legitimate Interest |
| Action Items | 1 year | Unlimited | Contract |
| Analytics | 2 years | N/A | Legitimate Interest |
| Logs | 30 days | N/A | Legal Obligation |

## Third-Party Data Processors

1. **Google Drive**: Data source only (user's data)
2. **Deepgram**: Audio processing (data deleted after 24h)
3. **OpenAI/Anthropic**: Text processing (no training on data)
4. **Hetzner**: Infrastructure (encrypted storage)

## Security Measures

1. **Encryption**
   - At rest: AES-256
   - In transit: TLS 1.3
   - Database: Transparent encryption

2. **Access Control**
   - Row-level security in Supabase
   - API rate limiting
   - IP whitelisting for enterprise

3. **Audit Trail**
   ```sql
   CREATE TABLE audit_log (
     id UUID PRIMARY KEY,
     user_id UUID,
     action TEXT,
     resource_type TEXT,
     resource_id UUID,
     ip_address INET,
     user_agent TEXT,
     timestamp TIMESTAMPTZ DEFAULT NOW()
   );
   ```

## GDPR-Compliant Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  User's Cloud   │     │   Your Server   │     │   Storage       │
│  - Google Drive │────▶│  - Processing   │────▶│  - Encrypted    │
│  - Dropbox      │     │  - Temporary    │     │  - Time-limited │
│  - OneDrive     │     │    storage      │     │  - Audited      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   Database      │
                        │  - Transcripts  │
                        │  - Metadata     │
                        │  - Audit logs   │
                        └─────────────────┘
```