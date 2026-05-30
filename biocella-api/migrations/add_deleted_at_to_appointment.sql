-- Add soft-delete column to appointment table
ALTER TABLE appointment ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL;

-- Add index for performance on soft-deleted queries
ALTER TABLE appointment ADD INDEX idx_deleted_at (deleted_at, status, date);

-- Optional: Add index for recovering deleted appointments by time
ALTER TABLE appointment ADD INDEX idx_deleted_appointments (deleted_at, appointment_id);
