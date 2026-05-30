-- Add no-show timestamp and status support for missed appointments
ALTER TABLE appointment
ADD COLUMN no_show_at TIMESTAMP NULL AFTER visited_at;

ALTER TABLE appointment
MODIFY COLUMN status ENUM('pending', 'approved', 'denied', 'ongoing', 'visited', 'no_show') DEFAULT 'pending';

-- Index to speed up no-show tab queries and cleanup routines
ALTER TABLE appointment
ADD INDEX idx_appointment_no_show (status, no_show_at, deleted_at);
