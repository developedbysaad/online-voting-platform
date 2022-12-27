const express = require("express");
const app = express();
const path = require("path");

// eslint-disable-next-line no-undef
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
// eslint-disable-next-line no-undef
app.use(express.static(path.join(__dirname, "/public")));

app.get("/", function (request, response) {
  response.render("index");
});

module.exports = app;
