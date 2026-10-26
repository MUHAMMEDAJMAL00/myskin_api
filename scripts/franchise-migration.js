// Run ONCE on existing databases
// Assigns all existing records to store ID 1 (change if needed)

const { sequelize } = require("../database");
const DEFAULT_STORE = 1;

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

async function run() {
  const tables = ["products", "categories", "customers", "vendors"];
  for (const table of tables) {
    const exists = await columnExists(table, "store_id");
    if (!exists) {
      await sequelize.query(`ALTER TABLE ${table} ADD COLUMN store_id INT NULL`);
    }
    await sequelize.query(
      `UPDATE ${table} SET store_id = ${DEFAULT_STORE} WHERE store_id IS NULL`,
    );
    if (!exists) {
      await sequelize.query(`ALTER TABLE ${table} MODIFY store_id INT NOT NULL`);
    }
    console.log(`✅ ${table} migrated`);
  }

  const idxExists = await indexExists("products", "uq_store_sku");
  if (!idxExists) {
    await sequelize.query(
      `ALTER TABLE products ADD UNIQUE INDEX uq_store_sku (store_id, sku)`,
    );
  }
  console.log("Franchise migration complete.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
