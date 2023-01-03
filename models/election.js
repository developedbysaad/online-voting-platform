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
    static async add(adminId, name) {
      const res = await Election.create({
        adminId: adminId,
        name: name,
        launched: false,
        ended: false,
      });
      return res;
    }
    static async launch(id) {
      const res = await Election.update(
        { launched: true },
        {
          where: {
            id: id,
          },
        }
      );
      return res;
    }

    static async end(id) {
      const res = await Election.update(
        { ended: true },
        {
          where: {
            id: id,
          },
        }
      );
      return res;
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
