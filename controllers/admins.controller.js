const { Admin, Election } = require("../models");

const bcrypt = require("bcrypt");
const saltRounds = 10;

async function getAdminsDashboard(request, response) {
  const userId = request.user.id;
  const admin = await Admin.findByPk(userId);

  const elections = await Election.findAll({
    where: { adminId: request.user.id },
  });
  if (userId !== admin.id) {
    return response.redirect("/login");
  }

  response.render("admins/dashboard", {
    username: admin.name,
    elections: elections,
    csrfToken: request.csrfToken(),
  });
}

async function getAdminProfile(request, response) {
  const userId = request.user.id;
  const admin = await Admin.findByPk(userId);
  response.render("admins/profile", {
    username: admin.name,
    admin,
    csrfToken: request.csrfToken(),
    title: "Profile",
  });
}

async function updateAdminProfile(request, response) {
  const userId = request.user.id;
  const admin = await Admin.findByPk(userId);
  try {
    const hashpwd = await bcrypt.hash(request.body.password, saltRounds);
    await Admin.updateProfile(
      request.body.name,
      request.body.email,
      hashpwd,
      admin.id
    );
    response.redirect("/profile");
  } catch (error) {
    console.log(error);
    return response.send(error);
  }
}

module.exports = {
  getAdminsDashboard,
  getAdminProfile,
  updateAdminProfile,
};
