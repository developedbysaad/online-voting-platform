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
      return await Question.create({
        title,
        description,
        electionId,
      });
    }

    static async find(electionId) {
      return await Question.findAll({
        where: { electionId },
      });
    }

    static async edit(title, description, id) {
      return await Question.update(
        {
          title,
          description,
        },
        {
          where: {
            id,
          },
        }
      );
    }

    static async delete(id) {
      return await Question.destroy({
        where: {
          id,
        },
      });
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
