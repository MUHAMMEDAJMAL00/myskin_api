POINT OF SALE SYSTEM
Database Design Document

Total Tables
25 tables across 8 domains
ORM
Sequelize v6 (SQLite ↔ MySQL)
Normalization
Third Normal Form (3NF)

1. Overview
   This document defines the complete database schema for the MySkin System. The database is designed following Third Normal Form (3NF), managed through Sequelize ORM, and switchable between SQLite (development) and MySQL 8.x (production) via configuration only.

Domain
Tables
Count
Identity & Access Control
stores, roles, permissions, role_permissions, users, user_store_assignments
6
App Configuration
app_config
1
Catalog & Inventory
categories, products, product_inventory, stock_movements
4
Procurement
vendors, purchases, purchase_items, purchase_payments
4
Sales
sales, sale_items, sale_payments
3
Quotations
quotations, quotation_items
2
Returns & Refunds
returns, return_items
2
Customer CRM
customers, loyalty_transactions
2
ORM Meta
sequelizemeta
1

2. Sequelize ORM Setup
   2.1 Migration Strategy
   All 25 tables are created and maintained through Sequelize migration files under database/migrations/. This allows the same migration files to run against both SQLite and MySQL without modification.

# Run all pending migrations

npx sequelize-cli db:migrate

# Check migration status

npx sequelize-cli db:migrate:status

# Rollback last migration

npx sequelize-cli db:migrate:undo

# Run all seeders (dev data)

npx sequelize-cli db:seed:all

2.2 Database Config (Dialect Switch)
// config/config.json
{
"development": {
"dialect": "sqlite",
"storage": "./database/pos_db.sqlite",
"logging": false
},
"production": {
"dialect": "mysql",
"host": "localhost",
"port": 3306,
"database": "pos_db",
"username": "pos_user",
"password": "YOUR_PASSWORD",
"pool": { "max": 10, "min": 2, "idle": 10000 }
}
}

2.3 Model Association Pattern
// Example: Sale model associations
Sale.hasMany(SaleItem, { foreignKey: 'sale_id', onDelete: 'CASCADE' });
Sale.hasMany(SalePayment, { foreignKey: 'sale_id', onDelete: 'CASCADE' });
Sale.belongsTo(Customer, { foreignKey: 'customer_id' });
Sale.belongsTo(Store, { foreignKey: 'store_id' });
Sale.belongsTo(User, { foreignKey: 'user_id' });
Sale.belongsTo(Quotation, { foreignKey: 'quotation_id' });

3. Domain Entity Flows
   3.1 Identity & Access
   One store can have many users. One user can be assigned to many stores (multi-branch). Each user has exactly one role. Each role has many permissions via role_permissions.

stores ──< user_store_assignments >── users
users ──> roles ──< role_permissions >── permissions

3.2 Catalog Flow
categories is self-referencing for unlimited subcategory depth. products belong to categories and have one product_inventory row per store. All stock changes pass through stock_movements.

categories (self-ref parent_id)
└──< products
└──< product_inventory (one row per store)
└──< stock_movements (full audit trail)

3.3 Sales Flow
quotations ──> sales (invoice header)
├──< sale_items (line items, price snapshotted)
├──< sale_payments (split: cash + UPI + loyalty)
└──< returns
└──< return_items

3.4 Purchase Flow
vendors ──< purchases (PO / GRN header)
├──< purchase_items (line items, cost snapshotted)
└──< purchase_payments (partial settlement tracking)

4. Table Definitions
   All tables use AUTO_INCREMENT primary keys, DATETIME for timestamps with ON UPDATE CURRENT_TIMESTAMP, and TINYINT(1) for boolean flags. Soft deletes use is_active = 0.

4.1 Identity & Access Tables
stores · Domain: Identity
Registry of all retail branches. Every transactional record references a store.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique store identifier
name
VARCHAR(150)
NN
Full name of the branch
code
VARCHAR(20)
UK, NN
Short branch code e.g. KZH-01
address
TEXT
—
Street address
phone
VARCHAR(20)
—
Branch phone number
currency
VARCHAR(10)
DEF 'INR'
Currency code
timezone
VARCHAR(50)
DEF 'Asia/Kolkata'
Timezone for display
is_active
TINYINT(1)
DEF 1
Soft delete flag
created_at
DATETIME
AUTO
Record creation timestamp
updated_at
DATETIME
AUTO UPDATE
Last modification timestamp

