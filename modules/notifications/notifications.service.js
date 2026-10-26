const { Op } = require("sequelize");
const {
  Notification,
  Product,
  ProductInventory,
  Vendor,
  Purchase,
} = require("../../database/index");

exports.getAll = async (store_id, user_id) => {
  const where = { store_id, user_id };

  return await Notification.findAll({
    where,
    order: [["created_at", "DESC"]],
    limit: 50,
  });
};

exports.getUnread = async (store_id, user_id) => {
  const where = { store_id, user_id, is_read: 0 };

  return await Notification.findAll({
    where,
    order: [["created_at", "DESC"]],
  });
};

exports.markRead = async (id, user_id, store_id) => {
  await Notification.update({ is_read: 1 }, { where: { id, user_id, store_id } });
};

exports.markAllRead = async (store_id, user_id) => {
  const where = { store_id, user_id, is_read: 0 };

  await Notification.update(
    { is_read: 1 },
    { where },
  );
};

exports.remove = async (id, user_id, store_id) => {
  await Notification.destroy({ where: { id, user_id, store_id } });
};

// Auto-generate alerts based on current data
exports.generateAlerts = async (store_id, user_id) => {
  const sid = parseInt(store_id);
  if (!sid || isNaN(sid)) return { generated: 0, alerts: [] };

  const created = [];

  // 1. Low stock alerts
  const inventory = await ProductInventory.findAll({
    where: { store_id: sid },
    include: [
      {
        model: Product,
        attributes: ["id", "name", "sku", "alert_quantity"],
        where: { is_active: 1, is_service: 0 },
      },
    ],
    raw: true,
  });

  const lowStock = inventory.filter(
    (row) =>
      parseFloat(row.quantity) <= parseFloat(row["Product.alert_quantity"]),
  );

  for (const item of lowStock) {
    const exists = await Notification.findOne({
      where: {
        store_id: sid,
        type: "low_stock",
        reference_type: "product",
        reference_id: item["Product.id"],
        is_read: 0,
      },
    });
    if (!exists) {
      const n = await Notification.create({
        store_id: sid,
        user_id,
        type: "low_stock",
        title: "Low Stock Alert",
        message: `${item["Product.name"]} (${item["Product.sku"]}) has only ${item.quantity} units left.`,
        reference_type: "product",
        reference_id: item["Product.id"],
      });
      created.push(n);
    }
  }

  // 2. Vendor payment due alerts
  const purchWhere = { store_id: sid, payment_status: { [Op.in]: ["unpaid", "partial"] } };
  const duePurchases = await Purchase.findAll({
    where: purchWhere,
    raw: true,
  });

  for (const purchase of duePurchases) {
    const exists = await Notification.findOne({
      where: {
        store_id: sid,
        type: "payment_due",
        reference_type: "purchase",
        reference_id: purchase.id,
        is_read: 0,
      },
    });
    if (!exists) {
      const n = await Notification.create({
        store_id: sid,
        user_id,
        type: "payment_due",
        title: "Vendor Payment Due",
        message: `Purchase ${purchase.purchase_number} has ₹${purchase.due_amount} pending.`,
        reference_type: "purchase",
        reference_id: purchase.id,
      });
      created.push(n);
    }
  }

  return { generated: created.length, alerts: created };
};
