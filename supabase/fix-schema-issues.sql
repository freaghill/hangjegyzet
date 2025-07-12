-- Fix missing columns in the database

-- Add metadata column to meetings table
ALTER TABLE meetings 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- The organizations table has subscription_tier, not subscription_plan
-- We don't need to change the table, but the app code is looking for the wrong column
-- This is noted for the code fix

-- Add index for metadata queries
CREATE INDEX IF NOT EXISTS idx_meetings_metadata ON meetings USING GIN (metadata);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'meetings' AND column_name = 'metadata';