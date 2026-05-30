-- Allow decimal quantities for inventory and usage tracking
ALTER TABLE `reagents_chemicals`
MODIFY COLUMN `quantity` DECIMAL(12,2) DEFAULT NULL,
MODIFY COLUMN `threshold` DECIMAL(12,2) DEFAULT NULL;

ALTER TABLE `chemical_stock_batch`
MODIFY COLUMN `quantity` DECIMAL(12,2) DEFAULT NULL,
MODIFY COLUMN `used_quantity` DECIMAL(12,2) DEFAULT 0.00;

ALTER TABLE `chemical_usage_log`
MODIFY COLUMN `amount_used` DECIMAL(12,2) DEFAULT NULL;
