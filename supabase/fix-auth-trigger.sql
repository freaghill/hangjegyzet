-- Fix the auth trigger with proper permissions and error handling
-- First, drop the existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create an improved trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_org_id UUID;
    org_slug VARCHAR(100);
BEGIN
    -- Generate a unique slug
    org_slug := 'org-' || substring(md5(random()::text || clock_timestamp()::text)::text from 1 for 8);
    
    -- Create organization
    INSERT INTO public.organizations (id, name, slug, subscription_tier, subscription_ends_at)
    VALUES (
        gen_random_uuid(),
        COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
        org_slug,
        'trial',
        CURRENT_TIMESTAMP + INTERVAL '14 days'
    )
    RETURNING id INTO new_org_id;
    
    -- Create profile
    INSERT INTO public.profiles (id, organization_id, name, role)
    VALUES (
        NEW.id,
        new_org_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'owner'
    );
    
    RETURN NEW;
EXCEPTION 
    WHEN unique_violation THEN
        -- Try again with a different slug
        org_slug := 'org-' || substring(md5(random()::text || NEW.id::text)::text from 1 for 12);
        
        INSERT INTO public.organizations (id, name, slug, subscription_tier, subscription_ends_at)
        VALUES (
            gen_random_uuid(),
            COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
            org_slug,
            'trial',
            CURRENT_TIMESTAMP + INTERVAL '14 days'
        )
        RETURNING id INTO new_org_id;
        
        INSERT INTO public.profiles (id, organization_id, name, role)
        VALUES (
            NEW.id,
            new_org_id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            'owner'
        );
        
        RETURN NEW;
    WHEN OTHERS THEN
        RAISE LOG 'Error in handle_new_user: % %', SQLERRM, SQLSTATE;
        RAISE;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.organizations TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Verify the setup
SELECT 'Trigger created successfully' as status;