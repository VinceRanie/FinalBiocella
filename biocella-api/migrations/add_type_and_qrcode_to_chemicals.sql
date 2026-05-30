-- Add type and qr_code columns to reagents_chemicals table
ALTER TABLE `reagents_chemicals` 
ADD COLUMN `type` VARCHAR(100) NULL AFTER `name`,
ADD COLUMN `qr_code` TEXT NULL AFTER `threshold`;

-- Update existing records to have a default type
UPDATE `reagents_chemicals` SET `type` = 'General' WHERE `type` IS NULL;
