import { createClient } from '@supabase/supabase-js'

// Create a Supabase client with the service role key
// This client has admin privileges and should only be used server-side
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Admin-specific functions
export async function deleteUser(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) throw error
}

export async function listUsers() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers()
  if (error) throw error
  return data.users
}

export async function createBucket(bucketName: string, isPublic = false) {
  const { data, error } = await supabaseAdmin.storage.createBucket(bucketName, {
    public: isPublic,
  })
  if (error) throw error
  return data
}

export async function deleteFile(bucketName: string, path: string) {
  const { error } = await supabaseAdmin.storage
    .from(bucketName)
    .remove([path])
  if (error) throw error
}

// Export createAdminClient for compatibility
export const createAdminClient = () => supabaseAdmin