roles · Domain: Identity
Three system roles. Each user is assigned exactly one role.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique role identifier
name
VARCHAR(50)
UK, NN
admin | store_keeper | cashier
description
TEXT
—
Human-readable description
created_at
DATETIME
AUTO
Record creation timestamp

permissions · Domain: Identity
Granular module + action permission pairs assigned to roles.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique permission identifier
module
VARCHAR(50)
NN
sales | products | inventory | users | config
action
VARCHAR(50)
NN
create | read | update | delete | export
description
TEXT
—
Plain-language description
—
—
UNIQUE(module, action)
Prevents duplicate permission pairs

role_permissions · Domain: Identity
Many-to-many junction linking roles to their granted permissions.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique row identifier
role_id
INT
FK → roles.id, NN
The role being granted the permission
permission_id
INT
FK → permissions.id, NN
The permission being granted
—
—
UNIQUE(role_id, permission_id)
Prevents duplicate grants

users · Domain: Identity
All POS operators. Passwords stored as bcrypt hashes. JWT tokens are in-memory only.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique user identifier
store_id
INT
FK → stores.id
Default home store for this user
role_id
INT
FK → roles.id, NN
The user's assigned role
name
VARCHAR(100)
NN
Full display name
username
VARCHAR(50)
UK, NN
Login username
email
VARCHAR(100)
UK
Email address
password_hash
VARCHAR(255)
NN
Bcrypt hashed password
phone
VARCHAR(20)
—
Mobile number
is_active
TINYINT(1)
DEF 1
Soft delete flag
last_login
DATETIME
—
Timestamp of most recent login
created_at / updated_at
DATETIME
AUTO
Record timestamps

user_store_assignments · Domain: Identity
Allows a user to work at multiple branches. is_primary marks their default.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique row identifier
user_id
INT
FK → users.id, CASCADE DEL
The user being assigned
store_id
INT
FK → stores.id, CASCADE DEL
The store being assigned to
is_primary
TINYINT(1)
DEF 0
1 = this is the user's home branch
created_at
DATETIME
AUTO
Assignment creation timestamp
—
—
UNIQUE(user_id, store_id)
One assignment per user per store

4.2 Configuration
app_config · Domain: Config
Key-value configuration. store_id = NULL is the global default; a specific store_id overrides for that branch only.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique config row
store_id
INT
FK → stores.id
NULL = global; set = branch override
config_key
VARCHAR(100)
NN
Setting name e.g. tax_rate, invoice_prefix
config_value
TEXT
—
Setting value (stored as text)
data_type
VARCHAR(20)
DEF 'string'
string | number | boolean | json
description
TEXT
—
Human-readable explanation
updated_at
DATETIME
AUTO UPDATE
Last modification timestamp
—
—
UNIQUE(store_id, config_key)
One value per key per scope

4.3 Catalog & Inventory
categories · Domain: Catalog
Self-referencing hierarchy. parent_id = NULL for top-level; unlimited subcategory depth.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique category identifier
parent_id
INT
FK → categories.id
NULL = top-level; set = subcategory
name
VARCHAR(100)
NN
Display name
slug
VARCHAR(100)
UK, NN
URL-safe identifier
sort_order
INT
DEF 0
Display order in listings
is_active
TINYINT(1)
DEF 1
Soft delete flag
created_at / updated_at
DATETIME
AUTO
Record timestamps

products · Domain: Catalog
Master product catalog. Pricing snapshotted in sale/purchase items so history is preserved.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique product identifier
category_id
INT
FK → categories.id
The product's category
name
VARCHAR(200)
NN
Product display name
sku
VARCHAR(100)
UK, NN
Internal stock keeping unit code
barcode
VARCHAR(100)
UK
EAN / UPC / QR barcode value
unit
VARCHAR(30)
DEF 'pcs'
pcs | kg | litre | box
purchase_price
DECIMAL(12,2)
DEF 0.00
Latest average cost price
selling_price
DECIMAL(12,2)
NN
Retail selling price
tax_rate
DECIMAL(5,2)
DEF 0.00
Applicable tax percentage
is_service
TINYINT(1)
DEF 0
1 = service item; no stock tracking
alert_quantity
INT
DEF 5
Low-stock alert threshold
is_active
TINYINT(1)
DEF 1
Soft delete flag

