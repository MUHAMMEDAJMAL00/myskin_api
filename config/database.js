const { Sequelize } = require("sequelize");
require("./env");

let sequelize;

if (process.env.DB_DIALECT === "sqlite") {
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: process.env.DB_STORAGE || "./pos_database.sqlite",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    timezone: "+05:30",
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      dialect: "mysql",
      logging: process.env.NODE_ENV === "development" ? console.log : false,
      timezone: "+05:30",
      pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
      dialectOptions:
        process.env.DB_SSL === "true"
          ? { ssl: { require: true, rejectUnauthorized: false } }
          : {},
    },
  );
}

async function initializeDatabase() {
  await sequelize.authenticate();
  console.log("✓ Database connected successfully");
}

module.exports = sequelize;
module.exports.initializeDatabase = initializeDatabase;
