-- Add a durable verification timestamp for semester re-verification.
-- Safe to rerun.

SET @last_verified_at_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user'
    AND COLUMN_NAME = 'last_verified_at'
);

SET @add_last_verified_at_sql := IF(
  @last_verified_at_exists = 0,
  'ALTER TABLE `user` ADD COLUMN `last_verified_at` DATETIME NULL DEFAULT NULL AFTER `reset_token_expires`',
  'SELECT 1'
);

PREPARE stmt FROM @add_last_verified_at_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `user`
SET `last_verified_at` = COALESCE(`last_verified_at`, NOW())
WHERE `is_setup_complete` = 1
  AND `password` IS NOT NULL
  AND `last_verified_at` IS NULL;

ALTER TABLE `user`
MODIFY COLUMN `last_verified_at` DATETIME NULL DEFAULT NULL;