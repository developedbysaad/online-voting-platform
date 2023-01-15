const { Admin, Election, Question, Option, Voter } = require("../models");

async function getElectionJson(request, response) {
  const elections = await Election.findAll({
    where: { adminId: request.user.id },
  });

  return response.json(elections);
}

async function postElection(request, response) {
  const userId = request.user.id;

  try {
    const election = await Election.add(userId, request.body.title);
    const electionId = election.id;
    await Election.edit(electionId, electionId);
    response.redirect(`/election/${electionId}/question`);
  } catch (error) {
    console.log(error);
    response.send(error);
  }
}

async function updateElectionName(request, response) {
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

async function deleteElection(request, response) {
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

async function getCustomUrl(request, response) {
  const admin = await Admin.find(request.user.id);
  const election = await Election.find(request.params.id);

  if (election.ended) {
    console.log("Election ended");
    return response.redirect(`/e/${election.customUrl}/result`);
  }

  response.render(`elections/editCustomUrl`, {
    csrfToken: request.csrfToken(),
    election,
    username: admin.name,
  });
}

async function postCustomUrl(request, response) {
  const admin = await Admin.find(request.user.id);
  const election = await Election.find(request.params.id);
  if (request.user.id === admin.id) {
    if (request.body.customUrl.length < 2) {
      request.flash("error", "Custom Url should have minimum 2 characters");
      return response.redirect(`/election/${election.id}`);
    }
    if (request.body.customUrl.includes(" ")) {
      request.flash("error", "spaces are not allowed");
      return response.redirect(`/election/${election.id}`);
    }
    try {
      await Election.edit(request.body.customUrl, election.id);
      return response.redirect(`/election/${election.id}/question`);
    } catch (error) {
      request.flash("error", "This URL is already taken, Try again");
      console.log(error);
      return response.redirect(`/election/${election.id}`);
    }
  } else {
    return response.redirect("/");
  }
}

// Preview Election

async function previewElection(request, response) {
  const userId = request.user.id;
  const admin = await Admin.findByPk(userId);
  const election = await Election.find(request.params.id);

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
  if (questions.length < 1) {
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
  if (voters.length < 1) {
    request.flash("error", "Please add atleast 1 voter");
    return response.redirect(`/election/${request.params.id}/voter`);
  }

  const options = [];

  for (let i = 0; i < questions.length; i++) {
    const allOption = await Option.find(questions[i].id);
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

// Launch Election

async function LaunchElection(request, response) {
  const election = await Election.customUrl(request.params.customUrl);

  const questions = await Question.find(election.id);

  if (questions.length < 1) {
    request.flash("error", "Please add atleast 1 question");
    return response.redirect(`/election/${election.id}/question/`);
  }

  for (let i = 0; i < questions.length; i++) {
    const allOptions = await Option.find(questions[i].id);
    if (allOptions.length < 2) {
      request.flash("error", "Please add atleast 2 options to each question");
      return response.redirect(
        `/election/${election.id}/question/${questions[i].id}`
      );
    }
  }

  const voters = await Voter.find(election.id);
  if (voters.length < 1) {
    request.flash("error", "Please add atleast 1 voter");
    return response.redirect(`/election/${election.id}/voter`);
  }

  try {
    await Election.launch(election.id);
    return response.redirect(`/e/${election.customUrl}`);
  } catch (error) {
    return response.send(error);
  }
}

// Live Election

async function liveElection(request, response) {
  const userId = request.user.id;
  const admin = await Admin.find(userId);
  const election = await Election.customUrl(request.params.customUrl);

  if (userId !== election.adminId) {
    if (
      request.user &&
      request.user.id &&
      request.user.voterId &&
      election.launched
    ) {
      return response.redirect(`/e/${election.customUrl}/vote`);
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
    return response.redirect(`/e/${election.customUrl}/result`);
  }
  if (!election.launched) {
    return response.redirect(`/election/${election.id}/question`);
  }
  const voters = await Voter.findAll({
    where: { electionId: election.id },
  });
  const questions = await Question.findAll({
    where: { electionId: election.id },
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

// End Election

async function endElection(request, response) {
  const userId = request.user.id;
  const election = await Election.find(request.params.id);

  if (election.adminId !== userId) {
    return response.redirect("/login");
  }

  if (election.ended || election.launched === false) {
    console.log("Election not launched");
    return response.render("errorPage/notFound");
  }

  try {
    await Election.end(election.id);
    return response.json({ ok: true });
  } catch (error) {
    console.log(error);
    return response.send(error);
  }
}

module.exports = {
  getElectionJson,
  postElection,
  updateElectionName,
  deleteElection,
  getCustomUrl,
  postCustomUrl,
  previewElection,
  LaunchElection,
  liveElection,
  endElection,
};
