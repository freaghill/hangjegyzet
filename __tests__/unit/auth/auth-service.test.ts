import { createClient } from '@supabase/supabase-js'
import { AuthService } from '@/lib/auth/auth-service'
import { createMockUser, mockSuccessResponse, mockErrorResponse } from '@/__tests__/test-utils'

jest.mock('@supabase/supabase-js')

describe('AuthService', () => {
  let authService: AuthService
  let mockSupabaseClient: any

  beforeEach(() => {
    mockSupabaseClient = {
      auth: {
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
        signOut: jest.fn(),
        resetPasswordForEmail: jest.fn(),
        updateUser: jest.fn(),
        getUser: jest.fn(),
        onAuthStateChange: jest.fn(() => ({
          data: { subscription: { unsubscribe: jest.fn() } }
        })),
      },
      from: jest.fn(() => ({
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
      })),
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
    authService = new AuthService()
  })

  describe('signUp', () => {
    it('should successfully sign up a new user', async () => {
      const mockUser = createMockUser()
      const signUpData = {
        email: 'new@example.com',
        password: 'Test123!',
        name: 'New User',
      }

      mockSupabaseClient.auth.signUp.mockResolvedValue(
        mockSuccessResponse({ user: mockUser, session: {} })
      )

      const result = await authService.signUp(signUpData)

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: { name: signUpData.name },
        },
      })
      expect(result.user).toEqual(mockUser)
      expect(result.error).toBeNull()
    })

    it('should handle sign up errors', async () => {
      const signUpData = {
        email: 'invalid-email',
        password: 'weak',
        name: 'Test',
      }

      mockSupabaseClient.auth.signUp.mockResolvedValue(
        mockErrorResponse('Invalid email or password')
      )

      const result = await authService.signUp(signUpData)

      expect(result.user).toBeNull()
      expect(result.error).toBe('Invalid email or password')
    })

    it('should validate password strength', async () => {
      const signUpData = {
        email: 'test@example.com',
        password: '123', // Too weak
        name: 'Test User',
      }

      const result = await authService.signUp(signUpData)

      expect(result.user).toBeNull()
      expect(result.error).toContain('Password must be at least')
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled()
    })
  })

  describe('signIn', () => {
    it('should successfully sign in a user', async () => {
      const mockUser = createMockUser()
      const credentials = {
        email: 'test@example.com',
        password: 'Test123!',
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue(
        mockSuccessResponse({ user: mockUser, session: {} })
      )

      const result = await authService.signIn(credentials)

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: credentials.email,
        password: credentials.password,
      })
      expect(result.user).toEqual(mockUser)
      expect(result.error).toBeNull()
    })

    it('should handle invalid credentials', async () => {
      const credentials = {
        email: 'wrong@example.com',
        password: 'wrongpassword',
      }

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue(
        mockErrorResponse('Invalid login credentials')
      )

      const result = await authService.signIn(credentials)

      expect(result.user).toBeNull()
      expect(result.error).toBe('Invalid login credentials')
    })
  })

  describe('signOut', () => {
    it('should successfully sign out a user', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue(
        mockSuccessResponse(null)
      )

      const result = await authService.signOut()

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
      expect(result.error).toBeNull()
    })

    it('should handle sign out errors', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue(
        mockErrorResponse('Network error')
      )

      const result = await authService.signOut()

      expect(result.error).toBe('Network error')
    })
  })

  describe('resetPassword', () => {
    it('should send password reset email', async () => {
      const email = 'test@example.com'

      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue(
        mockSuccessResponse(null)
      )

      const result = await authService.resetPassword(email)

      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(email, {
        redirectTo: expect.stringContaining('/auth/reset-password'),
      })
      expect(result.error).toBeNull()
    })

    it('should validate email format', async () => {
      const invalidEmail = 'not-an-email'

      const result = await authService.resetPassword(invalidEmail)

      expect(result.error).toContain('Invalid email')
      expect(mockSupabaseClient.auth.resetPasswordForEmail).not.toHaveBeenCalled()
    })
  })

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updates = {
        name: 'Updated Name',
        avatar_url: 'https://example.com/avatar.jpg',
      }

      mockSupabaseClient.auth.updateUser.mockResolvedValue(
        mockSuccessResponse({ user: createMockUser(updates) })
      )

      const result = await authService.updateProfile(updates)

      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        data: updates,
      })
      expect(result.user?.user_metadata).toMatchObject(updates)
      expect(result.error).toBeNull()
    })

    it('should handle update errors', async () => {
      const updates = { name: '' } // Invalid update

      mockSupabaseClient.auth.updateUser.mockResolvedValue(
        mockErrorResponse('Name cannot be empty')
      )

      const result = await authService.updateProfile(updates)

      expect(result.error).toBe('Name cannot be empty')
    })
  })

  describe('getCurrentUser', () => {
    it('should return current authenticated user', async () => {
      const mockUser = createMockUser()

      mockSupabaseClient.auth.getUser.mockResolvedValue(
        mockSuccessResponse({ user: mockUser })
      )

      const result = await authService.getCurrentUser()

      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled()
      expect(result).toEqual(mockUser)
    })

    it('should return null when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue(
        mockSuccessResponse({ user: null })
      )

      const result = await authService.getCurrentUser()

      expect(result).toBeNull()
    })
  })

  describe('onAuthStateChange', () => {
    it('should subscribe to auth state changes', () => {
      const callback = jest.fn()
      const mockUnsubscribe = jest.fn()

      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } }
      })

      const { unsubscribe } = authService.onAuthStateChange(callback)

      expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalledWith(callback)
      
      unsubscribe()
      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })
})