const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Product = sequelize.define(
    "Product",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "stores", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      category_id: {
        type: DataTypes.INTEGER,
        references: { model: "categories", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      tax_group_id: { type: DataTypes.INTEGER, allowNull: true },
      /* ✔ NEW — FK to discounts.id, links a default promo to this product */
      discount_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      },
      name: { type: DataTypes.STRING(200), allowNull: false },
      sku: { type: DataTypes.STRING(100), allowNull: false },
      barcode: { type: DataTypes.STRING(100) },
      hsn_code: { type: DataTypes.STRING(20), allowNull: true },
      description: { type: DataTypes.TEXT },
      brand: { type: DataTypes.STRING(100), allowNull: true },
      unit_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "units", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      unit_value: { type: DataTypes.STRING(20), allowNull: true },
      purchase_price: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
      selling_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      mrp: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      tax_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0.0 },
      tax_included: { type: DataTypes.TINYINT, defaultValue: 0 },
      image_url: { type: DataTypes.TEXT },
      is_active: { type: DataTypes.TINYINT, defaultValue: 1 },
      is_service: { type: DataTypes.TINYINT, defaultValue: 0 },
      alert_quantity: { type: DataTypes.INTEGER, defaultValue: 5 },
      max_quantity: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      tableName: "products",
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ["store_id"] },
        { fields: ["store_id", "sku"], unique: true },
      ],
    },
  );

  Product.associate = (models) => {
    Product.belongsTo(models.Unit, { foreignKey: "unit_id", as: "UnitRef" });
    Product.belongsTo(models.Category, { foreignKey: "category_id" });
    Product.belongsTo(models.TaxGroup, {
      foreignKey: "tax_group_id",
      as: "TaxGroup",
    });
    /* ✔ NEW association — eager-loads discount name/code/type in getAll & getById */
    Product.belongsTo(models.Discount, {
      foreignKey: "discount_id",
      as: "Discount",
    });
    // ✔ NEW: Product variants (e.g., 5kg, 1kg, 500ml versions)
    Product.hasMany(models.ProductVariant, {
      foreignKey: "product_id",
      as: "Variants",
    });
    Product.hasMany(models.OfferProduct, {
      foreignKey: "product_id",
      as: "OfferProducts",
    });
    Product.hasMany(models.ProductBarcode, {
      foreignKey: "product_id",
      as: "ProductBarcodes",
    });
    Product.hasMany(models.ProductInventory, { foreignKey: "product_id" });
    Product.hasMany(models.StockMovement, { foreignKey: "product_id" });
    Product.hasMany(models.SaleItem, { foreignKey: "product_id" });
    Product.hasMany(models.PurchaseItem, { foreignKey: "product_id" });
    Product.hasMany(models.StoreProductPrice, { foreignKey: "product_id", as: "StorePrices" });
  };

  return Product;
};
