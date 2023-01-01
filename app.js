const express = require("express");
const app = express();
const { Admin, Election, Voter, Question, Option } = require("./models");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const csrf = require("tiny-csrf");
const flash = require("connect-flash");
const moment = require("moment");

const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const saltRounds = 10;

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "/public")));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));

//           -------------------- Session using passport.js --------------------

app.use(cookieParser("shh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "my-super-secret-key-2459283459244",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, //24hrs
    },
    resave: false,
    saveUninitialized: false,
  })
);

app.use(flash());
app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  response.locals.moment = moment;
  next();
});

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      Admin.findOne({
        where: { email: username },
      })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid password" });
          }
        })
        .catch(() => {
          return done(null, false, { message: "Email Id not found" });
        });
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializing user in session", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  Admin.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

// Session section end here

app.get("/", function (request, response) {
  response.render("layout/index", {
    csrfToken: request.csrfToken(),
  });
});

// Admin Sign-up
app.get("/signup", function (request, response) {
  response.render("sessions/adminSignup", {
    title: "signup",
    csrfToken: request.csrfToken(),
  });
});

//          -------------------- Admin Section ------------------------

//Create Admin Users

app.post("/users", async (request, response) => {
  // Could validate password in model file [ was having trouble using "len"], therefore using flash here to validate
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
});

// Admin Login
app.get("/login", function (request, response) {
  response.render("sessions/adminLogin", {
    title: "signup",
    csrfToken: request.csrfToken(),
  });
});

// Admin login using session
app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (request, response) => {
    console.log(request.user);
    response.redirect("/home");
  }
);

// Admin Dashboard
app.get(
  "/home",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const loggedInAdminID = request.user.id;
    const admin = await Admin.findByPk(loggedInAdminID);

    const elections = await Election.findAll({
      where: { adminId: request.user.id },
    });

    response.render("admins/dashboard", {
      username: admin.name,
      elections: elections,
      csrfToken: request.csrfToken(),
    });
  }
);

//  Admin Profile page

app.get(
  "/profile",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const loggedInAdminID = request.user.id;
    const admin = await Admin.findByPk(loggedInAdminID);
    response.render("admins/profile", {
      username: admin.name,
      admin: admin,
      csrfToken: request.csrfToken(),
      title: "Profile",
    });
  }
);

// Admin sign out
app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/login");
  });
});

//              --------------- Election Section ------------------

// Create Election

app.post(
  "/election",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const loggedInAdminID = request.user.id;

    try {
      const electionId = await Election.add(
        loggedInAdminID,
        request.body.title
      );
      const id = electionId.id;
      response.redirect(`/election/${id}/question`);
    } catch (error) {
      console.log(error);
      response.send(error);
    }
  }
);

// Edit / Update name of election

app.post(
  "/election/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      await Election.update(
        { name: request.body.title },
        { where: { id: request.params.id } }
      );
      response.redirect(`/election/${request.params.id}/question`);
    } catch (error) {
      console.log(error);
      return response.send(error);
    }
  }
);
//             ---------------- Question Section ------------------------

// Get questions of the election
app.get(
  "/election/:id/questionJson",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const allQuestions = await Question.findAll({
      where: { electionId: request.params.id },
    });

    return response.json(allQuestions);
  }
);

// Web page to add questions
app.get(
  "/election/:id/question",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const adminId = request.user.id;
    const admin = await Admin.findByPk(adminId);
    const elections = await Election.findByPk(request.params.id);

    const questions = await Question.findAll({
      where: { electionId: request.params.id },
    });

    response.render("elections/addQuestion", {
      election: elections,
      username: admin.name,
      questions: questions,
      csrfToken: request.csrfToken(),
    });
  }
);

// Create Question

app.post(
  "/election/:id/questions/add",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const question = await Question.add(
        request.body.title,
        request.body.description,
        request.params.id
      );
      console.log(question);
      response.redirect(`/election/${request.params.id}/question`);
    } catch (error) {
      console.log(error);
      return response.send(error);
    }
  }
);

