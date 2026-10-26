"use strict";
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert("roles", [
      { name: "super_admin", description: "Full system access across all stores", created_at: new Date() },
      { name: "admin",       description: "Full access to their assigned store",  created_at: new Date() },
      { name: "manager",     description: "Manage store operations",              created_at: new Date() },
      { name: "cashier",     description: "Process sales and view inventory",     created_at: new Date() },
    ], { ignoreDuplicates: true });
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete("roles", null, {});
  },
};
