import { createClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/lib/admin/auth'
import UserManagementClient from '@/components/admin/user-management-client'

export default async function UsersPage() {
  await checkAdminAuth()
  const supabase = await createClient()
  
  // Fetch users with their organizations
  const { data: users, error } = await supabase
    .from('profiles')
    .select(`
      *,
      organizations (
        id,
        name,
        subscription_tier,
        subscription_ends_at
      )
    `)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching users:', error)
    return <div>Error loading users</div>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-2">Manage users and their permissions</p>
      </div>

      <UserManagementClient initialUsers={users || []} />
    </div>
  )
}