/**
 * One-time backfill: seed default account categories + ledger accounts
 * for every store that does not already have them.
 *
 * Usage:
 *   node myskin_backend/scripts/backfill-chart-of-accounts.js
 */

"use strict";

const path = require("path");
// Load env before anything else
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { sequelize, AccountCategory, LedgerAccount, LedgerAccountMapping, Store } = require("../database/index");

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
  ["other_income",             "Other Income"       ],
  ["depreciation",             "Depreciation"       ],
  ["default_debtor",           "Default Debtor"     ],
  ["default_creditor",         "Default Creditor"   ],
  ["opening_balance_equity",   "Opening Balance Equity"],
];

async function seedForStore(store_id) {
  let categoriesCreated = 0;
  let accountsCreated = 0;

  for (const cat of DEFAULT_CATEGORIES) {
    const [, created] = await AccountCategory.findOrCreate({
      where: { store_id, name: cat.name },
      defaults: { store_id, name: cat.name, group: cat.group },
    });
    if (created) categoriesCreated++;
  }

  for (const [accName, catName] of DEFAULT_ACCOUNTS) {
    const category = await AccountCategory.findOne({ where: { store_id, name: catName } });
    if (!category) continue;
    const [, created] = await LedgerAccount.findOrCreate({
      where: { store_id, name: accName },
      defaults: { store_id, category_id: category.id, name: accName, opening_balance: 0, is_active: 1 },
    });
    if (created) accountsCreated++;
  }

  let mappingsCreated = 0;
  for (const [mappingKey, accName] of DEFAULT_MAPPINGS) {
    const account = await LedgerAccount.findOne({ where: { store_id, name: accName } });
    if (!account) continue;
    const [, created] = await LedgerAccountMapping.findOrCreate({
      where: { store_id, mapping_key: mappingKey },
      defaults: { store_id, mapping_key: mappingKey, ledger_account_id: account.id },
    });
    if (created) mappingsCreated++;
  }

  return { categoriesCreated, accountsCreated, mappingsCreated };
}

async function run() {
  try {
    await sequelize.authenticate();
    console.log("Database connected.\n");

    const stores = await Store.findAll({ where: { is_active: 1 }, attributes: ["id", "name", "code"] });
    console.log(`Found ${stores.length} active store(s).\n`);

    let totalCats = 0;
    let totalAccounts = 0;
    let totalMappings = 0;

    for (const store of stores) {
      const { categoriesCreated, accountsCreated, mappingsCreated } = await seedForStore(store.id);
      totalCats      += categoriesCreated;
      totalAccounts   += accountsCreated;
      totalMappings   += mappingsCreated;
      const parts = [];
      if (categoriesCreated > 0) parts.push(`+${categoriesCreated} categories`);
      if (accountsCreated > 0)   parts.push(`+${accountsCreated} accounts`);
      if (mappingsCreated > 0)   parts.push(`+${mappingsCreated} mappings`);
      if (parts.length) {
        console.log(`  [SEED] Store ${store.id} "${store.name}" — ${parts.join(", ")}`);
      } else {
        console.log(`  [OK]   Store ${store.id} "${store.name}" — already up to date`);
      }
    }

    console.log(`\nDone. Created: ${totalCats} categories, ${totalAccounts} accounts, ${totalMappings} mappings.`);
  } catch (err) {
    console.error("Backfill failed:", err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
