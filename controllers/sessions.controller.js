const { Admin, Election } = require("../models");

const bcrypt = require("bcrypt");
const saltRounds = 10;

// ------------- Admin Section ---------------------------

// Admin SignUp

function getAdminsSignUp(request, response) {
  response.render("sessions/adminSignup", {
    title: "Sign Up",
    csrfToken: request.csrfToken(),
  });
}

// Post Admin

async function postAdmins(request, response) {
  if (request.body.password.length === 0) {
    request.flash("error", "Password is required");
    return response.redirect("/signup");
  }

  if (request.body.password.length < 8) {
    request.flash("error", "Password should have minimum 8 characters");
    return response.redirect("/signup");
  }

  //Hash password using bcrypt
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  try {
    const user = await Admin.create({
      name: request.body.name,
      email: request.body.email,
      password: hashedPwd,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
      }
      response.redirect("/home");
    });
  } catch (error) {
    console.log(error);
    request.flash(
      "error",
      error.errors.map((error) => error.message)
    );
    return response.redirect("/signup");
  }
}

// Get Admin Login

function getAdminsLogin(request, response) {
  response.render("sessions/adminLogin", {
    title: "Login",
    csrfToken: request.csrfToken(),
  });
}

// Post Admin Login

function postAdminsLogin(request, response) {
  console.log(request.user);
  response.redirect("/home");
}

// Admin Signout

function getAdminSignout(request, response, next) {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/login");
  });
}

// --------------- Voter Section ---------------

//   Voter Login

async function getVoterLogin(request, response) {
  const election = await Election.customUrl(request.params.customUrl);

  response.render("sessions/voterLogin", {
    csrfToken: request.csrfToken(),
    election,
    title: "voter Login",
  });
}

//   Post Voter Login

function postVoterLogin(request, response) {
  return response.redirect(`/e/${request.params.customUrl}/vote`);
}

module.exports = {
  getAdminsSignUp,
  postAdmins,
  getAdminsLogin,
  postAdminsLogin,
  getAdminSignout,
  getVoterLogin,
  postVoterLogin,
};
