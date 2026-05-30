-- Add unavailable dates table for appointment blocking
CREATE TABLE IF NOT EXISTS `appointment_unavailable_dates` (
  `unavailable_id` int(11) NOT NULL AUTO_INCREMENT,
  `unavailable_date` date NOT NULL,
  `reason` varchar(255) NOT NULL,
  `created_by_role` varchar(50) DEFAULT NULL,
  `created_by_user_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`unavailable_id`),
  UNIQUE KEY `uniq_unavailable_date` (`unavailable_date`),
  KEY `idx_unavailable_deleted_date` (`deleted_at`, `unavailable_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
