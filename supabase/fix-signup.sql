-- Fix the handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
    org_slug VARCHAR(100);
BEGIN
    -- Generate a shorter slug (first 8 chars of UUID)
    org_slug := substring(gen_random_uuid()::text from 1 for 8);
    
    -- Create organization for new user
    INSERT INTO organizations (name, slug)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'company_name', split_part(NEW.email, '@', 1)),
        org_slug
    )
    RETURNING id INTO new_org_id;
    
    -- Create profile
    INSERT INTO profiles (id, organization_id, name, role)
    VALUES (
        NEW.id,
        new_org_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'owner'
    );
    
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- If slug already exists, try again with timestamp
        org_slug := substring(gen_random_uuid()::text from 1 for 8) || '-' || extract(epoch from now())::integer;
        
        INSERT INTO organizations (name, slug)
        VALUES (
            COALESCE(NEW.raw_user_meta_data->>'company_name', split_part(NEW.email, '@', 1)),
            org_slug
        )
        RETURNING id INTO new_org_id;
        
        INSERT INTO profiles (id, organization_id, name, role)
        VALUES (
            NEW.id,
            new_org_id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
            'owner'
        );
        
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also let's check if the storage bucket exists and create it if not
INSERT INTO storage.buckets (id, name, public) 
VALUES ('meetings', 'meetings', false) 
ON CONFLICT (id) DO NOTHING;