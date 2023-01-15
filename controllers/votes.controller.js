const { Election, Question, Option, Voter } = require("../models");

// Get voting page

async function getVote(request, response) {
  const election = await Election.customUrl(request.params.customUrl);

  if (election.launched === false) {
    console.log("Election not launched");
    return response.render("elections/draft");
  }

  if (election.ended) {
    console.log("Election ended");
    return response.redirect(`/e/${election.customUrl}/result`);
  }

  const questions = await Question.findAll({
    where: {
      electionId: election.id,
    },
  });
  const options = [];

  for (let i = 0; i < questions.length; i++) {
    const allOption = await Option.findAll({
      where: { questionId: questions[i].id },
    });
    options.push(allOption);
  }

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
    if (election.customUrl && election.customUrl !== election.id) {
      response.redirect(`/e/${election.customUrl}/voterLogin`);
    } else {
      response.redirect(`/e/${election.customUrl}/voterLogin`);
    }
  }
}

//   Submit Voter response from voting page

async function postVote(request, response) {
  const election = await Election.customUrl(request.params.customUrl);

  if (election.launched === false) {
    console.log("Election not launched");
    return response.render("errorPage/notFound");
  }

  if (election.ended) {
    console.log("Election ended");
    return response.render("errorPage/notFound");
  }

  try {
    const questions = await Question.findAll({
      where: {
        electionId: election.id,
      },
    });

    let responses = [];

    questions.forEach((question) => {
      const responseId = Number(request.body[`question-${question.id}`]);
      responses.push(responseId);
    });
    await Voter.addResponse(request.params.id, responses);
    await Voter.markAsVoted(request.params.id);
    return response.redirect(`/e/${election.customUrl}/vote`);
  } catch (error) {
    console.log(error);
    return response.send(error);
  }
}

module.exports = {
  getVote,
  postVote,
};
