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
      Election.belongsTo(models.Admin, {
        foreignKey: "adminId",
      });
      Election.hasMany(models.Question, {
        foreignKey: "electionId",
      });
      Election.hasMany(models.Voter, {
        foreignKey: "electionId",
      });
    }

    static async find(id) {
      return await Election.findByPk(id);
    }

    static async add(adminId, name) {
      return await Election.create({
        adminId,
        name,
        launched: false,
        ended: false,
      });
    }

    static async edit(customUrl, id) {
      return await Election.update(
        { customUrl },
        {
          where: {
            id,
          },
        }
      );
    }

    static async customUrl(customUrl) {
      return await Election.findOne({
        where: {
          customUrl,
        },
      });
    }

    static async launch(id) {
      return await Election.update(
        { launched: true },
        {
          where: {
            id,
          },
        }
      );
    }

    static async end(id) {
      return await Election.update(
        { ended: true },
        {
          where: {
            id,
          },
        }
      );
    }

    static async delete(id) {
      return await Election.destroy({
        where: {
          id,
        },
      });
    }
  }

  Election.init(
    {
      name: DataTypes.STRING,
      status: DataTypes.INTEGER,
      customUrl: DataTypes.STRING,
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
