ALTER TABLE appointment
  ADD COLUMN appointment_source ENUM('internal','outsider') NOT NULL DEFAULT 'internal' AFTER end_time,
  ADD COLUMN requester_name VARCHAR(150) NULL AFTER appointment_source,
  ADD COLUMN requester_email VARCHAR(255) NULL AFTER requester_name,
  ADD COLUMN requester_phone VARCHAR(40) NULL AFTER requester_email,
  ADD COLUMN requester_ip VARCHAR(64) NULL AFTER requester_phone;

CREATE INDEX idx_appointment_source_status_date
  ON appointment (appointment_source, status, date);

CREATE INDEX idx_outsider_requester_email
  ON appointment (requester_email, appointment_source, created_at);

CREATE INDEX idx_outsider_requester_ip
  ON appointment (requester_ip, appointment_source, created_at);
