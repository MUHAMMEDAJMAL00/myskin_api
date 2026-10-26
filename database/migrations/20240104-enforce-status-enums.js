"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("sales", "status", {
      type: Sequelize.ENUM("completed", "pending", "cancelled", "returned", "partial_return"),
      allowNull: false,
      defaultValue: "completed",
    });

    await queryInterface.changeColumn("sales", "payment_status", {
      type: Sequelize.ENUM("unpaid", "paid", "partial", "refunded"),
      allowNull: false,
      defaultValue: "unpaid",
    });

    await queryInterface.changeColumn("purchases", "status", {
      type: Sequelize.ENUM("received", "pending", "cancelled"),
      allowNull: false,
      defaultValue: "received",
    });

    await queryInterface.changeColumn("purchases", "payment_status", {
      type: Sequelize.ENUM("unpaid", "paid", "partial"),
      allowNull: false,
      defaultValue: "unpaid",
    });

    await queryInterface.changeColumn("returns", "status", {
      type: Sequelize.ENUM("completed", "pending", "approved", "rejected"),
      allowNull: false,
      defaultValue: "completed",
    });

    await queryInterface.changeColumn("cash_registers", "status", {
      type: Sequelize.ENUM("open", "closed"),
      allowNull: false,
      defaultValue: "open",
    });

    await queryInterface.changeColumn("quotations", "status", {
      type: Sequelize.ENUM("pending", "approved", "rejected", "expired", "cancelled", "converted"),
      allowNull: false,
      defaultValue: "pending",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("sales", "status", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "completed",
    });

    await queryInterface.changeColumn("sales", "payment_status", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "unpaid",
    });

    await queryInterface.changeColumn("purchases", "status", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "received",
    });

    await queryInterface.changeColumn("purchases", "payment_status", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "unpaid",
    });

    await queryInterface.changeColumn("returns", "status", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "completed",
    });

    await queryInterface.changeColumn("cash_registers", "status", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "open",
    });

    await queryInterface.changeColumn("quotations", "status", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "pending",
    });
  },
};
