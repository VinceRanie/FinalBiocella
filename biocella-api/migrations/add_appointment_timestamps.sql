-- Add timestamp columns to track status changes
ALTER TABLE appointment 
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN pending_at TIMESTAMP NULL,
ADD COLUMN approved_at TIMESTAMP NULL,
ADD COLUMN denied_at TIMESTAMP NULL,
ADD COLUMN ongoing_at TIMESTAMP NULL,
ADD COLUMN visited_at TIMESTAMP NULL,
ADD COLUMN denial_reason TEXT NULL,
ADD COLUMN admin_remarks TEXT NULL;

-- Change status to ENUM for better data integrity
ALTER TABLE appointment 
MODIFY COLUMN status ENUM('pending', 'approved', 'denied', 'ongoing', 'visited') DEFAULT 'pending';

-- Update existing records to set pending_at to created_at
UPDATE appointment SET pending_at = created_at WHERE status = 'pending';
