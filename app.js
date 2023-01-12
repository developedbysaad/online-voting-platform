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
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Session section end here

app.get("/", function (request, response) {
  if (request.user && request.user.id) {
    response.redirect("/home");
  } else {
    response.render("layout/index", {
      csrfToken: request.csrfToken(),
    });
  }
});

// Admin Sign-up
app.get("/signup", function (request, response) {
  response.render("sessions/adminSignup", {
    title: "Sign Up",
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
    title: "Login",
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
);

//  Admin Profile page

app.get(
  "/profile",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const userId = request.user.id;
    const admin = await Admin.findByPk(userId);
    response.render("admins/profile", {
      username: admin.name,
      admin,
      csrfToken: request.csrfToken(),
      title: "Profile",
    });
  }
);

// Admin password update

app.post(
  "/profile/update",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const userId = request.user.id;
    const admin = await Admin.findByPk(userId);
    try {
      const hashpwd = await bcrypt.hash(request.body.password, saltRounds);
      await Admin.updatePassword(
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

// Get election in Json format
app.get(
  "/electionJson",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const elections = await Election.findAll({
      where: { adminId: request.user.id },
    });

    return response.json(elections);
  }
);

// Create Election

app.post(
  "/election",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const userId = request.user.id;

    try {
      const electionId = await Election.add(userId, request.body.title);
      const id = electionId.id;
      response.redirect(`/election/${id}/question`);
    } catch (error) {
      console.log(error);
      response.send(error);
    }
  }
);

// delete election
app.delete(
  "/election/:id/delete",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const questions = await Question.findAll({
      where: { electionId: request.params.id },
    });

    questions.forEach(async (question) => {
      const options = await Option.findAll({
        where: { questionId: question.id },
      });
      options.forEach(async (option) => {
        await Option.delete(option.id);
      });
      await Question.delete(question.id);
    });

    const voters = await Voter.findAll({
      where: { electionId: request.params.id },
    });
    voters.forEach(async (voter) => {
      await Voter.delete(voter.id);
    });

    try {
      await Election.destroy({ where: { id: request.params.id } });
      return response.json({ ok: true });
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
    const election = await Election.findByPk(request.params.id);
    if (election.launched) {
      console.log("Election already launched");
      return response.redirect(`/election/${request.params.id}`);
    }
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
    const election = await Election.findByPk(request.params.id);
    if (election.launched) {
      console.log("Election already launched");
      return response.redirect(`/election/${request.params.id}`);
    }
    const questions = await Question.findAll({
      where: { electionId: request.params.id },
    });

    response.render("elections/addQuestion", {
      election,
      username: admin.name,
      questions,
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

// edit question UI
app.get(
  "/election/:electionId/question/:questionId/editQuestion",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const adminId = request.user.id;
    const admin = await Admin.findByPk(adminId);
    const election = await Election.findByPk(request.params.electionId);

    if (election.launched) {
      console.log("Election already launched");
      return response.redirect(`/election/${request.params.electionId}`);
    }
    const question = await Question.findByPk(request.params.questionId);
    response.render("elections/editQuestion", {
      username: admin.name,
      election,
      question,
      csrfToken: request.csrfToken(),
    });
  }
);

// Update question
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
  "/election/:electionId/question/:questionId/option",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const election = await Election.findByPk(request.params.electionId);
    if (election.launched) {
      console.log("Election already launched");
      return response.redirect(`/election/${request.params.electionId}`);
    }
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
    if (election.launched) {
      console.log("Election already launched");
      return response.redirect(`/election/${request.params.electionId}`);
    }
    const question = await Question.findByPk(request.params.questionId);
    const options = await Option.findAll({
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
      options: options,
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

// Edit Option UI

app.get(
  "/election/:electionId/question/:questionId/option/:optionId/editOption",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const adminId = request.user.id;
    const admin = await Admin.findByPk(adminId);
    const election = await Election.findByPk(request.params.electionId);
    if (election.launched) {
      console.log("Election already launched");
      return response.redirect(`/election/${request.params.electionId}`);
    }
    const option = await Option.findByPk(request.params.optionId);
    const question = await Question.findByPk(request.params.questionId);
    response.render("elections/editOption", {
      username: admin.name,
      election: election,
      question: question,
      option: option,
      csrfToken: request.csrfToken(),
    });
  }
);

// Edit option
app.post(
  "/election/:electionId/question/:questionId/option/:optionId/update",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      await Option.edit(request.body.option, request.params.optionId);
      response.redirect(
        `/election/${request.params.electionId}/question/${request.params.questionId}`
      );
    } catch (error) {
      console.log(error);
      return;
    }
  }
);

// delete option for question
app.delete(
  "/election/:electionId/question/:questionId/option/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      await Option.delete(request.params.id);
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
    const election = await Election.findByPk(request.params.id);
    if (election.launched) {
      console.log("Election already launched");
      return response.redirect(`/election/${request.params.id}`);
    }
    const voters = await Voter.findAll({
      where: { electionId: request.params.id },
    });

    return response.json(voters);
  }
);

// Add voters UI
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
      election,
      username: admin.name,
      voters,
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

// edit voter UI
app.get(
  "/election/:electionId/voter/:voterId/editVoter",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const adminId = request.user.id;
    const admin = await Admin.findByPk(adminId);
    const election = await Election.findByPk(request.params.electionId);

    const voter = await Voter.findByPk(request.params.voterId);
    const question = await Question.findByPk(request.params.questionId);
    response.render("elections/editVoter", {
      username: admin.name,
      election,
      question,
      voter,
      csrfToken: request.csrfToken(),
    });
  }
);

// edit voter
app.post(
  "/election/:electionId/voter/:voterId/update",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      await Voter.edit(
        request.body.voterId,
        request.body.password,
        request.params.voterId
      );
      response.redirect(`/election/${request.params.electionId}/voter`);
    } catch (error) {
      console.log(error);
      return;
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

// election preview
app.get(
  "/election/:id/preview",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const userId = request.user.id;
    const admin = await Admin.findByPk(userId);
    const election = await Election.findByPk(request.params.id);

    if (userId !== election.adminId) {
      if (
        request.user &&
        request.user.id &&
        request.user.voterId &&
        election.launched
      ) {
        return response.redirect(`/election/${election.id}/vote`);
      } else if (
        request.user &&
        request.user.id &&
        request.user.voterId &&
        !election.launched
      ) {
        return response.render("elections/draft");
      }
      return response.redirect("back");
    }

    const questions = await Question.findAll({
      where: { electionId: request.params.id },
    });
    if (questions.length === 0) {
      request.flash("error", "Please add atleast 1 question");
      return response.redirect(`/election/${request.params.id}/question/`);
    }

    for (let i = 0; i < questions.length; i++) {
      const AllOptions = await Option.findAll({
        where: { questionId: questions[i].id },
      });
      if (AllOptions.length < 2) {
        request.flash("error", "Please add atleast 2 options to each question");
        return response.redirect(
          `/election/${request.params.id}/question/${questions[i].id}`
        );
      }
    }

    const voters = await Voter.findAll({
      where: { electionId: request.params.id },
    });
    if (voters.length === 0) {
      request.flash("error", "Please add atleast 1 voter");
      return response.redirect(`/election/${request.params.id}/voter`);
    }

    const options = [];

    for (let i = 0; i < questions.length; i++) {
      const allOption = await Option.findAll({
        where: { questionId: questions[i].id },
      });
      options.push(allOption);
    }

    response.render("elections/preview", {
      username: admin.name,
      election,
      questions,
      options,
      csrfToken: request.csrfToken(),
    });
  }
);

//             ---------------- Election Launch section ------------------------

// launch election
app.get(
  "/election/:id/launch",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    console.log("launching Election");
    const questions = await Question.findAll({
      where: { electionId: request.params.id },
    });
    if (questions.length === 0) {
      request.flash("error", "Please add atleast 1 question");
      return response.redirect(`/election/${request.params.id}/question/`);
    }

    questions.forEach(async (question) => {
      const allOptions = await Option.findAll({
        where: { questionId: question.id },
      });
      if (allOptions.length < 2) {
        request.flash("error", "Please add atleast 2 options to each question");
        return response.redirect(
          `/election/${request.params.id}/question/${question.id}`
        );
      }
    });

    const voters = await Voter.findAll({
      where: { electionId: request.params.id },
    });
    if (voters.length === 0) {
      request.flash("error", "Please add atleast 1 voter");
      return response.redirect(`/election/${request.params.id}/voter`);
    }

    try {
      await Election.launch(request.params.id);
      return response.redirect(`/election/${request.params.id}`);
    } catch (error) {
      return response.send(error);
    }
  }
);

// Live election UI

app.get(
  "/election/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const userId = request.user.id;
    const admin = await Admin.findByPk(userId);
    const election = await Election.findByPk(request.params.id);

    if (userId !== election.adminId) {
      if (
        request.user &&
        request.user.id &&
        request.user.voterId &&
        election.launched
      ) {
        return response.redirect(`/election/${election.id}/vote`);
      } else if (
        request.user &&
        request.user.id &&
        request.user.voterId &&
        !election.launched
      ) {
        return response.render("elections/draft");
      }
      return response.redirect("/home");
    }
    if (election.ended) {
      return response.redirect(`/election/${request.params.id}/result`);
    }
    if (!election.launched) {
      return response.redirect(`/election/${request.params.id}/question`);
    }
    const voters = await Voter.findAll({
      where: { electionId: request.params.id },
    });
    const questions = await Question.findAll({
      where: { electionId: request.params.id },
    });
    let votesCount = 0;
    voters.forEach((voter) => {
      if (voter.voted) {
        votesCount++;
      }
    });
    let totalVoters = voters.length;
    response.render("elections/dashboard", {
      election,
      username: admin.name,
      questions,
      voters,
      votesCount,
      totalVoters,
      csrfToken: request.csrfToken(),
    });
  }
);

// end election
app.put(
  "/election/:id/end",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const adminId = request.user.id;
    const election = await Election.findByPk(request.params.id);

    // ensure that admin has access rights
    if (election.adminId !== adminId) {
      console.log("You don't have access to edit this election");
      return response.render("error", {
        errorMessage: "You are not authorized to view this page",
      });
    }

    if (election.ended === true || election.launched === false) {
      console.log("Election not launched");
      return response.render("errorPage/notFound");
    }

    try {
      await Election.end(request.params.id);
      return response.json({ ok: true });
    } catch (error) {
      console.log(error);
      return response.send(error);
    }
  }
);

