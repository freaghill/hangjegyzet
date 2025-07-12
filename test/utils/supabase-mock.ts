import { createMockUser, createMockOrganization } from './factories'

export const createMockSupabaseClient = (overrides = {}) => {
  const mockUser = createMockUser()
  
  const mockClient = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ 
        data: { user: mockUser }, 
        error: null 
      }),
      getSession: jest.fn().mockResolvedValue({ 
        data: { 
          session: {
            user: mockUser,
            access_token: 'test-token',
            refresh_token: 'test-refresh-token',
          }
        }, 
        error: null 
      }),
      signIn: jest.fn().mockResolvedValue({ 
        data: { user: mockUser }, 
        error: null 
      }),
      signUp: jest.fn().mockResolvedValue({ 
        data: { user: mockUser }, 
        error: null 
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
    
    from: jest.fn((table: string) => {
      const chainMethods = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        like: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        execute: jest.fn().mockResolvedValue({ data: [], error: null }),
      }
      
      // Override the final method to return resolved value
      const lastMethod = Object.keys(chainMethods)[Object.keys(chainMethods).length - 1]
      chainMethods[lastMethod] = jest.fn().mockResolvedValue({ data: [], error: null })
      
      return chainMethods
    }),
    
    storage: {
      from: jest.fn((bucket: string) => ({
        upload: jest.fn().mockResolvedValue({ 
          data: { path: 'test-path' }, 
          error: null 
        }),
        download: jest.fn().mockResolvedValue({ 
          data: new Blob(['test content']), 
          error: null 
        }),
        remove: jest.fn().mockResolvedValue({ 
          data: { message: 'Deleted' }, 
          error: null 
        }),
        list: jest.fn().mockResolvedValue({ 
          data: [], 
          error: null 
        }),
        getPublicUrl: jest.fn().mockReturnValue({ 
          data: { publicUrl: 'https://example.com/file.pdf' } 
        }),
      })),
    },
    
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn().mockReturnThis(),
    })),
    
    removeChannel: jest.fn().mockResolvedValue({ error: null }),
    
    ...overrides,
  }
  
  return mockClient
}

// Helper to mock specific table responses
export const mockTableResponse = (
  supabaseClient: any,
  table: string,
  method: string,
  response: any
) => {
  const fromMock = supabaseClient.from(table)
  fromMock[method].mockResolvedValueOnce(response)
  return fromMock
}

// Helper to mock authentication state
export const mockAuthState = (
  supabaseClient: any,
  user: any = null,
  session: any = null
) => {
  supabaseClient.auth.getUser.mockResolvedValue({
    data: { user },
    error: user ? null : { message: 'Not authenticated' },
  })
  
  supabaseClient.auth.getSession.mockResolvedValue({
    data: { session },
    error: session ? null : { message: 'No session' },
  })
}

// Helper to mock storage operations
export const mockStorageUpload = (
  supabaseClient: any,
  bucket: string,
  path: string,
  publicUrl: string
) => {
  const storageMock = supabaseClient.storage.from(bucket)
  
  storageMock.upload.mockResolvedValueOnce({
    data: { path },
    error: null,
  })
  
  storageMock.getPublicUrl.mockReturnValueOnce({
    data: { publicUrl },
  })
  
  return storageMock
}