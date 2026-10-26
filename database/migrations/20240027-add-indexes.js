module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addIndex("products", ["barcode"], {
      name: "idx_products_barcode",
    });
    await queryInterface.addIndex("products", ["sku"], {
      name: "idx_products_sku",
    });
    await queryInterface.addIndex("products", ["category_id"], {
      name: "idx_products_category",
    });
    await queryInterface.addIndex("product_inventory", ["product_id"], {
      name: "idx_inventory_product",
    });
    await queryInterface.addIndex("product_inventory", ["store_id"], {
      name: "idx_inventory_store",
    });
    await queryInterface.addIndex("stock_movements", ["product_id"], {
      name: "idx_stockmov_product",
    });
    await queryInterface.addIndex("stock_movements", ["created_at"], {
      name: "idx_stockmov_date",
    });
    await queryInterface.addIndex(
      "stock_movements",
      ["reference_type", "reference_id"],
      { name: "idx_stockmov_ref" },
    );
    await queryInterface.addIndex("sales", ["store_id"], {
      name: "idx_sales_store",
    });
    await queryInterface.addIndex("sales", ["customer_id"], {
      name: "idx_sales_customer",
    });
    await queryInterface.addIndex("sales", ["sale_date"], {
      name: "idx_sales_date",
    });
    await queryInterface.addIndex("sales", ["status"], {
      name: "idx_sales_status",
    });
    await queryInterface.addIndex("sales", ["invoice_number"], {
      name: "idx_sales_invoice",
    });
    await queryInterface.addIndex("purchases", ["vendor_id"], {
      name: "idx_purchases_vendor",
    });
    await queryInterface.addIndex("purchases", ["purchase_date"], {
      name: "idx_purchases_date",
    });
    await queryInterface.addIndex("returns", ["sale_id"], {
      name: "idx_returns_sale",
    });
    await queryInterface.addIndex("customers", ["phone"], {
      name: "idx_customers_phone",
    });
    await queryInterface.addIndex("loyalty_transactions", ["customer_id"], {
      name: "idx_loyalty_customer",
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex("products", "idx_products_barcode");
    await queryInterface.removeIndex("products", "idx_products_sku");
    await queryInterface.removeIndex("products", "idx_products_category");
    await queryInterface.removeIndex(
      "product_inventory",
      "idx_inventory_product",
    );
    await queryInterface.removeIndex(
      "product_inventory",
      "idx_inventory_store",
    );
    await queryInterface.removeIndex("stock_movements", "idx_stockmov_product");
    await queryInterface.removeIndex("stock_movements", "idx_stockmov_date");
    await queryInterface.removeIndex("stock_movements", "idx_stockmov_ref");
    await queryInterface.removeIndex("sales", "idx_sales_store");
    await queryInterface.removeIndex("sales", "idx_sales_customer");
    await queryInterface.removeIndex("sales", "idx_sales_date");
    await queryInterface.removeIndex("sales", "idx_sales_status");
    await queryInterface.removeIndex("sales", "idx_sales_invoice");
    await queryInterface.removeIndex("purchases", "idx_purchases_vendor");
    await queryInterface.removeIndex("purchases", "idx_purchases_date");
    await queryInterface.removeIndex("returns", "idx_returns_sale");
    await queryInterface.removeIndex("customers", "idx_customers_phone");
    await queryInterface.removeIndex(
      "loyalty_transactions",
      "idx_loyalty_customer",
    );
  },
};
