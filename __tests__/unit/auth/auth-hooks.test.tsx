import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from '@/hooks/use-auth'
import { AuthService } from '@/lib/auth/auth-service'
import { createMockUser } from '@/__tests__/test-utils'

jest.mock('@/lib/auth/auth-service')

describe('useAuth hook', () => {
  let mockAuthService: jest.Mocked<AuthService>

  beforeEach(() => {
    mockAuthService = {
      getCurrentUser: jest.fn(),
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      resetPassword: jest.fn(),
      updateProfile: jest.fn(),
      onAuthStateChange: jest.fn(),
    } as any

    ;(AuthService as jest.Mock).mockImplementation(() => mockAuthService)
  })

  describe('initialization', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useAuth())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should load current user on mount', async () => {
      const mockUser = createMockUser()
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser)
      mockAuthService.onAuthStateChange.mockReturnValue({
        unsubscribe: jest.fn()
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.user).toEqual(mockUser)
        expect(result.current.isAuthenticated).toBe(true)
      })
    })

    it('should handle auth state changes', async () => {
      let authCallback: any
      mockAuthService.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback
        return { unsubscribe: jest.fn() }
      })

      const { result } = renderHook(() => useAuth())
      const mockUser = createMockUser()

      // Simulate auth state change
      act(() => {
        authCallback('SIGNED_IN', { user: mockUser })
      })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
        expect(result.current.isAuthenticated).toBe(true)
      })

      // Simulate sign out
      act(() => {
        authCallback('SIGNED_OUT', { user: null })
      })

      await waitFor(() => {
        expect(result.current.user).toBeNull()
        expect(result.current.isAuthenticated).toBe(false)
      })
    })
  })

  describe('signIn', () => {
    it('should sign in user successfully', async () => {
      const mockUser = createMockUser()
      const credentials = { email: 'test@example.com', password: 'Test123!' }
      
      mockAuthService.signIn.mockResolvedValue({
        user: mockUser,
        session: {} as any,
        error: null
      })

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        const response = await result.current.signIn(credentials)
        expect(response.user).toEqual(mockUser)
        expect(response.error).toBeNull()
      })

      expect(mockAuthService.signIn).toHaveBeenCalledWith(credentials)
    })

    it('should handle sign in errors', async () => {
      const credentials = { email: 'test@example.com', password: 'wrong' }
      
      mockAuthService.signIn.mockResolvedValue({
        user: null,
        session: null,
        error: 'Invalid credentials'
      })

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        const response = await result.current.signIn(credentials)
        expect(response.user).toBeNull()
        expect(response.error).toBe('Invalid credentials')
      })
    })
  })

  describe('signUp', () => {
    it('should sign up user successfully', async () => {
      const mockUser = createMockUser()
      const signUpData = {
        email: 'new@example.com',
        password: 'Test123!',
        name: 'New User'
      }
      
      mockAuthService.signUp.mockResolvedValue({
        user: mockUser,
        session: {} as any,
        error: null
      })

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        const response = await result.current.signUp(signUpData)
        expect(response.user).toEqual(mockUser)
        expect(response.error).toBeNull()
      })

      expect(mockAuthService.signUp).toHaveBeenCalledWith(signUpData)
    })
  })

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      mockAuthService.signOut.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        const response = await result.current.signOut()
        expect(response.error).toBeNull()
      })

      expect(mockAuthService.signOut).toHaveBeenCalled()
    })
  })

  describe('resetPassword', () => {
    it('should send password reset email', async () => {
      const email = 'test@example.com'
      mockAuthService.resetPassword.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        const response = await result.current.resetPassword(email)
        expect(response.error).toBeNull()
      })

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(email)
    })
  })

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const mockUser = createMockUser()
      const updates = { name: 'Updated Name' }
      
      mockAuthService.updateProfile.mockResolvedValue({
        user: { ...mockUser, user_metadata: { ...mockUser.user_metadata, ...updates } },
        error: null
      })

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        const response = await result.current.updateProfile(updates)
        expect(response.error).toBeNull()
        expect(response.user?.user_metadata.name).toBe('Updated Name')
      })

      expect(mockAuthService.updateProfile).toHaveBeenCalledWith(updates)
    })
  })

  describe('cleanup', () => {
    it('should unsubscribe from auth state changes on unmount', () => {
      const mockUnsubscribe = jest.fn()
      mockAuthService.onAuthStateChange.mockReturnValue({
        unsubscribe: mockUnsubscribe
      })

      const { unmount } = renderHook(() => useAuth())
      
      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })
})