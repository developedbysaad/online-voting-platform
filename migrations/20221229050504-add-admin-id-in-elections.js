"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Elections", "adminId", {
      type: Sequelize.DataTypes.INTEGER,
    });

    await queryInterface.addConstraint("Elections", {
      fields: ["adminId"],
      type: "foreign key",
      references: {
        table: "Admins",
        field: "id",
      },
    });
  },

  // eslint-disable-next-line no-unused-vars
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Election", "adminId");
  },
};
