-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 09, 2025 at 05:23 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `biocella_sql`
--
CREATE DATABASE IF NOT EXISTS `biocella_sql` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `biocella_sql`;

-- --------------------------------------------------------

--
-- Table structure for table `appointment`
--

CREATE TABLE `appointment` (
  `appointment_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `student_id` varchar(50) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `purpose` varchar(255) DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `appointment_source` enum('internal','outsider') NOT NULL DEFAULT 'internal',
  `requester_name` varchar(150) DEFAULT NULL,
  `requester_email` varchar(255) DEFAULT NULL,
  `requester_phone` varchar(40) DEFAULT NULL,
  `requester_ip` varchar(64) DEFAULT NULL,
  `status` enum('pending','approved','denied','ongoing','visited','no_show') DEFAULT 'pending',
  `qr_code` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `pending_at` timestamp NULL DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `denied_at` timestamp NULL DEFAULT NULL,
  `ongoing_at` timestamp NULL DEFAULT NULL,
  `visited_at` timestamp NULL DEFAULT NULL,
  `no_show_at` timestamp NULL DEFAULT NULL,
  `denial_reason` text DEFAULT NULL,
  `admin_remarks` text DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `chemical_stock_batch`
--

CREATE TABLE `chemical_stock_batch` (
  `batch_id` int(11) NOT NULL,
  `chemical_id` int(11) DEFAULT NULL,
  `quantity` int(11) DEFAULT NULL,
  `used_quantity` int(11) DEFAULT 0,
  `date_received` datetime DEFAULT current_timestamp(),
  `expiration_date` date DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `lot_number` varchar(100) DEFAULT NULL,
  `qr_code` text DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chemical_stock_batch`
--

INSERT INTO `chemical_stock_batch` (`batch_id`, `chemical_id`, `quantity`, `used_quantity`, `date_received`, `expiration_date`, `location`, `qr_code`) VALUES
(1, 5, 50, 20, '2025-12-08 00:47:53', NULL, 'some where', NULL),
(2, 6, 50, 25, '2025-12-08 01:01:45', NULL, 'some where2', 'data:image/png;base64,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');

-- --------------------------------------------------------

--
-- Table structure for table `chemical_usage_log`
--

CREATE TABLE `chemical_usage_log` (
  `log_id` int(11) NOT NULL,
  `chemical_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `date_used` datetime DEFAULT NULL,
  `amount_used` int(11) DEFAULT NULL,
  `purpose` varchar(255) DEFAULT NULL,
  `batch_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chemical_usage_log`
--

INSERT INTO `chemical_usage_log` (`log_id`, `chemical_id`, `user_id`, `date_used`, `amount_used`, `purpose`, `batch_id`) VALUES
(3, 6, 3, '2025-12-08 01:18:53', 5, 'hmm', 2),
(4, 6, 3, '2025-12-08 01:19:56', 5, 'take 2', 2),
(5, 5, 3, '2025-12-08 01:22:14', 20, 'lets see', 1);

-- --------------------------------------------------------

--
-- Table structure for table `digital_logbook`
--

CREATE TABLE `digital_logbook` (
  `log_id` int(11) NOT NULL,
  `appointment_id` int(11) DEFAULT NULL,
  `student_id` varchar(50) DEFAULT NULL,
  `check_in_time` datetime DEFAULT NULL,
  `check_out_time` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_requests`
--

CREATE TABLE `password_reset_requests` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `request_time` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reagents_chemicals`
--

CREATE TABLE `reagents_chemicals` (
  `chemical_id` int(11) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `type` varchar(100) DEFAULT NULL,
  `quantity` int(11) DEFAULT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `threshold` int(11) DEFAULT NULL,
  `lead_time_days` int(11) NOT NULL DEFAULT 7,
  `safety_stock` decimal(12,2) NOT NULL DEFAULT 0.00,
  `last_updated` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reagents_chemicals`
--

INSERT INTO `reagents_chemicals` (`chemical_id`, `name`, `type`, `quantity`, `unit`, `threshold`, `last_updated`) VALUES
(5, 'Ethanol', 'Base', 50, 'L', 3, '2025-12-08 01:22:14'),
(6, 'Ethanol', 'General', 50, 'L', 3, '2025-12-08 01:19:56');

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `user_id` int(11) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `profile_photo` text DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `course` varchar(100) DEFAULT NULL,
  `is_setup_complete` tinyint(1) DEFAULT 0,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` enum('student','staff','faculty','admin') NOT NULL,
  `failed_login_attempts` int(11) DEFAULT 0,
  `lockout_until` datetime DEFAULT NULL,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expires` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `appointment_unavailable_dates`
--

CREATE TABLE `appointment_unavailable_dates` (
  `unavailable_id` int(11) NOT NULL,
  `unavailable_date` date NOT NULL,
  `reason` varchar(255) NOT NULL,
  `created_by_role` varchar(50) DEFAULT NULL,
  `created_by_user_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `announcement`
--

CREATE TABLE `announcement` (
  `announcement_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` longtext NOT NULL,
  `image_urls` longtext DEFAULT NULL,
  `links` longtext DEFAULT NULL,
  `created_by_user_id` int(11) NOT NULL,
  `created_by_email` varchar(255) NOT NULL,
  `created_by_role` varchar(50) NOT NULL DEFAULT 'admin',
  `is_published` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`user_id`, `name`, `email`, `password`, `role`, `failed_login_attempts`, `lockout_until`, `reset_token`) VALUES
(3, '', '21104163@usc.edu.ph', '$2b$10$0lTkF3ppBa9YTT5MnOxG3uokxTjF9BrEPU5ZCYAeCnxKv9EU4Ejn6', 'student', 0, NULL, 'd2710629-37ce-4800-a6e6-0c4e46141b8b');

--
-- Triggers `user`
--
DELIMITER $$
CREATE TRIGGER `limit_one_admin` BEFORE INSERT ON `user` FOR EACH ROW BEGIN
  IF NEW.role = 'admin' THEN
    IF (SELECT COUNT(*) FROM User WHERE role = 'admin') >= 1 THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Only one admin allowed.';
    END IF;
  END IF;
END
$$
DELIMITER ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `appointment`
--
ALTER TABLE `appointment`
  ADD PRIMARY KEY (`appointment_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_deleted_at` (`deleted_at`,`status`,`date`),
  ADD KEY `idx_deleted_appointments` (`deleted_at`,`appointment_id`),
  ADD KEY `idx_time_range` (`date`,`end_time`,`status`,`deleted_at`),
  ADD KEY `idx_appointment_no_show` (`status`,`no_show_at`,`deleted_at`),
  ADD KEY `idx_appointment_source_status_date` (`appointment_source`,`status`,`date`),
  ADD KEY `idx_outsider_requester_email` (`requester_email`,`appointment_source`,`created_at`),
  ADD KEY `idx_outsider_requester_ip` (`requester_ip`,`appointment_source`,`created_at`);

--
-- Indexes for table `appointment_unavailable_dates`
--
ALTER TABLE `appointment_unavailable_dates`
  ADD PRIMARY KEY (`unavailable_id`),
  ADD UNIQUE KEY `uniq_unavailable_date` (`unavailable_date`),
  ADD KEY `idx_unavailable_deleted_date` (`deleted_at`,`unavailable_date`);

--
-- Indexes for table `announcement`
--
ALTER TABLE `announcement`
  ADD PRIMARY KEY (`announcement_id`),
  ADD KEY `idx_announcement_published_created` (`is_published`,`deleted_at`,`created_at`),
  ADD KEY `idx_announcement_created_by` (`created_by_user_id`,`created_at`);

--
-- Indexes for table `chemical_stock_batch`
--
ALTER TABLE `chemical_stock_batch`
  ADD PRIMARY KEY (`batch_id`),
  ADD KEY `chemical_id` (`chemical_id`),
  ADD KEY `idx_batch_chemical_lot` (`chemical_id`,`lot_number`),
  ADD KEY `idx_batch_deleted_at` (`deleted_at`);

--
-- Indexes for table `chemical_usage_log`
--
ALTER TABLE `chemical_usage_log`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `chemical_id` (`chemical_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `batch_id` (`batch_id`);

--
-- Indexes for table `digital_logbook`
--
ALTER TABLE `digital_logbook`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `appointment_id` (`appointment_id`);

--
-- Indexes for table `password_reset_requests`
--
ALTER TABLE `password_reset_requests`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `reagents_chemicals`
--
ALTER TABLE `reagents_chemicals`
  ADD PRIMARY KEY (`chemical_id`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_user_deleted_at` (`deleted_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `appointment`
--
ALTER TABLE `appointment`
  MODIFY `appointment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `appointment_unavailable_dates`
--
ALTER TABLE `appointment_unavailable_dates`
  MODIFY `unavailable_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `announcement`
--
ALTER TABLE `announcement`
  MODIFY `announcement_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `chemical_stock_batch`
--
ALTER TABLE `chemical_stock_batch`
  MODIFY `batch_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `chemical_usage_log`
--
ALTER TABLE `chemical_usage_log`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `digital_logbook`
--
ALTER TABLE `digital_logbook`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `password_reset_requests`
--
ALTER TABLE `password_reset_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reagents_chemicals`
--
ALTER TABLE `reagents_chemicals`
  MODIFY `chemical_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `appointment`
--
ALTER TABLE `appointment`
  ADD CONSTRAINT `appointment_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`);

--
-- Constraints for table `chemical_stock_batch`
--
ALTER TABLE `chemical_stock_batch`
  ADD CONSTRAINT `chemical_stock_batch_ibfk_1` FOREIGN KEY (`chemical_id`) REFERENCES `reagents_chemicals` (`chemical_id`);

--
-- Constraints for table `chemical_usage_log`
--
ALTER TABLE `chemical_usage_log`
  ADD CONSTRAINT `chemical_usage_log_ibfk_1` FOREIGN KEY (`chemical_id`) REFERENCES `reagents_chemicals` (`chemical_id`),
  ADD CONSTRAINT `chemical_usage_log_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`),
  ADD CONSTRAINT `chemical_usage_log_ibfk_3` FOREIGN KEY (`batch_id`) REFERENCES `chemical_stock_batch` (`batch_id`);

--
-- Constraints for table `digital_logbook`
--
ALTER TABLE `digital_logbook`
  ADD CONSTRAINT `digital_logbook_ibfk_1` FOREIGN KEY (`appointment_id`) REFERENCES `appointment` (`appointment_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
