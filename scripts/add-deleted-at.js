const { sequelize } = require("../database/index");

(async () => {
  try {
    const [r] = await sequelize.query("SHOW COLUMNS FROM users LIKE 'deleted_at'");
    if (r.length === 0) {
      await sequelize.query("ALTER TABLE users ADD COLUMN deleted_at DATETIME NULL AFTER last_login");
      console.log("Column deleted_at added to users table");
    } else {
      console.log("Column deleted_at already exists");
    }
    process.exit(0);
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
})();
