"use strict";

const { Op } = require("sequelize");
const { Store, User, Role, UserStoreAssign, AccountCategory, LedgerAccount, LedgerAccountMapping, sequelize } = require("../../database/index");
const AppError = require("../../utils/AppError");

const DEFAULT_CATEGORIES = [
  { name: "Current Asset",     group: "Asset"       },
  { name: "Fixed Asset",       group: "Asset"       },
  { name: "Cash in Hand",      group: "Asset"       },
  { name: "Sundry Debtors",    group: "Asset"       },
  { name: "Current Liability", group: "Liability"   },
  { name: "Future Liability",  group: "Liability"   },
  { name: "Sundry Creditors",  group: "Liability"   },
  { name: "Depreciation",      group: "Expenditure" },
  { name: "Direct Expenses",   group: "Expenditure" },
  { name: "Sales",             group: "Income"      },
  { name: "Income",            group: "Income"      },
  { name: "Capital Account",   group: "Equity"      },
];

const DEFAULT_ACCOUNTS = [
  ["Cash",                    "Current Asset"    ],
  ["Bank/Current Account",    "Current Asset"    ],
  ["Stock In Hand",           "Current Asset"    ],
  ["Staff Advances",          "Current Asset"    ],
  ["Fixed Asset",             "Fixed Asset"      ],
  ["Default Debtor",          "Sundry Debtors"   ],
  ["Default Creditor",        "Sundry Creditors" ],
  ["GST Payable",             "Current Liability"],
  ["Sales Products",          "Sales"            ],
  ["Sales Return",            "Sales"            ],
  ["Purchases Products",      "Direct Expenses"  ],
  ["Purchase Return",         "Direct Expenses"  ],
  ["Depreciation",            "Depreciation"     ],
  ["Salary Expense",          "Direct Expenses"  ],
  ["General Expenses",        "Direct Expenses"  ],
  ["Cost of Goods Sold",      "Direct Expenses"  ],
  ["Other Income",            "Income"           ],
  ["Opening Balance Equity",  "Capital Account"  ],
  ["GST Input Credit",        "Current Asset"    ],
  ["Loyalty Points Payable",  "Current Liability"],
];

const DEFAULT_MAPPINGS = [
  ["payment_cash",             "Cash"               ],
  ["payment_bank",             "Bank/Current Account"],
  ["payment_loyalty",          "Loyalty Points Payable"],
  ["sales_products",           "Sales Products"     ],
  ["sale_tax_payable",         "GST Payable"        ],
  ["sale_receivable",          "Default Debtor"     ],
  ["sale_return",              "Sales Return"       ],
  ["purchase_cost",            "Purchases Products" ],
  ["purchase_tax_credit",      "GST Input Credit"   ],
  ["purchase_payable",         "Default Creditor"   ],
  ["purchase_return",          "Purchase Return"    ],
  ["cash_account",             "Cash"               ],
  ["bank_account",             "Bank/Current Account"],
  ["stock_in_hand",            "Stock In Hand"      ],
  ["fixed_asset",              "Fixed Asset"        ],
  ["staff_advances",           "Staff Advances"     ],
  ["salary_expense",           "Salary Expense"     ],
  ["general_expenses",         "General Expenses"   ],
  ["cost_of_goods_sold",       "Cost of Goods Sold" ],
  ["other_income",             "Other Income"       ],
  ["depreciation",             "Depreciation"       ],
  ["default_debtor",           "Default Debtor"     ],
  ["default_creditor",         "Default Creditor"   ],
  ["opening_balance_equity",   "Opening Balance Equity"],
];

const _seedDefaultAccounts = async (store_id, transaction) => {
  for (const cat of DEFAULT_CATEGORIES) {
    await AccountCategory.findOrCreate({
      where: { store_id, name: cat.name },
      defaults: { store_id, name: cat.name, group: cat.group },
      transaction,
    });
  }

  for (const [accName, catName] of DEFAULT_ACCOUNTS) {
    const category = await AccountCategory.findOne({ where: { store_id, name: catName }, transaction });
    if (!category) continue;
    await LedgerAccount.findOrCreate({
      where: { store_id, name: accName },
      defaults: { store_id, category_id: category.id, name: accName, opening_balance: 0, is_active: 1 },
      transaction,
    });
  }

  for (const [mappingKey, accName] of DEFAULT_MAPPINGS) {
    const account = await LedgerAccount.findOne({ where: { store_id, name: accName }, transaction });
    if (!account) continue;
    await LedgerAccountMapping.findOrCreate({
      where: { store_id, mapping_key: mappingKey },
      defaults: { store_id, mapping_key: mappingKey, ledger_account_id: account.id },
      transaction,
    });
  }
};

// ─── Get All Stores ───────────────────────────────────────────────────────────
const getAllStores = async ({ page = 1, limit = 20, search, is_active } = {}) => {
  const where = {};
  if (is_active !== undefined && is_active !== "") where.is_active = parseInt(is_active);
  if (search) {
    where[Op.or] = [
      { name:  { [Op.like]: `%${search}%` } },
      { code:  { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
    ];
  }
  const { count, rows } = await Store.findAndCountAll({
    where,
    order: [["created_at", "DESC"]],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });
  return { total: count, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(count / parseInt(limit)), data: rows };
};

// ─── Get Store By ID ──────────────────────────────────────────────────────────
const getStoreById = async (id, t = null) => {
  const options = { raw: true };
  if (t) options.transaction = t;
  const store = await Store.findByPk(id, options);
  if (!store) throw new AppError("Store not found", 404);
  return store;
};

// ─── Create Store ─────────────────────────────────────────────────────────────
const createStore = async (data) => {
  const { name, code, address, phone, email, currency, timezone, allow_negative_stock } = data;

  const existing = await Store.findOne({ where: { code }, attributes: ["id"] });
  if (existing) throw new AppError("Store code already exists", 409);

  return sequelize.transaction(async (t) => {
    const store = await Store.create({
      name,
      code,
      address: address || null,
      phone: phone || null,
      email: email || null,
      currency: currency || "INR",
      timezone: timezone || "Asia/Kolkata",
      allow_negative_stock: allow_negative_stock || 0,
    }, { transaction: t });

    await _seedDefaultAccounts(store.id, t);

    return getStoreById(store.id, t);
  });
};

// ─── Update Store ─────────────────────────────────────────────────────────────
const updateStore = async (id, data) => {
  await getStoreById(id); // throws 404 if not found

  if (!Object.keys(data).length) throw new AppError("No fields to update", 400);

  await Store.update(data, { where: { id } });
  return getStoreById(id);
};

// ─── Soft Delete Store ────────────────────────────────────────────────────────
const deleteStore = async (id) => {
  await getStoreById(id);
  await sequelize.transaction(async (t) => {
    await Store.update({ is_active: 0 }, { where: { id }, transaction: t });
    await Store.destroy({ where: { id }, transaction: t });
  });
  return { message: "Store deleted successfully" };
};

// ─── Get Store Users ──────────────────────────────────────────────────────────
const getStoreUsers = async (id) => {
  await getStoreById(id);

  return UserStoreAssign.findAll({
    where: { store_id: id },
    include: [
      {
        model: User,
        attributes: ["id", "name", "username", "email", "phone", "is_active"],
        include: [{ model: Role, attributes: ["id", "name"] }],
      },
    ],
    order: [[User, "name", "ASC"]],
  });
};

module.exports = {
  getAllStores,
  getStoreById,
  createStore,
  updateStore,
  deleteStore,
  getStoreUsers,
};
