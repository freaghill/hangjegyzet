-- Add file_size column to meetings table for storage tracking
ALTER TABLE meetings 
ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0;

-- Update existing meetings with a default file size (can be updated later when files are re-processed)
UPDATE meetings 
SET file_size = CASE 
    WHEN duration_seconds IS NOT NULL THEN duration_seconds * 16000 -- Rough estimate: 16KB per second for audio
    ELSE 0
END
WHERE file_size = 0;