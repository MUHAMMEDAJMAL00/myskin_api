const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Category = sequelize.define(
    "Category",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "stores", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      parent_id: { type: DataTypes.INTEGER },
      name: { type: DataTypes.STRING(100), allowNull: false },
      slug: { type: DataTypes.STRING(100), allowNull: false },
      description: { type: DataTypes.TEXT },
      image_url: { type: DataTypes.TEXT },
      sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
      is_active: { type: DataTypes.TINYINT, defaultValue: 1 },
    },
    {
      tableName: "categories",
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ["store_id"] },
        { fields: ["store_id", "slug"], unique: true },
      ],
    },
  );

  Category.associate = (models) => {
    Category.belongsTo(Category, { foreignKey: "parent_id", as: "parent" });
    Category.hasMany(Category, { foreignKey: "parent_id", as: "children" });
    Category.hasMany(models.Product, { foreignKey: "category_id" });
  };

  return Category;
};
