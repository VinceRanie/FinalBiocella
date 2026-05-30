-- Add end_time column to track appointment duration
ALTER TABLE appointment ADD COLUMN end_time DATETIME NULL DEFAULT NULL AFTER date;

-- Create index for faster conflict checking
ALTER TABLE appointment ADD INDEX idx_time_range (date, end_time, status, deleted_at);
