const { Admin, Election, Question, Option } = require("../models");

async function getQuestionJson(request, response) {
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

async function getQuestion(request, response) {
  const userId = request.user.id;
  const admin = await Admin.findByPk(userId);
  const election = await Election.findByPk(request.params.id);
  if (election.launched) {
    console.log("Election already launched");
    return response.redirect(`/e/${election.customUrl}`);
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

async function postQuestion(request, response) {
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

async function getUpdateQuestion(request, response) {
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

async function updateQuestion(request, response) {
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

async function deleteQuestion(request, response) {
  try {
    await Option.destroy({
      where: { questionId: request.params.questionId },
    });

    await Question.destroy({ where: { id: request.params.questionId } });
    return response.json({ ok: true });
  } catch (error) {
    console.log(error);
    return response.send(error);
  }
}

module.exports = {
  getQuestionJson,
  getQuestion,
  postQuestion,
  getUpdateQuestion,
  updateQuestion,
  deleteQuestion,
};
