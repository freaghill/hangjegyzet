import { NextRequest } from 'next/server'
import { POST as signUp } from '@/app/api/auth/signup/route'
import { POST as signIn } from '@/app/api/auth/signin/route'
import { POST as signOut } from '@/app/api/auth/signout/route'
import { createClient } from '@supabase/supabase-js'
import { createMockUser, mockSuccessResponse, mockErrorResponse } from '@/__tests__/test-utils'

jest.mock('@supabase/supabase-js')

describe('Auth API Integration Tests', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    mockSupabaseClient = {
      auth: {
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
        signOut: jest.fn(),
        getUser: jest.fn(),
      },
      from: jest.fn(() => ({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn(),
      })),
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('POST /api/auth/signup', () => {
    it('should successfully sign up a new user', async () => {
      const mockUser = createMockUser({ email: 'new@example.com' })
      const signUpData = {
        email: 'new@example.com',
        password: 'Test123!',
        name: 'New User',
      }

      mockSupabaseClient.auth.signUp.mockResolvedValue(
        mockSuccessResponse({ user: mockUser, session: { access_token: 'token' } })
      )
      mockSupabaseClient.from().insert().single.mockResolvedValue(
        mockSuccessResponse({ id: 'profile-id' })
      )

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signUpData),
      })

      const response = await signUp(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
      })
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: { name: signUpData.name },
        },
      })
    })

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'new@example.com',
        // missing password and name
      }

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      })

      const response = await signUp(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled()
    })

    it('should handle duplicate email errors', async () => {
      const signUpData = {
        email: 'existing@example.com',
        password: 'Test123!',
        name: 'Test User',
      }

      mockSupabaseClient.auth.signUp.mockResolvedValue(
        mockErrorResponse('User already registered')
      )

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signUpData),
      })

      const response = await signUp(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('User already registered')
    })
  })

  describe('POST /api/auth/signin', () => {
    it('should successfully sign in a user', async () => {
      const mockUser = createMockUser()
      const credentials = {
        email: 'test@example.com',
        password: 'Test123!',
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue(
        mockSuccessResponse({ 
          user: mockUser, 
          session: { access_token: 'token', refresh_token: 'refresh' } 
        })
      )

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })

      const response = await signIn(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
      })
      expect(data.session).toBeDefined()
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: credentials.email,
        password: credentials.password,
      })
    })

    it('should handle invalid credentials', async () => {
      const credentials = {
        email: 'wrong@example.com',
        password: 'wrongpassword',
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue(
        mockErrorResponse('Invalid login credentials')
      )

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })

      const response = await signIn(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Invalid login credentials')
    })

    it('should validate email format', async () => {
      const credentials = {
        email: 'invalid-email',
        password: 'Test123!',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })

      const response = await signIn(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid email format')
    })
  })

  describe('POST /api/auth/signout', () => {
    it('should successfully sign out a user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue(
        mockSuccessResponse({ user: createMockUser() })
      )
      mockSupabaseClient.auth.signOut.mockResolvedValue(
        mockSuccessResponse(null)
      )

      const request = new NextRequest('http://localhost:3000/api/auth/signout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
      })

      const response = await signOut(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })

    it('should handle unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue(
        mockSuccessResponse({ user: null })
      )

      const request = new NextRequest('http://localhost:3000/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await signOut(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Unauthorized')
      expect(mockSupabaseClient.auth.signOut).not.toHaveBeenCalled()
    })

    it('should handle sign out errors', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue(
        mockSuccessResponse({ user: createMockUser() })
      )
      mockSupabaseClient.auth.signOut.mockResolvedValue(
        mockErrorResponse('Network error')
      )

      const request = new NextRequest('http://localhost:3000/api/auth/signout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token'
        },
      })

      const response = await signOut(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Network error')
    })
  })
})