-- Add location field to chemical_stock_batch table and update qr_code to TEXT
ALTER TABLE `chemical_stock_batch` 
ADD COLUMN `location` VARCHAR(255) NULL AFTER `expiration_date`,
MODIFY COLUMN `qr_code` TEXT NULL;

-- Remove qr_code from reagents_chemicals (moving it to batch level only)
ALTER TABLE `reagents_chemicals` 
DROP COLUMN `qr_code`;
