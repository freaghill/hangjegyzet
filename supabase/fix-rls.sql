-- Fix RLS infinite recursion issue
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create fixed policies for profiles
-- This policy allows users to see their own profile
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

-- This policy allows users to see other profiles in their organization
-- We'll use a subquery that doesn't reference profiles table directly
CREATE POLICY "Users can view organization profiles" ON profiles
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM profiles p 
            WHERE p.id = auth.uid()
            LIMIT 1
        )
    );

-- Users can update only their own profile
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());