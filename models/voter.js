"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Voter extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Voter.belongsTo(models.Election, {
        foreignKey: "electionId",
      });
    }

    static async find(electionId) {
      return await Voter.findAll({
        where: { electionId },
      });
    }

    static async add(voterId, password, electionId) {
      return await Voter.create({
        voterId,
        password,
        electionId,
        voted: false,
        responses: [],
      });
    }

    static async edit(voterId, password, id) {
      return await Voter.update(
        {
          voterId,
          password,
        },
        {
          where: {
            id,
          },
        }
      );
    }

    static async markAsVoted(id) {
      return await Voter.update(
        {
          voted: true,
        },
        {
          where: {
            id,
          },
        }
      );
    }

    static async addResponse(id, response) {
      return await Voter.update(
        {
          responses: response,
        },
        {
          where: {
            id,
          },
        }
      );
    }

    static async delete(id) {
      return await Voter.destroy({
        where: {
          id,
        },
      });
    }
  }
  Voter.init(
    {
      voterId: DataTypes.STRING,
      password: DataTypes.STRING,
      electionId: DataTypes.INTEGER,
      responses: DataTypes.ARRAY(DataTypes.INTEGER),
      voted: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "Voter",
    }
  );
  return Voter;
};
