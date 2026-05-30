-- Add forecasting configuration fields to reagents/chemicals
ALTER TABLE `reagents_chemicals`
ADD COLUMN `lead_time_days` INT NOT NULL DEFAULT 7 AFTER `threshold`,
ADD COLUMN `safety_stock` DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER `lead_time_days`;
