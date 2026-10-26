"use strict";
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(
      "INSERT IGNORE INTO roles (name, description, created_at) VALUES ('super_admin', 'Full system access across all stores', NOW())"
    );
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      "DELETE FROM roles WHERE name = 'super_admin'"
    );
  },
};
