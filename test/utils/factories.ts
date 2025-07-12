// Test data factories for consistent test data generation

export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'user',
  created_at: new Date().toISOString(),
  ...overrides,
})

export const createMockOrganization = (overrides = {}) => ({
  id: 'org-123',
  name: 'Test Organization',
  slug: 'test-org',
  subscription_tier: 'professional',
  monthly_minutes_limit: 1000,
  monthly_minutes_used: 100,
  created_at: new Date().toISOString(),
  ...overrides,
})

export const createMockMeeting = (overrides = {}) => ({
  id: 'meet-123',
  title: 'Test Meeting',
  organization_id: 'org-123',
  created_by: 'user-123',
  status: 'completed',
  duration_seconds: 3600,
  source: 'upload',
  created_at: new Date().toISOString(),
  transcript: {
    text: 'This is a test transcript',
    segments: [
      {
        text: 'Hello, this is a test.',
        start: 0,
        end: 2,
        speaker: 'Speaker 1',
      },
    ],
    language: 'hu',
    duration: 3600,
  },
  summary: 'This is a test summary of the meeting.',
  key_points: ['Point 1', 'Point 2', 'Point 3'],
  action_items: [
    {
      text: 'Complete task 1',
      assignee: 'John Doe',
      dueDate: '2024-02-01',
      priority: 'high',
    },
  ],
  ...overrides,
})

export const createMockTranscriptionJob = (overrides = {}) => ({
  meetingId: 'meet-123',
  filePath: '/tmp/test-audio.mp3',
  userId: 'user-123',
  organizationId: 'org-123',
  mode: 'balanced',
  language: 'hu',
  ...overrides,
})

export const createMockWebhook = (overrides = {}) => ({
  id: 'webhook-123',
  organization_id: 'org-123',
  name: 'Test Webhook',
  type: 'webhook',
  webhook_url: 'https://example.com/webhook',
  events: ['meeting.completed'],
  is_active: true,
  created_at: new Date().toISOString(),
  ...overrides,
})

export const createMockExportOptions = (overrides = {}) => ({
  format: 'pdf',
  templateId: 'business_summary',
  includeTranscript: true,
  includeSummary: true,
  includeActionItems: true,
  includeAnalytics: false,
  ...overrides,
})

export const createMockBranding = (overrides = {}) => ({
  logo: {
    url: 'https://example.com/logo.png',
    position: 'left',
  },
  colors: {
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#f59e0b',
    text: '#1f2937',
    background: '#ffffff',
  },
  fonts: {
    heading: 'Inter',
    body: 'Inter',
    size: {
      base: 14,
      h1: 28,
      h2: 24,
      h3: 20,
    },
  },
  header: {
    show: true,
    includePageNumbers: true,
    includeLogo: true,
  },
  footer: {
    show: true,
    includeDate: true,
    includeConfidentiality: false,
  },
  ...overrides,
})