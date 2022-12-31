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
        foreignKey: "electionID",
      });
    }
    static async add(voterID, password, electionID) {
      const res = await Voter.create({
        voterID: voterID,
        password: password,
        electionID: electionID,
        voted: false,
        responses: [],
      });
      return res;
    }

    static async delete(voterID) {
      const res = await Voter.destroy({
        where: {
          id: voterID,
        },
      });
      return res;
    }

    static async markVoted(id) {
      const res = await Voter.update(
        {
          voted: true,
        },
        {
          where: {
            id: id,
          },
        }
      );
      return res;
    }

    static async addResponse(id, response) {
      const res = await Voter.update(
        {
          responses: response,
        },
        {
          where: {
            id: id,
          },
        }
      );
      return res;
    }
  }
  Voter.init(
    {
      voterId: DataTypes.STRING,
      password: DataTypes.STRING,
      electionId: DataTypes.INTEGER,
      voted: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "Voter",
    }
  );
  return Voter;
};
