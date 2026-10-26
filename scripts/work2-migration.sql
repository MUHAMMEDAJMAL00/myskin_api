-- Work 2 Database Migration Script
-- Run after work1 franchise migration is complete.
-- Safe to run multiple times (uses IF NOT EXISTS / INFORMATION_SCHEMA checks)

-- ─── 3.1: unit_id FK on products ─────────────────────────────────────────────
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'unit_id'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN unit_id INT NULL REFERENCES units(id)',
  'SELECT "unit_id already exists"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─── 3.2: variant_id FK on product_inventory ─────────────────────────────────
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_inventory' AND COLUMN_NAME = 'variant_id'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE product_inventory ADD COLUMN variant_id INT NULL',
  'SELECT "variant_id already exists"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop old unique index and recreate with variant_id included
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_inventory' AND INDEX_NAME = 'product_inventories_product_id_store_id_unique'
);
SET @sql = IF(@idx_exists > 0,
  'ALTER TABLE product_inventory DROP INDEX product_inventories_product_id_store_id_unique',
  'SELECT "old index already removed"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_inventory' AND INDEX_NAME = 'uq_inv_variant'
);
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE product_inventory ADD UNIQUE INDEX uq_inv_variant (store_id, product_id, variant_id)',
  'SELECT "uq_inv_variant already exists"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─── 3.3: batch_id FK on stock_movements ─────────────────────────────────────
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_movements' AND COLUMN_NAME = 'batch_id'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE stock_movements ADD COLUMN batch_id INT NULL',
  'SELECT "batch_id already exists"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─── 3.7: refresh_tokens table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME DEFAULT NOW(),
  INDEX idx_rt_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── 3.8: store_product_prices table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_product_prices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  store_id INT NOT NULL,
  product_id INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
  UNIQUE KEY uq_store_product_price (store_id, product_id),
  FOREIGN KEY (store_id) REFERENCES stores(id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
