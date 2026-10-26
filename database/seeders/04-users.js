"use strict";
const bcrypt = require("bcrypt");

module.exports = {
  up: async (queryInterface) => {
    const password_hash = await bcrypt.hash("admin123", 10);

    const stores = await queryInterface.sequelize.query(
      "SELECT id FROM stores WHERE code = 'MAIN' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const store_id = stores[0]?.id || 1;

    const roles = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE name = 'super_admin' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const role_id = roles[0]?.id || 1;

    await queryInterface.bulkInsert(
      "users",
      [
        {
          store_id,
          role_id,
          name: "Super Admin",
          username: "admin",
          email: "admin@posapp.com",
          password_hash,
          phone: "9876543210",
          is_active: 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      { ignoreDuplicates: true }, //  skip if admin already exists
    );
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("users", { username: "admin" }, {});
    // Deletes only the seeded admin user, not users created via the app
  },
};