product_inventory · Domain: Catalog
Per-store stock levels. Available stock = quantity minus reserved_quantity.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique inventory row identifier
product_id
INT
FK → products.id, CASCADE DEL
The product
store_id
INT
FK → stores.id, CASCADE DEL
The branch
quantity
DECIMAL(12,3)
DEF 0.000
Current on-hand stock quantity
reserved_quantity
DECIMAL(12,3)
DEF 0.000
Locked for pending quotations
—
—
UNIQUE(product_id, store_id)
One row per product per branch

stock_movements · Domain: Catalog
Immutable audit log of every stock change. Updated by service layer, never DB triggers.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique movement row identifier
product_id
INT
FK → products.id, NN
The product whose stock changed
store_id
INT
FK → stores.id, NN
The branch where change occurred
user_id
INT
FK → users.id
Operator who triggered the change
movement_type
VARCHAR(30)
NN
purchase | sale | return | adjustment | transfer
reference_type
VARCHAR(30)
—
purchase | sale | return | manual
reference_id
INT
—
ID of the causative record
quantity_before
DECIMAL(12,3)
—
Stock level before this change
quantity_change
DECIMAL(12,3)
NN
Positive = stock in; Negative = stock out
quantity_after
DECIMAL(12,3)
—
Stock level after this change
notes
TEXT
—
Optional reason or comment
created_at
DATETIME
AUTO
Timestamp of the movement

4.4 Procurement
vendors · Domain: Procurement
Supplier profiles. balance tracks the running payable amount.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique vendor identifier
name
VARCHAR(150)
NN
Vendor or contact person name
company
VARCHAR(150)
—
Company / business name
phone
VARCHAR(20)
—
Vendor phone number
tax_number
VARCHAR(50)
—
GST / VAT registration number
opening_balance
DECIMAL(12,2)
DEF 0.00
Payable balance at setup
balance
DECIMAL(12,2)
DEF 0.00
Current running payable balance
is_active
TINYINT(1)
DEF 1
Soft delete flag

purchases · Domain: Procurement
Purchase order / GRN header. Tracks both ordered and received status.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique purchase identifier
purchase_number
VARCHAR(50)
UK, NN
Reference e.g. PO-20240001
store_id
INT
FK → stores.id, NN
Branch that made the purchase
vendor_id
INT
FK → vendors.id, NN
The supplying vendor
user_id
INT
FK → users.id, NN
Store keeper who recorded it
status
VARCHAR(20)
DEF 'received'
ordered | partial | received | cancelled
total_amount
DECIMAL(12,2)
DEF 0.00
Final payable to vendor
paid_amount
DECIMAL(12,2)
DEF 0.00
Amount already paid
due_amount
DECIMAL(12,2)
DEF 0.00
Remaining balance payable
payment_status
VARCHAR(20)
DEF 'unpaid'
unpaid | partial | paid

purchase_items · Domain: Procurement
Line items for each purchase. Cost fields snapshotted at purchase time.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique line item identifier
purchase_id
INT
FK → purchases.id, CASCADE DEL
Parent purchase
product_id
INT
FK → products.id, NN
The product purchased
product_name
VARCHAR(200)
NN
Snapshot of product name
quantity
DECIMAL(12,3)
NN
Quantity purchased
unit_cost
DECIMAL(12,2)
NN
Cost per unit at purchase time
total_cost
DECIMAL(12,2)
NN
Total line cost

purchase_payments · Domain: Procurement
Each payment made to a vendor. Supports partial settlements.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique payment identifier
purchase_id
INT
FK → purchases.id, CASCADE DEL
Parent purchase
payment_method
VARCHAR(30)
NN
cash | bank_transfer | cheque | upi
amount
DECIMAL(12,2)
NN
Amount paid
reference_number
VARCHAR(100)
—
Cheque/transaction reference
payment_date
DATETIME
AUTO
Date payment was made

