-- Add lot number to support grouping multiple containers from the same supplier batch/lot
ALTER TABLE `chemical_stock_batch`
ADD COLUMN `lot_number` VARCHAR(100) NULL AFTER `location`;

-- Helpful index for filtering and grouping by chemical + lot
CREATE INDEX `idx_batch_chemical_lot`
ON `chemical_stock_batch` (`chemical_id`, `lot_number`);
