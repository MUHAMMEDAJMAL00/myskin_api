const { sequelize } = require("../database/index");
(async () => {
  try {
    const [r] = await sequelize.query("SHOW COLUMNS FROM stores LIKE 'deleted_at'");
    if (r.length === 0) {
      await sequelize.query("ALTER TABLE stores ADD COLUMN deleted_at DATETIME NULL");
      console.log("Added deleted_at to stores");
    } else {
      console.log("Already exists");
    }
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
