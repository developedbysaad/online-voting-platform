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

    static async add(option, questionId) {
      const res = await Option.create({
        option: option,
        questionId: questionId,
      });
      return res;
    }

    static async edit(value, id) {
      const res = await Option.update(
        {
          option: value,
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
