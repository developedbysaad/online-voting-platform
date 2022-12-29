const express = require("express");
const app = express();
const { Admin, Election } = require("./models");
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

// Session using passport.js

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
  response.render("layout/index");
});

// Admin Sign-up
app.get("/signup", function (request, response) {
  response.render("sessions/adminSignup", {
    title: "signup",
    csrfToken: request.csrfToken(),
  });
});

// Admin Section Starts

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
      where: { adminID: request.user.id },
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

module.exports = app;