// edit question
app.post(
  "/election/:electionId/question/:questionId/update",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      await Question.edit(
        request.body.title,
        request.body.description,
        request.params.questionId
      );
      response.redirect(`/election/${request.params.electionId}/question/`);
    } catch (error) {
      console.log(error);
      return;
    }
  }
);

// Delete Question

app.delete(
  "/election/:id/question/:questiondId",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      await Option.destroy({
        where: { questionId: request.params.questiondId },
      });

      await Question.destroy({ where: { id: request.params.questiondId } });
      return response.json({ ok: true });
    } catch (error) {
      console.log(error);
      return response.send(error);
    }
  }
);

//             ---------------- Option Section ------------------------

// get options
app.get(
  "/election/:electionID/question/:questionId/option",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const options = await Option.findAll({
      where: { questionId: request.params.questionId },
    });
    return response.send(options);
  }
);

// UI to add options
app.get(
  "/election/:electionId/question/:questionId",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const adminId = request.user.id;
    const admin = await Admin.findByPk(adminId);
    const election = await Election.findByPk(request.params.electionId);
    const question = await Question.findByPk(request.params.questionId);
    const option = await Option.findAll({
      where: {
        questionId: request.params.questionId,
      },
    });
    const voter = await Voter.findAll({
      where: {
        electionId: request.params.electionId,
      },
    });
    return response.render("elections/addOption", {
      username: admin.name,
      election: election,
      question: question,
      option: option,
      voter: voter,
      csrfToken: request.csrfToken(),
    });
  }
);

// add option to questions
app.post(
  "/election/:electionId/question/:questionId/options/add",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const election = await Election.findByPk(request.params.electionId);
    const question = await Question.findByPk(request.params.questionId);

    if (election.launched) {
      console.log("Election already launched");
      return response.render("error", {
        errorMessage: "Election is already live",
      });
    }

    try {
      await Option.add(request.body.option, request.params.questionId);
      response.redirect(
        `/election/${request.params.electionId}/question/${request.params.questionId}`
      );
    } catch (error) {
      console.log(error);
      request.flash(
        "error",
        error.errors.map((error) => error.message)
      );
      console.log(error);
      return response.redirect(
        `/election/${election.id}/question/${question.id}`
      );
    }
  }
);

// delete option for question
app.delete(
  "/election/:electionId/question/:questionId/option/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      await Option.destroy({ where: { id: request.params.id } });
      return response.json({ ok: true });
    } catch (error) {
      console.log(error);
      return response.send(error);
    }
  }
);

//             ---------------- Voter Section ------------------------

// Create Voter

// get voters of election
app.get(
  "/election/:id/voterJson",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const voters = await Voter.findAll({
      where: { electionId: request.params.id },
    });

    return response.json(voters);
  }
);

// Web page to add voters
app.get(
  "/election/:id/voter",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const adminId = request.user.id;
    const admin = await Admin.findByPk(adminId);
    const election = await Election.findByPk(request.params.id);
    const voters = await Voter.findAll({
      where: { electionId: request.params.id },
    });

    response.render("elections/addVoter", {
      election: election,
      username: admin.name,
      voters: voters,
      csrfToken: request.csrfToken(),
    });
  }
);

app.post(
  "/election/:id/voters/add",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const hashpwd = await bcrypt.hash(request.body.password, saltRounds);
      await Voter.add(request.body.voterId, hashpwd, request.params.id);
      response.redirect(`/election/${request.params.id}/voter`);
    } catch (error) {
      console.log(error);
      return response.send(error);
    }
  }
);

// delete voter
app.post(
  "/election/:electionId/voter/:voterId/delete",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      await Voter.delete(request.params.voterId);
      return response.json({ ok: true });
    } catch (error) {
      console.log(error);
      return response.send(error);
    }
  }
);

//             ---------------- Election preview section ------------------------

//             ---------------- Election Launch section ------------------------

//             ---------------- Election result section ------------------------

module.exports = app;
