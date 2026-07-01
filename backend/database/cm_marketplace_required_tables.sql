CREATE DATABASE IF NOT EXISTS cm_marketplace_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cm_marketplace_management;

CREATE TABLE IF NOT EXISTS marketplace_sku_mappings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  account_id BIGINT NULL,
  account_code VARCHAR(100) NULL,
  marketplace_sku VARCHAR(150) NOT NULL,
  local_sku VARCHAR(150) NOT NULL,
  product_id BIGINT NULL,
  variant_id BIGINT NULL,
  status VARCHAR(30) DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_marketplace_sku (platform, account_id, marketplace_sku),
  KEY idx_marketplace_local_sku (local_sku)
);

-- This backend can read your existing marketplace account tables dynamically.
-- If your old project already has Daraz/Woo account and credential tables, do not duplicate them.
-- Keep account credentials in cm_marketplace_management and set MP_DB_NAME in .env.
