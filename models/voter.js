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
    static async add(voterId, password, electionId) {
      return await Voter.create({
        voterId: voterId,
        password: password,
        electionId: electionId,
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
            id: id,
          },
        }
      );
    }

    static async delete(voterId) {
      return await Voter.destroy({
        where: {
          id: voterId,
        },
      });
    }

    static async markAsVoted(id) {
      return await Voter.update(
        {
          voted: true,
        },
        {
          where: {
            id: id,
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
            id: id,
          },
        }
      );
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
