-- Add soft-delete column to user table so deactivation is represented as deleted_at.
-- This script is safe to rerun.

SET @user_deleted_at_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user'
    AND COLUMN_NAME = 'deleted_at'
);

SET @add_user_deleted_at_sql := IF(
  @user_deleted_at_exists = 0,
  'ALTER TABLE `user` ADD COLUMN `deleted_at` DATETIME NULL DEFAULT NULL',
  'SELECT 1'
);

PREPARE stmt FROM @add_user_deleted_at_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @user_deleted_at_index_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user'
    AND INDEX_NAME = 'idx_user_deleted_at'
);

SET @add_user_deleted_at_index_sql := IF(
  @user_deleted_at_index_exists = 0,
  'ALTER TABLE `user` ADD INDEX `idx_user_deleted_at` (`deleted_at`)',
  'SELECT 1'
);

PREPARE stmt2 FROM @add_user_deleted_at_index_sql;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
