"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Admin extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    // eslint-disable-next-line no-unused-vars
    static associate(models) {
      Admin.hasMany(models.Election, {
        foreignKey: "adminId",
      });
    }

    static async find(id) {
      return await Admin.findByPk(id);
    }

    static createAdmin(name, email, password) {
      return this.create({
        name,
        email,
        password,
      });
    }

    static async updatePassword(name, email, password, id) {
      return await this.update(
        {
          name,
          email,
          password,
        },
        {
          where: {
            id,
          },
        }
      );
    }
  }
  Admin.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "Name is required",
          },
        },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "Email is required",
          },
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Admin",
    }
  );
  return Admin;
};
