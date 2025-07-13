import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/meetings/route'
import { GET as getMeeting } from '@/app/api/meetings/[id]/route'
import { createClient } from '@supabase/supabase-js'
import { createMockUser, createMockMeeting, mockSuccessResponse, mockErrorResponse } from '@/__tests__/test-utils'

jest.mock('@supabase/supabase-js')

describe('Meetings API Integration Tests', () => {
  let mockSupabaseClient: any
  const mockUser = createMockUser()

  beforeEach(() => {
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue(mockSuccessResponse({ user: mockUser })),
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      })),
      storage: {
        from: jest.fn(() => ({
          upload: jest.fn(),
          createSignedUrl: jest.fn(),
        })),
      },
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('GET /api/meetings', () => {
    it('should return user meetings', async () => {
      const mockMeetings = [
        createMockMeeting({ id: '1', title: 'Meeting 1' }),
        createMockMeeting({ id: '2', title: 'Meeting 2' }),
      ]

      mockSupabaseClient.from().select().eq().order().limit.mockResolvedValue(
        mockSuccessResponse(mockMeetings)
      )

      const request = new NextRequest('http://localhost:3000/api/meetings', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer valid-token' },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.meetings).toHaveLength(2)
      expect(data.meetings[0].title).toBe('Meeting 1')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('meetings')
      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('user_id', mockUser.id)
    })

    it('should handle pagination', async () => {
      const mockMeetings = Array(10).fill(null).map((_, i) => 
        createMockMeeting({ id: `${i}`, title: `Meeting ${i}` })
      )

      mockSupabaseClient.from().select().eq().order().limit.mockResolvedValue(
        mockSuccessResponse(mockMeetings)
      )

      const request = new NextRequest('http://localhost:3000/api/meetings?page=2&limit=5', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer valid-token' },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockSupabaseClient.from().limit).toHaveBeenCalledWith(5)
      expect(data.pagination).toMatchObject({
        page: 2,
        limit: 5,
      })
    })

    it('should handle unauthorized requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue(
        mockSuccessResponse({ user: null })
      )

      const request = new NextRequest('http://localhost:3000/api/meetings', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Unauthorized')
    })
  })

  describe('POST /api/meetings', () => {
    it('should create a new meeting', async () => {
      const meetingData = {
        title: 'New Meeting',
        description: 'Meeting description',
        scheduled_for: new Date().toISOString(),
      }

      const createdMeeting = createMockMeeting({
        ...meetingData,
        id: 'new-meeting-id',
        user_id: mockUser.id,
      })

      mockSupabaseClient.from().insert().select().single.mockResolvedValue(
        mockSuccessResponse(createdMeeting)
      )

      const request = new NextRequest('http://localhost:3000/api/meetings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(meetingData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.meeting).toMatchObject({
        id: 'new-meeting-id',
        title: 'New Meeting',
        user_id: mockUser.id,
      })
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('meetings')
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith({
        ...meetingData,
        user_id: mockUser.id,
        status: 'pending',
      })
    })

    it('should validate required fields', async () => {
      const invalidData = {
        // missing title
        description: 'Meeting description',
      }

      const request = new NextRequest('http://localhost:3000/api/meetings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(invalidData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Title is required')
      expect(mockSupabaseClient.from().insert).not.toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      const meetingData = {
        title: 'New Meeting',
      }

      mockSupabaseClient.from().insert().select().single.mockResolvedValue(
        mockErrorResponse('Database error')
      )

      const request = new NextRequest('http://localhost:3000/api/meetings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
        body: JSON.stringify(meetingData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Failed to create meeting')
    })
  })

  describe('GET /api/meetings/[id]', () => {
    it('should return a specific meeting', async () => {
      const meetingId = 'test-meeting-id'
      const mockMeeting = createMockMeeting({ 
        id: meetingId,
        user_id: mockUser.id,
        transcription: {
          id: 'transcription-id',
          text: 'Meeting transcription text',
          status: 'completed',
        }
      })

      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValue(
        mockSuccessResponse(mockMeeting)
      )

      const request = new NextRequest(`http://localhost:3000/api/meetings/${meetingId}`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer valid-token' },
      })

      const response = await getMeeting(request, { params: { id: meetingId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.meeting).toMatchObject({
        id: meetingId,
        title: mockMeeting.title,
      })
      expect(data.meeting.transcription).toBeDefined()
      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('id', meetingId)
      expect(mockSupabaseClient.from().eq).toHaveBeenCalledWith('user_id', mockUser.id)
    })

    it('should return 404 for non-existent meeting', async () => {
      const meetingId = 'non-existent-id'

      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValue(
        mockErrorResponse('Not found')
      )

      const request = new NextRequest(`http://localhost:3000/api/meetings/${meetingId}`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer valid-token' },
      })

      const response = await getMeeting(request, { params: { id: meetingId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('Meeting not found')
    })

    it('should prevent access to other users meetings', async () => {
      const meetingId = 'other-user-meeting'
      const otherUserMeeting = createMockMeeting({ 
        id: meetingId,
        user_id: 'other-user-id', // Different user
      })

      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValue(
        mockSuccessResponse(null) // No meeting found for current user
      )

      const request = new NextRequest(`http://localhost:3000/api/meetings/${meetingId}`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer valid-token' },
      })

      const response = await getMeeting(request, { params: { id: meetingId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('Meeting not found')
    })
  })
})