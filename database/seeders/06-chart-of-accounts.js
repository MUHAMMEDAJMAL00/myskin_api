"use strict";

const CATEGORIES = [
  { name: "Current Asset", group: "Asset" },
  { name: "Fixed Asset", group: "Asset" },
  { name: "Cash in Hand", group: "Asset" },
  { name: "Sundry Debtors", group: "Asset" },
  { name: "Current Liability", group: "Liability" },
  { name: "Future Liability", group: "Liability" },
  { name: "Sundry Creditors", group: "Liability" },
  { name: "Depreciation", group: "Expenditure" },
  { name: "Direct Expenses", group: "Expenditure" },
  { name: "Sales", group: "Income" },
  { name: "Income", group: "Income" },
  { name: "Capital Account", group: "Equity" },
];

// Accounts: [name, category_name]
const ACCOUNTS = [
  ["Cash", "Current Asset"],
  ["Bank/Current Account", "Current Asset"],
  ["Stock In Hand", "Current Asset"],
  ["Staff Advances", "Current Asset"],
  ["Default Debtor", "Sundry Debtors"],
  ["Default Creditor", "Sundry Creditors"],
  ["Sales Products", "Sales"],
  ["Sales Return", "Sales"],
  ["Purchases Products", "Direct Expenses"],
  ["Purchase Return", "Direct Expenses"],
  ["Depreciation", "Depreciation"],
  ["Salary Expense", "Direct Expenses"],
  ["General Expenses", "Direct Expenses"],
  ["Cost of Goods Sold", "Direct Expenses"],
  ["Other Income", "Income"],
  ["Opening Balance Equity", "Capital Account"],
  ["GST Input Credit", "Current Asset"],
  ["Loyalty Points Payable", "Current Liability"],
];

module.exports = {
  up: async (queryInterface) => {
    // Only seed for store_id = 1
    const stores = await queryInterface.sequelize.query(
      "SELECT id FROM stores WHERE id = 1 LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    if (!stores.length) return;
    const store_id = 1;
    const now = new Date();

    // Seed categories (idempotent)
    for (const cat of CATEGORIES) {
      const existing = await queryInterface.sequelize.query(
        "SELECT id FROM account_categories WHERE store_id = :store_id AND name = :name LIMIT 1",
        {
          replacements: { store_id, name: cat.name },
          type: queryInterface.sequelize.QueryTypes.SELECT,
        },
      );
      if (!existing.length) {
        await queryInterface.sequelize.query(
          "INSERT INTO account_categories (store_id, name, `group`, is_active, created_at, updated_at) VALUES (:store_id, :name, :group, 1, :now, :now)",
          {
            replacements: { store_id, name: cat.name, group: cat.group, now },
            type: queryInterface.sequelize.QueryTypes.INSERT,
          },
        );
      }
    }

    // Seed accounts (idempotent)
    for (const [accName, catName] of ACCOUNTS) {
      const cats = await queryInterface.sequelize.query(
        "SELECT id FROM account_categories WHERE store_id = :store_id AND name = :catName LIMIT 1",
        {
          replacements: { store_id, catName },
          type: queryInterface.sequelize.QueryTypes.SELECT,
        },
      );
      if (!cats.length) continue;
      const category_id = cats[0].id;

      const existing = await queryInterface.sequelize.query(
        "SELECT id FROM ledger_accounts WHERE store_id = :store_id AND name = :name LIMIT 1",
        {
          replacements: { store_id, name: accName },
          type: queryInterface.sequelize.QueryTypes.SELECT,
        },
      );
      if (!existing.length) {
        await queryInterface.sequelize.query(
          "INSERT INTO ledger_accounts (store_id, category_id, name, opening_balance, is_active, created_at, updated_at) VALUES (:store_id, :category_id, :name, 0, 1, :now, :now)",
          {
            replacements: { store_id, category_id, name: accName, now },
            type: queryInterface.sequelize.QueryTypes.INSERT,
          },
        );
      }
    }

    // Seed ledger account mappings (idempotent)
    const MAPPINGS = [
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
    for (const [mappingKey, accName] of MAPPINGS) {
      const accts = await queryInterface.sequelize.query(
        "SELECT id FROM ledger_accounts WHERE store_id = :store_id AND name = :accName LIMIT 1",
        {
          replacements: { store_id, accName },
          type: queryInterface.sequelize.QueryTypes.SELECT,
        },
      );
      if (!accts.length) continue;
      const existing = await queryInterface.sequelize.query(
        "SELECT id FROM ledger_account_mappings WHERE store_id = :store_id AND mapping_key = :mappingKey LIMIT 1",
        {
          replacements: { store_id, mappingKey },
          type: queryInterface.sequelize.QueryTypes.SELECT,
        },
      );
      if (!existing.length) {
        await queryInterface.sequelize.query(
          "INSERT INTO ledger_account_mappings (store_id, mapping_key, ledger_account_id, created_at, updated_at) VALUES (:store_id, :mappingKey, :accId, :now, :now)",
          {
            replacements: { store_id, mappingKey, accId: accts[0].id, now },
            type: queryInterface.sequelize.QueryTypes.INSERT,
          },
        );
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      "DELETE FROM ledger_account_mappings WHERE store_id = 1",
    );
    await queryInterface.sequelize.query(
      "DELETE FROM ledger_accounts WHERE store_id = 1",
    );
    await queryInterface.sequelize.query(
      "DELETE FROM account_categories WHERE store_id = 1",
    );
  },
};
