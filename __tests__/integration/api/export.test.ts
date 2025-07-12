import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/meetings/[id]/export/route'
import { createMockSupabaseClient, mockAuthState } from '@/test/utils/supabase-mock'
import { createMockMeeting, createMockUser } from '@/test/utils/factories'

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/export/export-service', () => ({
  ExportService: jest.fn().mockImplementation(() => ({
    exportMeeting: jest.fn().mockResolvedValue({
      success: true,
      url: 'https://example.com/export.pdf',
    }),
  })),
}))

jest.mock('@/lib/security/rate-limiter', () => ({
  rateLimiter: {
    check: jest.fn().mockResolvedValue({ success: true }),
  },
}))

describe('Export API Endpoint', () => {
  let mockSupabase: any
  let mockRequest: Partial<NextRequest>
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    mockSupabase = createMockSupabaseClient()
    require('@/lib/supabase/server').createClient.mockResolvedValue(mockSupabase)
    
    // Mock authenticated user
    const mockUser = createMockUser()
    mockAuthState(mockSupabase, mockUser, { user: mockUser })
    
    // Mock request
    mockRequest = {
      url: 'http://localhost:3000/api/meetings/meet-123/export',
      headers: new Headers({
        'x-forwarded-for': '127.0.0.1',
      }),
      json: jest.fn().mockResolvedValue({
        format: 'pdf',
        includeTranscript: true,
      }),
    }
  })
  
  describe('POST /api/meetings/[id]/export', () => {
    it('should export meeting with valid request', async () => {
      const mockMeeting = createMockMeeting()
      
      // Mock meeting ownership check
      mockSupabase.from('meetings').select.mockReturnThis()
      mockSupabase.from('meetings').eq.mockReturnThis()
      mockSupabase.from('meetings').single.mockResolvedValue({
        data: mockMeeting,
        error: null,
      })
      
      // Execute request
      const response = await POST(mockRequest as NextRequest, {
        params: { id: 'meet-123' },
      })
      
      // Verify response
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toEqual({
        success: true,
        url: 'https://example.com/export.pdf',
      })
      
      // Verify export service was called
      const ExportService = require('@/lib/export/export-service').ExportService
      const exportService = new ExportService()
      expect(exportService.exportMeeting).toHaveBeenCalledWith(
        'meet-123',
        expect.objectContaining({
          format: 'pdf',
          includeTranscript: true,
        })
      )
    })
    
    it('should validate export format', async () => {
      mockRequest.json = jest.fn().mockResolvedValue({
        format: 'invalid',
      })
      
      const response = await POST(mockRequest as NextRequest, {
        params: { id: 'meet-123' },
      })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid format')
    })
    
    it('should enforce rate limiting', async () => {
      const rateLimiter = require('@/lib/security/rate-limiter').rateLimiter
      rateLimiter.check.mockResolvedValueOnce({
        success: false,
        retryAfter: 60,
      })
      
      const response = await POST(mockRequest as NextRequest, {
        params: { id: 'meet-123' },
      })
      
      expect(response.status).toBe(429)
      const data = await response.json()
      expect(data.error).toContain('Too many requests')
    })
    
    it('should require authentication', async () => {
      // Mock unauthenticated user
      mockAuthState(mockSupabase, null, null)
      
      const response = await POST(mockRequest as NextRequest, {
        params: { id: 'meet-123' },
      })
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })
    
    it('should check meeting ownership', async () => {
      // Mock meeting not found (user doesn't own it)
      mockSupabase.from('meetings').single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })
      
      const response = await POST(mockRequest as NextRequest, {
        params: { id: 'meet-123' },
      })
      
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Meeting not found')
    })
  })
  
  describe('GET /api/meetings/[id]/export', () => {
    it('should return export options', async () => {
      const response = await GET(mockRequest as NextRequest, {
        params: { id: 'meet-123' },
      })
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data).toEqual({
        formats: ['pdf', 'docx', 'html', 'txt', 'csv'],
        templates: expect.arrayContaining([
          expect.objectContaining({
            id: 'business_summary',
            name: expect.any(String),
          }),
        ]),
        options: {
          includeTranscript: true,
          includeSummary: true,
          includeActionItems: true,
          includeAnalytics: false,
        },
      })
    })
  })
})