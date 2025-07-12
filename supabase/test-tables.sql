-- Test if we can manually insert data into the tables
-- This will help identify if there are any constraints or issues

-- Test 1: Create a test organization
INSERT INTO organizations (name, slug, subscription_tier)
VALUES ('Test Company', 'test-company-1', 'trial')
RETURNING *;

-- Test 2: Check if we can query the organizations table
SELECT * FROM organizations;

-- Test 3: Check the structure of the profiles table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Test 4: Check the structure of the organizations table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
ORDER BY ordinal_position;