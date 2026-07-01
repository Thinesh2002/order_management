/*
  Order Management CORS/Sync DB upgrade - 2026-07-01
  Run this once on the server before restarting PM2.
*/

CREATE DATABASE IF NOT EXISTS cm_order_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cm_order_management;

DROP PROCEDURE IF EXISTS add_cm_column_if_missing;
DROP PROCEDURE IF EXISTS add_cm_index_if_missing;

DELIMITER $$
CREATE PROCEDURE add_cm_column_if_missing(
  IN p_table_name VARCHAR(128),
  IN p_column_name VARCHAR(128),
  IN p_column_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND COLUMN_NAME = p_column_name
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', REPLACE(p_table_name, '`', '``'), '` ADD COLUMN `', REPLACE(p_column_name, '`', '``'), '` ', p_column_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

CREATE PROCEDURE add_cm_index_if_missing(
  IN p_table_name VARCHAR(128),
  IN p_index_name VARCHAR(128),
  IN p_index_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND INDEX_NAME = p_index_name
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', REPLACE(p_table_name, '`', '``'), '` ADD ', p_index_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL add_cm_column_if_missing('daraz_orders', 'updated_time', 'DATETIME NULL AFTER `created_time`');
CALL add_cm_column_if_missing('daraz_orders', 'promised_shipping_time', 'DATETIME NULL AFTER `updated_time`');
CALL add_cm_column_if_missing('daraz_orders', 'voucher_total', 'DECIMAL(12,2) NULL DEFAULT 0.00 AFTER `shipping_fee`');
CALL add_cm_column_if_missing('daraz_orders', 'last_synced_at', 'DATETIME NULL AFTER `synced_at`');

CALL add_cm_column_if_missing('daraz_order_items', 'variation_name', 'VARCHAR(255) NULL AFTER `product_title`');
CALL add_cm_column_if_missing('daraz_order_items', 'discount_amount', 'DECIMAL(12,2) NULL DEFAULT 0.00 AFTER `unit_price`');
CALL add_cm_column_if_missing('daraz_order_items', 'paid_price', 'DECIMAL(12,2) NULL DEFAULT 0.00 AFTER `discount_amount`');

CALL add_cm_column_if_missing('woo_orders', 'updated_time', 'DATETIME NULL AFTER `created_time`');
CALL add_cm_column_if_missing('woo_orders', 'last_synced_at', 'DATETIME NULL AFTER `synced_at`');

CALL add_cm_column_if_missing('woo_order_items', 'variation_name', 'VARCHAR(255) NULL AFTER `product_title`');
CALL add_cm_column_if_missing('woo_order_items', 'discount_amount', 'DECIMAL(12,2) NULL DEFAULT 0.00 AFTER `unit_price`');

CALL add_cm_column_if_missing('order_sync_settings', 'last_sync_started_at', 'DATETIME NULL AFTER `last_sync_at`');
CALL add_cm_column_if_missing('order_sync_settings', 'last_sync_finished_at', 'DATETIME NULL AFTER `last_sync_started_at`');
CALL add_cm_column_if_missing('order_sync_settings', 'last_error_message', 'TEXT NULL AFTER `last_sync_message`');

CREATE TABLE IF NOT EXISTS daraz_order_sync_runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_id BIGINT NULL,
  account_code VARCHAR(100) NULL,
  account_name VARCHAR(255) NULL,
  sync_type VARCHAR(50) DEFAULT 'manual',
  days INT NULL,
  date_from DATE NULL,
  date_to DATE NULL,
  limit_rows INT NULL,
  max_pages INT NULL,
  status VARCHAR(50) DEFAULT 'running',
  fetched_orders INT NOT NULL DEFAULT 0,
  saved_orders INT NOT NULL DEFAULT 0,
  inserted_orders INT NOT NULL DEFAULT 0,
  updated_orders INT NOT NULL DEFAULT 0,
  skipped_orders INT NOT NULL DEFAULT 0,
  saved_items INT NOT NULL DEFAULT 0,
  confirmed_orders INT NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  request_payload JSON NULL,
  response_payload JSON NULL,
  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_daraz_sync_account (account_id),
  KEY idx_daraz_sync_status (status),
  KEY idx_daraz_sync_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS woo_order_sync_runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_id BIGINT NULL,
  account_code VARCHAR(100) NULL,
  account_name VARCHAR(255) NULL,
  sync_type VARCHAR(50) DEFAULT 'manual',
  days INT NULL,
  date_from DATE NULL,
  date_to DATE NULL,
  limit_rows INT NULL,
  max_pages INT NULL,
  status VARCHAR(50) DEFAULT 'running',
  fetched_orders INT NOT NULL DEFAULT 0,
  saved_orders INT NOT NULL DEFAULT 0,
  inserted_orders INT NOT NULL DEFAULT 0,
  updated_orders INT NOT NULL DEFAULT 0,
  skipped_orders INT NOT NULL DEFAULT 0,
  saved_items INT NOT NULL DEFAULT 0,
  confirmed_orders INT NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  request_payload JSON NULL,
  response_payload JSON NULL,
  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_woo_sync_account (account_id),
  KEY idx_woo_sync_status (status),
  KEY idx_woo_sync_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELETE newer
FROM daraz_order_items newer
JOIN daraz_order_items older
  ON older.daraz_order_id = newer.daraz_order_id
 AND older.daraz_order_item_id = newer.daraz_order_item_id
 AND older.id < newer.id
WHERE newer.daraz_order_item_id IS NOT NULL;

DELETE newer
FROM woo_order_items newer
JOIN woo_order_items older
  ON older.woo_order_id = newer.woo_order_id
 AND older.woo_line_item_id = newer.woo_line_item_id
 AND older.id < newer.id
WHERE newer.woo_line_item_id IS NOT NULL;

CALL add_cm_index_if_missing('daraz_order_items', 'uq_daraz_item_order_item', 'UNIQUE KEY `uq_daraz_item_order_item` (`daraz_order_id`, `daraz_order_item_id`)');
CALL add_cm_index_if_missing('woo_order_items', 'uq_woo_item_order_item', 'UNIQUE KEY `uq_woo_item_order_item` (`woo_order_id`, `woo_line_item_id`)');

INSERT INTO order_sync_settings (platform_code, sync_enabled, auto_sync_enabled, sync_interval_minutes, fetch_order_days, last_sync_status)
VALUES
  ('DARAZ', 1, 1, 5, 7, 'never'),
  ('WOO', 1, 1, 5, 7, 'never')
ON DUPLICATE KEY UPDATE platform_code = VALUES(platform_code);

DROP PROCEDURE IF EXISTS add_cm_column_if_missing;
DROP PROCEDURE IF EXISTS add_cm_index_if_missing;
