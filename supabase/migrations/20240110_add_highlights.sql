-- Add highlights column to meetings table
ALTER TABLE meetings 
ADD COLUMN IF NOT EXISTS highlights JSONB;