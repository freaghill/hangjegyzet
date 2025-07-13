import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { User } from '@supabase/supabase-js'

// Mock providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

// Test data factories
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: { name: 'Test User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

export const createMockMeeting = (overrides?: any) => ({
  id: 'test-meeting-id',
  title: 'Test Meeting',
  user_id: 'test-user-id',
  file_url: 'https://example.com/test.mp3',
  file_name: 'test.mp3',
  file_size: 1024000,
  duration_seconds: 300,
  status: 'completed',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

export const createMockTranscription = (overrides?: any) => ({
  id: 'test-transcription-id',
  meeting_id: 'test-meeting-id',
  text: 'This is a test transcription',
  language: 'hu',
  mode: 'balanced',
  word_count: 5,
  status: 'completed',
  created_at: new Date().toISOString(),
  ...overrides,
})

export const createMockTeam = (overrides?: any) => ({
  id: 'test-team-id',
  name: 'Test Team',
  slug: 'test-team',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

// Mock API responses
export const mockSuccessResponse = (data: any) => ({
  data,
  error: null,
})

export const mockErrorResponse = (message: string) => ({
  data: null,
  error: { message },
})

// Wait utilities
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// File utilities
export const createMockFile = (
  name: string = 'test.mp3',
  size: number = 1024,
  type: string = 'audio/mp3'
): File => {
  const blob = new Blob(['test content'], { type })
  return new File([blob], name, { type })
}

// re-export everything
export * from '@testing-library/react'
export { customRender as render }