4.5 Sales
sales · Domain: Sales
Invoice header. Supports draft (suspended bill) and credit sales tracking.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique sale / invoice identifier
invoice_number
VARCHAR(50)
UK, NN
Human-readable e.g. INV-20240001
store_id
INT
FK → stores.id, NN
Branch where sale was made
user_id
INT
FK → users.id, NN
Cashier who created the invoice
customer_id
INT
FK → customers.id
NULL for walk-in customer
quotation_id
INT
FK → quotations.id
Set if converted from a quotation
status
VARCHAR(20)
DEF 'completed'
draft | completed | cancelled | returned
subtotal
DECIMAL(12,2)
NN
Sum of line items before discounts
discount_amount
DECIMAL(12,2)
DEF 0.00
Calculated invoice-level discount
tax_amount
DECIMAL(12,2)
DEF 0.00
Total tax collected
total_amount
DECIMAL(12,2)
NN
Final payable amount
paid_amount
DECIMAL(12,2)
DEF 0.00
Total amount received
due_amount
DECIMAL(12,2)
DEF 0.00
Balance due for credit sales
created_at
DATETIME
AUTO
Date and time the sale was created
updated_at
DATETIME
AUTO UPDATE
Last modification timestamp

sale_items · Domain: Sales
Line items. All pricing snapshotted at sale time to preserve invoice history.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique line item identifier
sale_id
INT
FK → sales.id, CASCADE DEL
Parent invoice
product_id
INT
FK → products.id, NN
The product sold
product_name
VARCHAR(200)
NN
Snapshot of product name at sale time
product_sku
VARCHAR(100)
—
Snapshot of SKU at sale time
quantity
DECIMAL(12,3)
NN
Quantity sold
unit_price
DECIMAL(12,2)
NN
Selling price per unit at sale time
tax_rate
DECIMAL(5,2)
DEF 0.00
Tax % applied at sale time
tax_amount
DECIMAL(12,2)
DEF 0.00
Tax amount for this line
total_price
DECIMAL(12,2)
NN
Line total after discounts and tax

sale_payments · Domain: Sales
One row per payment method. Enables split payments e.g. Cash + UPI + Loyalty.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique payment row identifier
sale_id
INT
FK → sales.id, CASCADE DEL
Parent invoice
payment_method
VARCHAR(30)
NN
cash | card | upi | loyalty_points | credit
amount
DECIMAL(12,2)
NN
Amount paid via this method
reference_number
VARCHAR(100)
—
UPI UTR / card last 4 digits
payment_date
DATETIME
AUTO
Timestamp of payment

4.6 Quotations
quotations · Domain: Sales
Estimate or quotation header. On conversion, converted_sale_id is populated.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique quotation identifier
quotation_number
VARCHAR(50)
UK, NN
Reference e.g. QT-20240001
store_id
INT
FK → stores.id, NN
Branch that created the quotation
user_id
INT
FK → users.id, NN
User who drafted it
customer_id
INT
FK → customers.id
Linked customer (NULL for walk-in)
valid_until
DATE
—
Expiry date
status
VARCHAR(20)
DEF 'pending'
pending | converted | expired | cancelled
total_amount
DECIMAL(12,2)
DEF 0.00
Quoted total payable
converted_sale_id
INT
FK → sales.id
Populated on conversion to sale

quotation_items · Domain: Sales
Line items for each quotation, mirrors sale_items structure.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique line item identifier
quotation_id
INT
FK → quotations.id, CASCADE DEL
Parent quotation
product_id
INT
FK → products.id, NN
The product being quoted
product_name
VARCHAR(200)
NN
Snapshot of product name
quantity
DECIMAL(12,3)
NN
Quoted quantity
unit_price
DECIMAL(12,2)
NN
Quoted unit price
total_price
DECIMAL(12,2)
NN
Line total for the quotation

4.7 Returns & Refunds
returns · Domain: Sales
Return / refund header. refund_method records how customer was compensated.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique return identifier
return_number
VARCHAR(50)
UK, NN
Reference e.g. RET-20240001
sale_id
INT
FK → sales.id, NN
The original invoice being returned
store_id
INT
FK → stores.id, NN
Branch processing the return
user_id
INT
FK → users.id, NN
Operator processing the return
customer_id
INT
FK → customers.id
Customer making the return
total_amount
DECIMAL(12,2)
DEF 0.00
Total refund amount
refund_method
VARCHAR(30)
—
cash | card | store_credit | loyalty_points
status
VARCHAR(20)
DEF 'completed'
pending | completed | rejected

