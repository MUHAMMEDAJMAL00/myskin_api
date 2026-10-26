-- Work 3 Database Migration Script
-- Adds batch_number, manufacturing_date, expiry_date to purchase_items
-- so the "Mark as Received" path can preserve batch detail entered at purchase time.
-- Safe to run multiple times (uses INFORMATION_SCHEMA guards).

-- ─── batch_number on purchase_items ──────────────────────────────────────────
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_items' AND COLUMN_NAME = 'batch_number'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE purchase_items ADD COLUMN batch_number VARCHAR(100) NULL',
  'SELECT "batch_number already exists"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─── manufacturing_date on purchase_items ─────────────────────────────────────
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_items' AND COLUMN_NAME = 'manufacturing_date'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE purchase_items ADD COLUMN manufacturing_date DATE NULL',
  'SELECT "manufacturing_date already exists"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─── expiry_date on purchase_items ───────────────────────────────────────────
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_items' AND COLUMN_NAME = 'expiry_date'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE purchase_items ADD COLUMN expiry_date DATE NULL',
  'SELECT "expiry_date already exists"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
