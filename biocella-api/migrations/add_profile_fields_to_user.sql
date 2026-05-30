-- Add missing profile fields to user table
ALTER TABLE `user`
ADD COLUMN `first_name` varchar(255) DEFAULT '',
ADD COLUMN `last_name` varchar(255) DEFAULT '',
ADD COLUMN `department` varchar(255) DEFAULT NULL,
ADD COLUMN `course` varchar(255) DEFAULT NULL,
ADD COLUMN `is_setup_complete` tinyint(1) DEFAULT 0;

-- Create indexes for better query performance
ALTER TABLE `user`
ADD PRIMARY KEY (`user_id`) IF NOT EXISTS,
ADD UNIQUE KEY `email` (`email`);