return_items · Domain: Sales
Individual items in a return. When restock=1, service layer creates a positive stock_movement.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique return item identifier
return_id
INT
FK → returns.id, CASCADE DEL
Parent return record
sale_item_id
INT
FK → sale_items.id, NN
Original line item being returned
product_id
INT
FK → products.id, NN
The product being returned
product_name
VARCHAR(200)
NN
Snapshot of product name
quantity
DECIMAL(12,3)
NN
Quantity being returned
unit_price
DECIMAL(12,2)
NN
Price per unit at original sale
total_amount
DECIMAL(12,2)
NN
Total refund for this line
restock
TINYINT(1)
DEF 1
1 = add returned qty back to inventory

4.8 Customer CRM
customers · Domain: CRM
Customer profiles. loyalty_points is denormalized for fast reads.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique customer identifier
name
VARCHAR(150)
NN
Customer full name
phone
VARCHAR(20)
UK
Mobile number (unique identifier)
email
VARCHAR(100)
—
Email address
date_of_birth
DATE
—
For birthday offers
loyalty_points
INT
DEF 0
Current redeemable loyalty balance
opening_balance
DECIMAL(12,2)
DEF 0.00
Credit balance at system setup
balance
DECIMAL(12,2)
DEF 0.00
Running credit / advance balance
is_active
TINYINT(1)
DEF 1
Soft delete flag

loyalty_transactions · Domain: CRM
Immutable log of every loyalty point event. transaction_type distinguishes earning from spending.

Field Name
Data Type
Constraints
Description
id
INT
PK, AI
Unique transaction identifier
customer_id
INT
FK → customers.id, CASCADE DEL
The customer
sale_id
INT
FK → sales.id
The sale that triggered this event
transaction_type
VARCHAR(20)
NN
earned | redeemed | expired | adjusted
points
INT
NN
Points change (positive = credit, negative = debit)
balance_after
INT
NN
Customer's total points after this transaction
notes
TEXT
—
Reason for manual adjustments
created_at
DATETIME
AUTO
Timestamp of the event

5. Index Strategy
   Indexes are defined to optimise the most frequent POS query patterns: barcode scanner lookups, sales date-range reports, customer mobile search, and stock level queries.

Index Name
Table
Column(s)
Purpose
idx_products_barcode
products
barcode
Fast barcode scanner lookup
idx_products_sku
products
sku
SKU search in product management
idx_products_category
products
category_id
Products by category listing
idx_inventory_product
product_inventory
product_id
Stock level for a product
idx_inventory_store
product_inventory
store_id
All stock at a branch
idx_stockmov_product
stock_movements
product_id
Movement history for a product
idx_stockmov_date
stock_movements
created_at
Date-range movement queries
idx_stockmov_ref
stock_movements
reference_type, reference_id
Trace movement to source
idx_sales_store
sales
store_id
All sales at a branch
idx_sales_customer
sales
customer_id
Purchase history for a customer
idx_sales_date
sales
sale_date
Daily / monthly sales reports
idx_sales_status
sales
status
Filter draft or cancelled sales
idx_sales_invoice
sales
invoice_number
Invoice lookup by number
idx_purchases_vendor
purchases
vendor_id
All purchases from a vendor
idx_purchases_date
purchases
purchase_date
Procurement date-range reports
idx_returns_sale
returns
sale_id
Returns against an invoice
idx_customers_phone
customers
phone
Customer lookup by mobile
idx_loyalty_customer
loyalty_transactions
customer_id
Point history for a customer

6. Key Design Decisions

Decision
Choice & Rationale
ORM
Sequelize v6 — single codebase for SQLite (dev) and MySQL (prod)
Price Snapshots
sale_items, purchase_items, quotation_items store name + pricing at transaction time. Future price changes never affect historical records.
Split Payments
sale_payments and purchase_payments are separate tables. One invoice can be settled with multiple methods simultaneously.
Stock Service Layer
stock_movements updated by Node.js service layer (not DB triggers). Logic is testable, debuggable, and dialect-agnostic.
Config Override
store_id = NULL is global default. Same config_key with a store_id overrides for that branch. Query: ORDER BY store_id DESC LIMIT 1.
Soft Deletes
is_active = 0 on all master tables. No physical DELETEs on transactional data. Preserves FK integrity and history.
Normalization
Third Normal Form (3NF). No repeating groups, no partial dependencies, no transitive dependencies.
Multi-Store
Every transactional table has store_id FK. Branch-isolated by default; centralized reporting aggregates across store_ids.

END OF DATABASE DESIGN DOCUMENT