//            -----------------     Vote Section       -------------------------

// voter passport session

passport.use(
  "voter-local",
  new LocalStrategy(
    {
      usernameField: "voterId",
      passwordField: "password",
      passReqToCallback: true,
    },
    (request, username, password, done) => {
      Voter.findOne({
        where: { voterId: username, electionId: request.params.id },
      })
        .then(async (voter) => {
          const result = await bcrypt.compare(password, voter.password);
          if (result) {
            return done(null, voter);
          } else {
            return done(null, false, { message: "Invalid password" });
          }
        })
        .catch((error) => {
          console.log(error);
          return done(null, false, {
            message: "This voter is not registered",
          });
        });
    }
  )
);

// UI of vote page
app.get("/election/:id/vote", async (request, response) => {
  const election = await Election.findByPk(request.params.id);

  if (election.launched === false) {
    console.log("Election not launched");
    return response.render("elections/draft");
  }

  // redirect to results page if election is over
  if (election.ended === true) {
    console.log("Election ended");
    return response.redirect(`/election/${request.params.id}/result`);
  }

  const questions = await Question.findAll({
    where: {
      electionId: request.params.id,
    },
  });
  const options = [];

  for (let i = 0; i < questions.length; i++) {
    const allOption = await Option.findAll({
      where: { questionId: questions[i].id },
    });
    options.push(allOption);
  }

  // voter logged in
  if (request.user && request.user.id && request.user.voterId) {
    const voter = await Voter.findByPk(request.user.id);

    response.render("elections/vote", {
      title: "Vote",
      election: election,
      questions,
      options,
      submitted: voter.voted,
      voter,
      csrfToken: request.csrfToken(),
    });
  } else {
    response.redirect(`/election/${election.id}/voterLogin`);
  }
});

