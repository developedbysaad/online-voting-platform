const request = require("supertest");
const db = require("../models/index");
const app = require("../app");
const cheerio = require("cheerio");

let server, agent;
function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("Online Voting Platform", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4000, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });

  // -------------------- Authentication System --------------------------

  // -------------------- Admin Section -------------------

  //  Sign Up

  test("sign up", async () => {
    let res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/users").send({
      name: "User A",
      email: "user.a@test.com",
      password: "12345678",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  //  Sign In

  //  Sign Out

  test("sign out", async () => {
    let res = await agent.get("/home");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/home");
    expect(res.statusCode).toBe(302);
  });

  // -------------------- Voter Section --------------------

  //  Sign In

  // -------------------- Elections Section -------------------------------

  //  create election

  test("Creates a new election", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678");
    const res = await agent.get("/home");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/election").send({
      title: "Science Quiz",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  //  edit election

  //  delete election

  //  end election (31 ms)

  //  end election and check results page

  // ----------------------------- Ballot Section ------------------------------

  //  add question

  //  edit question

  //  delete question (16 ms)

  //  add option to question

  //  edit option

  //  delete option

  // --------------------------- Voters Section ---------------------------------------

  //  add voter to election

  //  Edit

  //  Delete
});
