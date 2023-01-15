const { Admin, Election, Question, Option, Voter } = require("../models");

async function getOptionJson(request, response) {
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

async function getOption(request, response) {
  const adminId = request.user.id;
  const admin = await Admin.findByPk(adminId);
  const election = await Election.findByPk(request.params.electionId);
  if (election.launched) {
    console.log("Election already launched");
    return response.redirect(`/e/${election.customUrl}`);
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

async function postOption(request, response) {
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

async function getUpdateOption(request, response) {
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

async function updateOption(request, response) {
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

async function deleteOption(request, response) {
  try {
    await Option.delete(request.params.id);
    return response.json({ ok: true });
  } catch (error) {
    console.log(error);
    return response.send(error);
  }
}

module.exports = {
  getOptionJson,
  getOption,
  postOption,
  getUpdateOption,
  updateOption,
  deleteOption,
};
