-- Store whether an unavailable-date action was marked as an emergency override
ALTER TABLE `appointment_unavailable_dates`
  ADD COLUMN `is_emergency` TINYINT(1) NOT NULL DEFAULT 0 AFTER `created_by_user_id`;
