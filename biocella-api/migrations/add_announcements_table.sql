CREATE TABLE IF NOT EXISTS `announcement` (
  `announcement_id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` longtext NOT NULL,
  `image_urls` longtext DEFAULT NULL,
  `links` longtext DEFAULT NULL,
  `deleted_by_user_id` int(11) DEFAULT NULL,
  `created_by_user_id` int(11) NOT NULL,
  `created_by_email` varchar(255) NOT NULL,
  `created_by_role` varchar(50) NOT NULL DEFAULT 'admin',
  `is_published` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`announcement_id`),
  KEY `idx_announcement_published_created` (`is_published`, `deleted_at`, `created_at`),
  KEY `idx_announcement_deleted_by` (`deleted_by_user_id`),
  KEY `idx_announcement_created_by` (`created_by_user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;