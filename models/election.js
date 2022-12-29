"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Election extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    // eslint-disable-next-line no-unused-vars
    static associate(models) {
      // define association here
    }
  }
  Election.init(
    {
      name: DataTypes.STRING,
      status: DataTypes.INTEGER,
      launched: DataTypes.BOOLEAN,
      ended: DataTypes.BOOLEAN,
      startDate: DataTypes.DATE,
      endDate: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "Election",
    }
  );
  return Election;
};
