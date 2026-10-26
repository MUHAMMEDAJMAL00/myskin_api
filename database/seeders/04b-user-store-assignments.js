"use strict";

module.exports = {
  up: async (queryInterface) => {
    // Find the admin user
    const users = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE username = 'admin' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    if (!users.length) return;
    const user_id = users[0].id;

    // Find the MAIN store
    const stores = await queryInterface.sequelize.query(
      "SELECT id FROM stores WHERE code = 'MAIN' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    if (!stores.length) return;
    const store_id = stores[0].id;

    // Insert only if not already assigned (idempotent)
    const existing = await queryInterface.sequelize.query(
      "SELECT id FROM user_store_assignments WHERE user_id = :user_id AND store_id = :store_id LIMIT 1",
      { replacements: { user_id, store_id }, type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    if (existing.length) return;

    await queryInterface.bulkInsert("user_store_assignments", [
      {
        user_id,
        store_id,
        is_primary: 1,
        created_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface) => {
    const users = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE username = 'admin' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    if (!users.length) return;
    await queryInterface.bulkDelete("user_store_assignments", { user_id: users[0].id }, {});
  },
};
