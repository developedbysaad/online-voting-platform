const { Admin, Election, Question, Voter } = require("../models");

const bcrypt = require("bcrypt");
const saltRounds = 10;

// get voter list in Json format

async function getVoterJson(request, response) {
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

// Get Voters UI

async function getVoter(request, response) {
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

// Post Voter

async function postVoter(request, response) {
  try {
    const hashpwd = await bcrypt.hash(request.body.password, saltRounds);
    await Voter.createVoter(request.body.voterId, hashpwd, request.params.id);
    response.redirect(`/election/${request.params.id}/voter`);
  } catch (error) {
    console.log(error);
    return response.send(error);
  }
}

// Update Voter info UI

async function getUpdateVoter(request, response) {
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

// Update Voter

async function updateVoter(request, response) {
  try {
    await Voter.editVoter(
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

// Delete Voter

async function deleteVoter(request, response) {
  try {
    await Voter.delete(request.params.voterId);
    return response.json({ ok: true });
  } catch (error) {
    console.log(error);
    return response.send(error);
  }
}

module.exports = {
  getVoterJson,
  getVoter,
  postVoter,
  getUpdateVoter,
  updateVoter,
  deleteVoter,
};
