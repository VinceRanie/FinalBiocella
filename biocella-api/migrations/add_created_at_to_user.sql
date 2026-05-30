-- Add a durable registration timestamp for users used by dashboard activities.
-- This script is safe to rerun.

SET @user_created_at_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user'
    AND COLUMN_NAME = 'created_at'
);

SET @add_user_created_at_sql := IF(
  @user_created_at_exists = 0,
  'ALTER TABLE `user` ADD COLUMN `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP',
  'SELECT 1'
);

PREPARE stmt FROM @add_user_created_at_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `user`
SET `created_at` = NOW()
WHERE `created_at` IS NULL;

ALTER TABLE `user`
MODIFY COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
