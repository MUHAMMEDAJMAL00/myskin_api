"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("payment_sources", "icon", {
      type: Sequelize.STRING(60),
      allowNull: true,
      after: "type",
    });
    // Set sensible defaults for existing seeded rows
    await queryInterface.sequelize.query(`
      UPDATE payment_sources SET icon =
        CASE type
          WHEN 'cash' THEN 'bi-cash-coin'
          WHEN 'card' THEN 'bi-credit-card-2-front'
          WHEN 'upi'  THEN 'bi-qr-code-scan'
          WHEN 'bank' THEN 'bi-bank2'
          ELSE 'bi-three-dots'
        END
      WHERE icon IS NULL
    `);
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("payment_sources", "icon");
  },
};
