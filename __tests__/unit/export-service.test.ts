import { ExportService } from '@/lib/export/export-service'
import { PDFGenerator } from '@/lib/export/pdf-generator'
import { createMockSupabaseClient, mockTableResponse, mockStorageUpload } from '@/test/utils/supabase-mock'
import { createMockMeeting, createMockOrganization, createMockBranding, createMockExportOptions } from '@/test/utils/factories'

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/export/pdf-generator')
jest.mock('@/lib/export/word-generator')

describe('Export Service', () => {
  let exportService: ExportService
  let mockSupabase: any
  let mockPDFGenerator: jest.Mocked<PDFGenerator>
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    exportService = new ExportService()
    mockSupabase = createMockSupabaseClient()
    require('@/lib/supabase/server').createClient.mockResolvedValue(mockSupabase)
    
    // Mock PDF generator
    mockPDFGenerator = {
      initialize: jest.fn(),
      generateBrandedPDF: jest.fn().mockResolvedValue(Buffer.from('test pdf')),
      cleanup: jest.fn(),
    } as any
    
    ;(PDFGenerator as jest.Mock).mockImplementation(() => mockPDFGenerator)
  })
  
  describe('exportMeeting', () => {
    it('should export meeting as branded PDF', async () => {
      const meetingId = 'meet-123'
      const mockMeeting = createMockMeeting()
      const mockOrg = createMockOrganization()
      const mockBranding = createMockBranding()
      const exportOptions = createMockExportOptions({ format: 'pdf' })
      
      // Mock meeting data with organization
      mockTableResponse(mockSupabase, 'meetings', 'single', {
        data: {
          ...mockMeeting,
          organization: mockOrg,
        },
        error: null,
      })
      
      // Mock organization branding
      mockTableResponse(mockSupabase, 'organizations', 'single', {
        data: {
          branding_settings: mockBranding,
        },
        error: null,
      })
      
      // Mock storage upload
      const publicUrl = 'https://example.com/export.pdf'
      mockStorageUpload(mockSupabase, 'exports', 'export-123.pdf', publicUrl)
      
      // Execute export
      const result = await exportService.exportMeeting(meetingId, exportOptions)
      
      // Verify PDF generator was called with branding
      expect(mockPDFGenerator.generateBrandedPDF).toHaveBeenCalledWith(
        'business_summary',
        expect.objectContaining({
          meeting: expect.objectContaining({
            id: meetingId,
            title: mockMeeting.title,
          }),
          organization: expect.objectContaining({
            name: mockOrg.name,
          }),
        }),
        mockBranding
      )
      
      // Verify file upload
      expect(mockSupabase.storage.from('exports').upload).toHaveBeenCalledWith(
        expect.stringMatching(/^export-meet-123-\d+\.pdf$/),
        expect.any(Buffer),
        expect.objectContaining({
          contentType: 'application/pdf',
        })
      )
      
      // Verify export tracking
      expect(mockSupabase.from('meeting_exports').insert).toHaveBeenCalledWith(
        expect.objectContaining({
          meeting_id: meetingId,
          format: 'pdf',
          options: exportOptions,
        })
      )
      
      // Verify result
      expect(result).toEqual({
        success: true,
        url: publicUrl,
      })
      
      // Verify cleanup
      expect(mockPDFGenerator.cleanup).toHaveBeenCalled()
    })
    
    it('should handle custom branding overrides', async () => {
      const mockMeeting = createMockMeeting()
      const customBranding = {
        logo: 'https://custom.com/logo.png',
        primaryColor: '#ff0000',
        companyName: 'Custom Company',
      }
      
      mockTableResponse(mockSupabase, 'meetings', 'single', {
        data: mockMeeting,
        error: null,
      })
      
      await exportService.exportMeeting('meet-123', {
        format: 'pdf',
        branding: customBranding,
      })
      
      // Verify custom branding was applied
      expect(mockPDFGenerator.generateBrandedPDF).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          logo: {
            url: customBranding.logo,
            position: 'left',
          },
          colors: expect.objectContaining({
            primary: customBranding.primaryColor,
          }),
        })
      )
    })
    
    it('should export meeting as Word document', async () => {
      const mockMeeting = createMockMeeting()
      mockTableResponse(mockSupabase, 'meetings', 'single', {
        data: mockMeeting,
        error: null,
      })
      
      const publicUrl = 'https://example.com/export.docx'
      mockStorageUpload(mockSupabase, 'exports', 'export-123.docx', publicUrl)
      
      const result = await exportService.exportMeeting('meet-123', {
        format: 'docx',
      })
      
      expect(result).toEqual({
        success: true,
        url: publicUrl,
      })
    })
    
    it('should handle export failure gracefully', async () => {
      mockTableResponse(mockSupabase, 'meetings', 'single', {
        data: null,
        error: { message: 'Meeting not found' },
      })
      
      const result = await exportService.exportMeeting('invalid-id', {
        format: 'pdf',
      })
      
      expect(result).toEqual({
        success: false,
        error: 'Meeting not found',
      })
    })
    
    it('should handle unsupported format', async () => {
      const mockMeeting = createMockMeeting()
      mockTableResponse(mockSupabase, 'meetings', 'single', {
        data: mockMeeting,
        error: null,
      })
      
      const result = await exportService.exportMeeting('meet-123', {
        format: 'invalid' as any,
      })
      
      expect(result).toEqual({
        success: false,
        error: 'Unsupported format',
      })
    })
  })
  
  describe('Export Options', () => {
    it('should respect include flags', async () => {
      const mockMeeting = createMockMeeting({
        transcript: { segments: [{ text: 'Full transcript' }] },
        summary: 'Meeting summary',
        action_items: [{ text: 'Task 1' }],
      })
      
      mockTableResponse(mockSupabase, 'meetings', 'single', {
        data: mockMeeting,
        error: null,
      })
      
      // Export without transcript
      await exportService.exportMeeting('meet-123', {
        format: 'pdf',
        includeTranscript: false,
        includeSummary: true,
        includeActionItems: true,
      })
      
      expect(mockPDFGenerator.generateBrandedPDF).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          meeting: expect.objectContaining({
            transcript: undefined, // Should be excluded
            summary: 'Meeting summary',
            actionItems: [{ text: 'Task 1' }],
          }),
        }),
        expect.any(Object)
      )
    })
  })
})