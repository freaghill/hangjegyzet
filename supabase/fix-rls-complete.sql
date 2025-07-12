-- Temporarily disable RLS to test if that's the issue
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Owners can update their organization" ON organizations;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view organization profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create simplified RLS policies

-- Re-enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Enable read access for authenticated users to their org" ON organizations
    FOR SELECT
    TO authenticated
    USING (
        id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Enable insert for service role only" ON organizations
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Profiles policies  
CREATE POLICY "Enable read access for users to their profile" ON profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Enable insert for service role only" ON profiles
    FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Enable update for users on their own profile" ON profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Grant necessary permissions for the trigger function
GRANT ALL ON organizations TO postgres, service_role;
GRANT ALL ON profiles TO postgres, service_role;

SELECT 'RLS policies updated successfully' as status;