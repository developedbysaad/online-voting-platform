"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Question extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Question.belongsTo(models.Election, {
        foreignKey: "electionId",
      });
      Question.hasMany(models.Option, {
        foreignKey: "questionId",
      });
    }
    static async add(title, description, electionId) {
      const res = await Question.create({
        title: title,
        description: description,
        electionId: electionId,
      });
      return res;
    }

    static async edit(title, description, questionId) {
      const res = await Question.update(
        {
          title: title,
          description: description,
        },
        {
          where: {
            id: questionId,
          },
        }
      );
      return res;
    }
  }
  Question.init(
    {
      title: DataTypes.STRING,
      description: DataTypes.TEXT,
      electionId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Question",
    }
  );
  return Question;
};
