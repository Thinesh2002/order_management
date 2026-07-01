/*
  Daraz AWB + full order detail upgrade
  Scope kept exactly as requested:
  - order data changes: cm_order_management only
  - API/action logs: cm_logs_management only
*/

CREATE DATABASE IF NOT EXISTS cm_order_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cm_order_management;

DROP PROCEDURE IF EXISTS add_cm_column_if_missing;
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
DELIMITER ;

CALL add_cm_column_if_missing('daraz_order_items', 'shipment_provider', 'VARCHAR(150) NULL AFTER `tracking_code`');
CALL add_cm_column_if_missing('daraz_order_items', 'ofc_package_id', 'VARCHAR(80) NULL AFTER `package_id`');
CALL add_cm_column_if_missing('daraz_order_items', 'tracking_number', 'VARCHAR(120) NULL AFTER `tracking_code`');
CALL add_cm_column_if_missing('daraz_orders', 'last_detail_synced_at', 'DATETIME NULL AFTER `last_synced_at`');
CALL add_cm_column_if_missing('daraz_orders', 'finance_synced_at', 'DATETIME NULL AFTER `last_detail_synced_at`');

CREATE TABLE IF NOT EXISTS daraz_order_documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  daraz_order_id BIGINT UNSIGNED NOT NULL,
  account_id BIGINT UNSIGNED NULL,
  account_code VARCHAR(80) NULL,
  document_type VARCHAR(80) NULL,
  doc_type VARCHAR(80) NULL,
  mime_type VARCHAR(150) NULL,
  pdf_url TEXT NULL,
  file_base64 LONGTEXT NULL,
  source VARCHAR(80) NULL DEFAULT 'package_document',
  raw_payload JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_daraz_order_documents_order (daraz_order_id),
  KEY idx_daraz_order_documents_account (account_id),
  KEY idx_daraz_order_documents_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daraz_order_logistic_snapshots (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  daraz_order_id BIGINT UNSIGNED NOT NULL,
  account_id BIGINT UNSIGNED NULL,
  account_code VARCHAR(80) NULL,
  endpoint VARCHAR(150) NULL,
  raw_payload JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_daraz_logistic_snapshots_order (daraz_order_id),
  KEY idx_daraz_logistic_snapshots_account (account_id),
  KEY idx_daraz_logistic_snapshots_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daraz_order_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  daraz_order_id BIGINT UNSIGNED NOT NULL,
  account_id BIGINT UNSIGNED NULL,
  account_code VARCHAR(80) NULL,
  trade_order_id VARCHAR(80) NULL,
  trade_order_line_id VARCHAR(80) NULL,
  order_no VARCHAR(80) NULL,
  order_item_no VARCHAR(80) NULL,
  transaction_number VARCHAR(120) NULL,
  transaction_date VARCHAR(80) NULL,
  transaction_type VARCHAR(150) NULL,
  fee_type VARCHAR(80) NULL,
  fee_name VARCHAR(150) NULL,
  amount DECIMAL(14,2) NULL DEFAULT 0.00,
  paid_status VARCHAR(80) NULL,
  seller_sku VARCHAR(190) NULL,
  lazada_sku VARCHAR(190) NULL,
  shipping_provider VARCHAR(150) NULL,
  shipment_type VARCHAR(100) NULL,
  reference VARCHAR(190) NULL,
  statement VARCHAR(190) NULL,
  details TEXT NULL,
  comment TEXT NULL,
  raw_payload JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_daraz_order_transaction (daraz_order_id, transaction_number, fee_type, order_item_no),
  KEY idx_daraz_order_transactions_order (daraz_order_id),
  KEY idx_daraz_order_transactions_account (account_id),
  KEY idx_daraz_order_transactions_line (trade_order_line_id),
  KEY idx_daraz_order_transactions_type (transaction_type, fee_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS add_cm_column_if_missing;

CREATE DATABASE IF NOT EXISTS cm_logs_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cm_logs_management;

CREATE TABLE IF NOT EXISTS daraz_api_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  module VARCHAR(80) NOT NULL DEFAULT 'ORDER_MANAGEMENT',
  account_id BIGINT UNSIGNED NULL,
  account_code VARCHAR(80) NULL,
  account_name VARCHAR(190) NULL,
  api_path VARCHAR(190) NULL,
  endpoint VARCHAR(190) NULL,
  http_method VARCHAR(20) NULL,
  status_code INT NULL,
  success TINYINT(1) NULL,
  request_payload JSON NULL,
  response_payload JSON NULL,
  error_message TEXT NULL,
  message TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_daraz_api_logs_account (account_id),
  KEY idx_daraz_api_logs_path (api_path),
  KEY idx_daraz_api_logs_success (success),
  KEY idx_daraz_api_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