app.get("/election/:id/voterLogin", async (request, response) => {
  const election = await Election.findByPk(request.params.id);
  response.render("sessions/voterLogin", {
    csrfToken: request.csrfToken(),
    election: election,
    title: "voter Login",
  });
});

// Voter Login
app.post(
  "/election/:id/voterLogin",
  passport.authenticate("voter-local", {
    failureRedirect: "back",
    failureFlash: true,
  }),
  function (request, response) {
    return response.redirect(`/election/${request.params.id}/vote`);
  }
);

// submit voter response
app.post(
  "/election/:electionId/voter/:id/submit",
  async (request, response) => {
    const election = await Election.findByPk(request.params.electionId);

    if (election.launched === false) {
      console.log("Election not launched");
      return response.render("errorPage/notFound");
    }

    if (election.ended === true) {
      console.log("Election ended");
      return response.render("errorPage/notFound");
    }

    try {
      const questions = await Question.findAll({
        where: {
          electionId: request.params.electionId,
        },
      });

      let responses = [];

      questions.forEach((question) => {
        const responseId = Number(request.body[`question-${question.id}`]);
        responses.push(responseId);
      });
      await Voter.addResponse(request.params.id, responses);
      await Voter.markAsVoted(request.params.id);
      return response.redirect(`/election/${election.id}/vote`);
    } catch (error) {
      console.log(error);
      return response.send(error);
    }
  }
);

