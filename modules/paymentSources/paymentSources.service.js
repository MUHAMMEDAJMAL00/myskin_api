const { PaymentSource } = require("../../database/index");
const AppError = require("../../utils/AppError");

const getAll = async ({ include_inactive = false } = {}) => {
  const where = include_inactive ? {} : { is_active: true };
  return PaymentSource.findAll({
    where,
    order: [["display_order", "ASC"], ["name", "ASC"]],
  });
};

const getById = async (id) => {
  const source = await PaymentSource.findByPk(id);
  if (!source) throw new AppError("Payment source not found", 404);
  return source;
};

const DEFAULT_ICONS = { cash: "bi-cash-coin", upi: "bi-qr-code-scan", card: "bi-credit-card-2-front", bank: "bi-bank2", other: "bi-three-dots" };

const create = async (data) => {
  const { name, type, icon, is_active, display_order, notes } = data;
  if (!name || !name.trim()) throw new AppError("name is required", 400);
  const exists = await PaymentSource.findOne({ where: { name: name.trim() } });
  if (exists) throw new AppError("A payment source with this name already exists", 409);
  return PaymentSource.create({
    name: name.trim(), type,
    icon: icon || DEFAULT_ICONS[type] || "bi-three-dots",
    is_active: is_active !== false, display_order: display_order || 0, notes: notes || null,
  });
};

const update = async (id, data) => {
  const source = await getById(id);
  const { name, type, icon, is_active, display_order, notes } = data;
  if (name !== undefined) {
    if (!name.trim()) throw new AppError("name cannot be empty", 400);
    if (name.trim() !== source.name) {
      const exists = await PaymentSource.findOne({ where: { name: name.trim() } });
      if (exists) throw new AppError("A payment source with this name already exists", 409);
    }
  }
  await source.update({
    name:          name          !== undefined ? name.trim()     : source.name,
    type:          type          !== undefined ? type            : source.type,
    icon:          icon          !== undefined ? icon            : source.icon,
    is_active:     is_active     !== undefined ? is_active       : source.is_active,
    display_order: display_order !== undefined ? display_order   : source.display_order,
    notes:         notes         !== undefined ? notes           : source.notes,
  });
  return source;
};

const toggleActive = async (id) => {
  const source = await getById(id);
  await source.update({ is_active: !source.is_active });
  return source;
};

const remove = async (id) => {
  const source = await getById(id);
  await source.destroy();
};

module.exports = { getAll, getById, create, update, toggleActive, remove };
