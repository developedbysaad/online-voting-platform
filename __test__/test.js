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
      name: "Science Quiz",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  //  edit election

  test("Update election", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678");

    let electionsResponse = await agent
      .get("/electionJson")
      .set("Accept", "application/json");
    let elections = JSON.parse(electionsResponse.text);

    let electionId = elections[elections.length - 1].id;

    const res = await agent.get(`/election/${electionId}/question`);
    const csrfToken = extractCsrfToken(res);

    let response = await agent.post(`/election/${electionId}`).send({
      title: "Edit Quiz",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toEqual(302);
  });

  //  delete election

  //  Preview Election

  //  Launch Election

  //  end election

  //  end election and check results page

  // ----------------------------- Ballot Section ------------------------------

  //  Add question

  test("Create a question", async () => {
    const agent = request.agent(server);
    await login(agent, "user.a@test.com", "12345678");

    let res = await agent.get("/home");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/election").send({
      name: "Sed ut perspiciatis",
      _csrf: csrfToken,
    });

    let electionsResponse = await agent
      .get("/electionJson")
      .set("Accept", "application/json");
    let elections = JSON.parse(electionsResponse.text);

    let electionId = elections[elections.length - 1].id;

    let questionsResponse = await agent
      .get(`/election/${electionId}/questionJson`)
      .set("Accept", "application/json");
    let count = JSON.parse(questionsResponse.text).length;
    console.log(count);

    res = await agent.get("/home");
    csrfToken = extractCsrfToken(res);
    await agent.post(`/election/${electionId}/questions/add`).send({
      title: "Lorem ipsum dolor sit amet?",
      description:
        "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis",
      _csrf: csrfToken,
    });

    questionsResponse = await agent
      .get(`/election/${electionId}/questionJson`)
      .set("Accept", "application/json");
    let latestCount = JSON.parse(questionsResponse.text).length;

    expect(latestCount).toBe(count + 1);
  });

  //  edit question

  //  delete question

  //  add option to question

  //  edit option

  //  delete option

  // --------------------------- Voters Section ---------------------------------------

  //  add voter to election

  //  Edit

  //  Delete
});
