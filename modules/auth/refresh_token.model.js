"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const RefreshToken = sequelize.define(
    "RefreshToken",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      token_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      used_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: "refresh_tokens",
      underscored: true,
      updatedAt: false,
      indexes: [{ fields: ["user_id"] }],
    },
  );

  RefreshToken.associate = (models) => {
    RefreshToken.belongsTo(models.User, { foreignKey: "user_id" });
  };

  return RefreshToken;
};