// ----------------------------- Result Section -------------------------

// Election results
app.get("/election/:id/result", async (request, response) => {
  const questions = await Question.findAll({
    where: {
      electionId: request.params.id,
    },
  });

  const voters = await Voter.findAll({
    where: {
      electionId: request.params.id,
    },
  });

  let votesCount = 0;
  voters.forEach((voter) => {
    if (voter.voted) {
      votesCount++;
    }
  });

  const totalVoters = voters.length;
  let totalData = [];
  let totalOption = [];
  questions.forEach(async (question) => {
    let singleOptionCount = [];
    let singleOption = [];
    const allOption = await Option.findAll({
      where: { questionId: question.id },
    });

    allOption.forEach((option) => {
      let count = 0;
      voters.forEach((voter) => {
        if (voter.responses.includes(option.id)) {
          count++;
        }
      });
      singleOption.push(option.option);
      singleOptionCount.push(count);
    });
    totalData.push(singleOptionCount);
    totalOption.push(singleOption);
  });

  const options = [];

  questions.forEach(async (question) => {
    const allOption = await Option.findAll({
      where: { questionId: question.id },
    });
    options.push(allOption);
  });

  const election = await Election.findByPk(request.params.id);

  if (request.user && request.user.id && !request.user.voterId) {
    const adminId = request.user.id;
    const admin = await Admin.findByPk(adminId);

    if (adminId !== election.adminId && !election.ended) {
      return response.render("errorPage/notFound");
    }

    response.render("elections/result", {
      csrfToken: request.csrfToken(),
      admin: true,
      username: admin.name,
      election,
      questions,
      options,
      totalData,
      totalOption,
      votesCount,
      voters,
      totalVoters,
    });
  } else {
    if (!election.ended) {
      return response.render("errorPage/notFound");
    }

    const admin = await Admin.findByPk(election.adminId);
    return response.render("elections/result", {
      csrfToken: request.csrfToken(),
      admin: false,
      username: admin.name,
      election,
      questions,
      options,
      totalData,
      totalOption,
      votesCount,
      totalVoters,
    });
  }
});

module.exports = app;
