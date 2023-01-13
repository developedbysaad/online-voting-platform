"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Option extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Option.belongsTo(models.Question, {
        foreignKey: "questionId",
      });
    }

    static async find(questionId) {
      return await Option.findAll({
        where: { questionId },
      });
    }

    static async add(option, questionId) {
      return await Option.create({
        option,
        questionId,
      });
    }

    static async edit(option, id) {
      return await Option.update(
        {
          option,
        },
        {
          where: {
            id,
          },
        }
      );
    }

    static async delete(id) {
      return await Option.destroy({
        where: {
          id,
        },
      });
    }
  }
  Option.init(
    {
      option: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: true,
        },
      },
      questionId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Option",
    }
  );
  return Option;
};
