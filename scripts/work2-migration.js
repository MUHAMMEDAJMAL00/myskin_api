// Work 2 migration runner — run once after Work 1 is complete.
// Usage (from myskin_backend/):  node scripts/work2-migration.js

const { sequelize } = require("../database");

async function columnExists(table, column) {
  const db = sequelize.config.database;
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :table AND COLUMN_NAME = :column`,
    { replacements: { db, table, column }, type: sequelize.QueryTypes.SELECT },
  );
  return rows.cnt > 0;
}

async function indexExists(table, indexName) {
  const db = sequelize.config.database;
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :table AND INDEX_NAME = :indexName`,
    { replacements: { db, table, indexName }, type: sequelize.QueryTypes.SELECT },
  );
  return rows.cnt > 0;
}

async function tableExists(table) {
  const db = sequelize.config.database;
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :table`,
    { replacements: { db, table }, type: sequelize.QueryTypes.SELECT },
  );
  return rows.cnt > 0;
}

async function run() {
  // ── 3.1: unit_id FK on products ────────────────────────────────────────────
  if (!(await columnExists("products", "unit_id"))) {
    await sequelize.query(`ALTER TABLE products ADD COLUMN unit_id INT NULL`);
    console.log("✅ products.unit_id added");
  } else {
    console.log("⏭  products.unit_id already exists");
  }

  // ── 3.2: variant_id FK on product_inventory ─────────────────────────────────
  if (!(await columnExists("product_inventory", "variant_id"))) {
    await sequelize.query(
      `ALTER TABLE product_inventory ADD COLUMN variant_id INT NULL`,
    );
    console.log("✅ product_inventory.variant_id added");
  } else {
    console.log("⏭  product_inventory.variant_id already exists");
  }

  // Drop the old (product_id, store_id) unique index if it exists
  const oldIdxNames = [
    "product_inventories_product_id_store_id_unique",
    "product_inventory_product_id_store_id_unique",
  ];
  for (const oldIdx of oldIdxNames) {
    if (await indexExists("product_inventory", oldIdx)) {
      await sequelize.query(
        `ALTER TABLE product_inventory DROP INDEX \`${oldIdx}\``,
      );
      console.log(`✅ Dropped old index ${oldIdx}`);
    }
  }

  // Add new (store_id, product_id, variant_id) unique index
  if (!(await indexExists("product_inventory", "uq_inv_variant"))) {
    await sequelize.query(
      `ALTER TABLE product_inventory ADD UNIQUE INDEX uq_inv_variant (store_id, product_id, variant_id)`,
    );
    console.log("✅ product_inventory uq_inv_variant index added");
  } else {
    console.log("⏭  product_inventory uq_inv_variant already exists");
  }

  // ── 3.3: batch_id FK on stock_movements ─────────────────────────────────────
  if (!(await columnExists("stock_movements", "batch_id"))) {
    await sequelize.query(
      `ALTER TABLE stock_movements ADD COLUMN batch_id INT NULL`,
    );
    console.log("✅ stock_movements.batch_id added");
  } else {
    console.log("⏭  stock_movements.batch_id already exists");
  }

  // ── 3.7: refresh_tokens table ────────────────────────────────────────────────
  if (!(await tableExists("refresh_tokens"))) {
    await sequelize.query(`
      CREATE TABLE refresh_tokens (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        token_hash VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        created_at DATETIME DEFAULT NOW(),
        INDEX idx_rt_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log("✅ refresh_tokens table created");
  } else {
    console.log("⏭  refresh_tokens already exists");
  }

  // ── 3.8: store_product_prices table ─────────────────────────────────────────
  if (!(await tableExists("store_product_prices"))) {
    await sequelize.query(`
      CREATE TABLE store_product_prices (
        id INT PRIMARY KEY AUTO_INCREMENT,
        store_id INT NOT NULL,
        product_id INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        created_at DATETIME DEFAULT NOW(),
        updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
        UNIQUE KEY uq_store_product_price (store_id, product_id),
        FOREIGN KEY (store_id) REFERENCES stores(id),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
    console.log("✅ store_product_prices table created");
  } else {
    console.log("⏭  store_product_prices already exists");
  }

  console.log("\n✅ Work 2 migration complete.");
  process.exit(0);
}

run().catch((e) => {
  console.error("Migration failed:", e.message || e);
  process.exit(1);
});
