-- Soft delete fully consumed batches instead of hard deleting records
ALTER TABLE `chemical_stock_batch`
ADD COLUMN `deleted_at` DATETIME NULL AFTER `qr_code`;

CREATE INDEX `idx_batch_deleted_at`
ON `chemical_stock_batch` (`deleted_at`);
