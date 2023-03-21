"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Elections", "customUrl", {
      type: Sequelize.DataTypes.STRING,
      unique: true,
    });
  },

  // eslint-disable-next-line no-unused-vars
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Election", "customUrl");
  },
};
