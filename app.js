const express = require("express");
const app = express();

// Controllers

const adminsController = require("./controllers/admins.controller");
const electionsController = require("./controllers/elections.controller");
const optionsController = require("./controllers/options.controller");
const questionsController = require("./controllers/questions.controller");
const resultsController = require("./controllers/results.controller");
const sessionsController = require("./controllers/sessions.controller");
const votesController = require("./controllers/votes.controller");
const votersController = require("./controllers/voters.controller");

// Models

const { Admin, Election, Voter } = require("./models");

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

// Landing Page

app.get("/", function (request, response) {
  if (request.user && request.user.id) {
    response.redirect("/home");
  } else {
    response.render("layout/index", {
      csrfToken: request.csrfToken(),
    });
  }
});

//-------------------------------- Admin Section ------------------------

// Admin Sign-up

app.get("/signup", sessionsController.getAdminsSignUp);

//Create Admin Users

app.post("/users", sessionsController.postAdmins);

// Admin Login

app.get("/login", sessionsController.getAdminsLogin);

// Admin login using session
app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  sessionsController.postAdminsLogin
);

// Admin Dashboard

app.get(
  "/home",
  connectEnsureLogin.ensureLoggedIn(),
  adminsController.getAdminsDashboard
);

//  Admin Profile page

app.get(
  "/profile",
  connectEnsureLogin.ensureLoggedIn(),
  adminsController.getAdminProfile
);

// Admin Profile update

app.post(
  "/profile/update",
  connectEnsureLogin.ensureLoggedIn(),
  adminsController.updateAdminProfile
);

// Admin sign out

app.get("/signout", sessionsController.getAdminSignout);

// ----------------------------------- Election Section ------------------

// Get election in Json format

app.get(
  "/electionJson",
  connectEnsureLogin.ensureLoggedIn(),
  electionsController.getElectionJson
);

// Create Election

app.post(
  "/election",
  connectEnsureLogin.ensureLoggedIn(),
  electionsController.postElection
);

// Update Election Name

app.post(
  "/election/:id",
  connectEnsureLogin.ensureLoggedIn(),
  electionsController.updateElectionName
);

// delete election

app.delete(
  "/election/:id/delete",
  connectEnsureLogin.ensureLoggedIn(),
  electionsController.deleteElection
);

// Custom Url Edit Page

app.get(
  "/election/:id",
  connectEnsureLogin.ensureLoggedIn(),
  electionsController.getCustomUrl
);

// Create Custom Url

app.post(
  "/e/:id/customUrl",
  connectEnsureLogin.ensureLoggedIn(),
  electionsController.postCustomUrl
);

//------------------------------- Question Section ------------------------

// Get questions of the election
app.get(
  "/election/:id/questionJson",
  connectEnsureLogin.ensureLoggedIn(),
  questionsController.getQuestionJson
);

// Add Question UI
app.get(
  "/election/:id/question",
  connectEnsureLogin.ensureLoggedIn(),
  questionsController.getQuestion
);

// Create Question

app.post(
  "/election/:id/questions/add",
  connectEnsureLogin.ensureLoggedIn(),
  questionsController.postQuestion
);

// Update Question UI
app.get(
  "/election/:electionId/question/:questionId/editQuestion",
  connectEnsureLogin.ensureLoggedIn(),
  questionsController.getUpdateQuestion
);

// Update question
app.post(
  "/election/:electionId/question/:questionId/update",
  connectEnsureLogin.ensureLoggedIn(),
  questionsController.updateQuestion
);

// Delete Question

app.delete(
  "/election/:id/question/:questionId",
  connectEnsureLogin.ensureLoggedIn(),
  questionsController.deleteQuestion
);

//---------------------------------- Option Section ------------------------

// get options
app.get(
  "/election/:electionId/question/:questionId/optionJson",
  connectEnsureLogin.ensureLoggedIn(),
  optionsController.getOptionJson
);

// Add Option UI
app.get(
  "/election/:electionId/question/:questionId",
  connectEnsureLogin.ensureLoggedIn(),
  optionsController.getOption
);

// add option
app.post(
  "/election/:electionId/question/:questionId/options/add",
  connectEnsureLogin.ensureLoggedIn(),
  optionsController.postOption
);

// update Option UI

app.get(
  "/election/:electionId/question/:questionId/option/:optionId/editOption",
  connectEnsureLogin.ensureLoggedIn(),
  optionsController.getUpdateOption
);

// Edit option
app.post(
  "/election/:electionId/question/:questionId/option/:optionId/update",
  connectEnsureLogin.ensureLoggedIn(),
  optionsController.updateOption
);

// delete option for question
app.delete(
  "/election/:electionId/question/:questionId/option/:id",
  connectEnsureLogin.ensureLoggedIn(),
  optionsController.deleteOption
);

//---------------------------------- Voter Section ------------------------

// Create Voter

// get voters of election
app.get(
  "/election/:id/voterJson",
  connectEnsureLogin.ensureLoggedIn(),
  votersController.getVoterJson
);

// Add voters UI
app.get(
  "/election/:id/voter",
  connectEnsureLogin.ensureLoggedIn(),
  votersController.getVoter
);

// Add voter

app.post(
  "/election/:id/voters/add",
  connectEnsureLogin.ensureLoggedIn(),
  votersController.postVoter
);

// edit voter UI
app.get(
  "/election/:electionId/voter/:voterId/editVoter",
  connectEnsureLogin.ensureLoggedIn(),
  votersController.getUpdateVoter
);

// edit voter
app.post(
  "/election/:electionId/voter/:voterId/update",
  connectEnsureLogin.ensureLoggedIn(),
  votersController.updateVoter
);

// delete voter
app.post(
  "/election/:electionId/voter/:voterId/delete",
  connectEnsureLogin.ensureLoggedIn(),
  votersController.deleteVoter
);

//-------------------------------- Election preview section ------------------------

// election preview
app.get(
  "/election/:id/preview",
  connectEnsureLogin.ensureLoggedIn(),
  electionsController.previewElection
);

//---------------------------------- Election Launch section ------------------------

// launch election
app.get(
  "/election/:customUrl/launch",
  connectEnsureLogin.ensureLoggedIn(),
  electionsController.LaunchElection
);
// Live election UI

app.get(
  "/e/:customUrl",
  connectEnsureLogin.ensureLoggedIn(),
  electionsController.liveElection
);

// end election
app.put(
  "/election/:id/end",
  connectEnsureLogin.ensureLoggedIn(),
  electionsController.endElection
);

//----------------------------------     Vote Section       -------------------------

// voter passport session

passport.use(
  "voter-local",
  new LocalStrategy(
    {
      usernameField: "voterId",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (request, username, password, done) => {
      const election = await Election.customUrl(request.params.customUrl);
      Voter.findOne({
        where: { voterId: username, electionId: election.id },
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
app.get("/e/:customUrl/vote", votesController.getVote);

// Voter login UI

app.get("/e/:customUrl/voterLogin", sessionsController.getVoterLogin);

// Voter Login
app.post(
  "/e/:customUrl/voterLogin",
  passport.authenticate("voter-local", {
    failureRedirect: "back",
    failureFlash: true,
  }),
  sessionsController.postVoterLogin
);

// submit voter response from voting page
app.post("/election/:customUrl/voter/:id/submit", votesController.postVote);

// ----------------------------- Result Section -------------------------

// Election results
app.get("/e/:customUrl/result", resultsController.getResult);

module.exports = app;
