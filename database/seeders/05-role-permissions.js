"use strict";

module.exports = {
  up: async (queryInterface) => {
    const allPerms = await queryInterface.sequelize.query(
      "SELECT id, module, action FROM permissions",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    const roles = await queryInterface.sequelize.query(
      "SELECT id, name FROM roles",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    const roleMap = {};
    roles.forEach(function (r) {
      roleMap[r.name] = r.id;
    });

    // ── Admin gets ALL permissions ─────────────────────────────
    const adminPermissions = allPerms.map(function (p) {
      return { role_id: roleMap["admin"], permission_id: p.id };
    });

    // ── Manager: all except store/role/permission management ──
    const managerExclude = [
      "stores:create",
      "stores:update",
      "stores:delete",
      "roles:create",
      "roles:update",
      "roles:delete",
      "permissions:create",
      "permissions:update",
      "permissions:delete",
      "users:delete",
    ];
    const managerPermissions = allPerms
      .filter(function (p) {
        return !managerExclude.includes(p.module + ":" + p.action);
      })
      .map(function (p) {
        return { role_id: roleMap["manager"], permission_id: p.id };
      });

    // ── Cashier: limited to front-of-house operations ─────────
    const cashierAllow = [
      // Products & categories (read-only — for POS selection)
      "products:read",
      "categories:read",
      "inventory:read",
      "units:read",

      // Customers
      "customers:create",
      "customers:read",
      "customers:update",

      // Sales & quotations
      "sales:create",
      "sales:read",
      "quotations:create",
      "quotations:read",

      // Returns
      "returns:create",
      "returns:read",

      // Discounts (apply in POS)
      "discounts:read",

      // Customer payments (collect payment)
      "customer_payments:create",
      "customer_payments:read",

      // Vendors (read-only for reference)
      "vendors:read",

      // Cash register (open/close shift, movements)
      "config:read",
      "config:update",

      // Notifications (personal)
      "notifications:read",
      "notifications:update",
    ];
    const cashierPermissions = allPerms
      .filter(function (p) {
        return cashierAllow.includes(p.module + ":" + p.action);
      })
      .map(function (p) {
        return { role_id: roleMap["cashier"], permission_id: p.id };
      });

    const rows = [
      ...adminPermissions,
      ...managerPermissions,
      ...cashierPermissions,
    ];

    if (rows.length) {
      await queryInterface.bulkInsert("role_permissions", rows, {
        ignoreDuplicates: true,
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("role_permissions", null, {});
  },
};
