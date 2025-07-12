-- Debug signup issues
-- First, let's check if the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Check if the function exists
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'handle_new_user';

-- Check the auth schema
SELECT 
    schemaname,
    tablename
FROM pg_tables
WHERE schemaname = 'auth';

-- Let's also create a simpler version of the trigger function for testing
CREATE OR REPLACE FUNCTION handle_new_user_simple()
RETURNS TRIGGER AS $$
BEGIN
    -- Just create a basic organization and profile
    INSERT INTO public.organizations (name, slug, subscription_tier)
    VALUES (
        'Test Org ' || NEW.email,
        'org-' || substring(NEW.id::text from 1 for 8),
        'trial'
    );
    
    INSERT INTO public.profiles (id, organization_id, name, role)
    VALUES (
        NEW.id,
        (SELECT id FROM public.organizations WHERE slug = 'org-' || substring(NEW.id::text from 1 for 8)),
        NEW.email,
        'owner'
    );
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log the error (this will show in Supabase logs)
    RAISE LOG 'Error in handle_new_user_simple: %', SQLERRM;
    RAISE EXCEPTION 'Failed to create user data: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create a new trigger with the simpler function
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_simple();

-- Verify the trigger was created
SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';