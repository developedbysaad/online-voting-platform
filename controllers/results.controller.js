const { Admin, Election, Question, Option, Voter } = require("../models");

// Get Result

async function getResult(request, response) {
  const election = await Election.customUrl(request.params.customUrl);
  const questions = await Question.findAll({
    where: {
      electionId: election.id,
    },
  });

  const voters = await Voter.findAll({
    where: {
      electionId: election.id,
    },
  });

  const totalVoters = voters.length;

  let votesCount = 0;
  voters.forEach((voter) => {
    if (voter.voted) {
      votesCount++;
    }
  });

  let totalData = [];
  let totalOption = [];
  questions.forEach(async (question) => {
    let singleOptionCount = [];
    let singleOption = [];
    const allOption = await Option.findAll({
      where: { questionId: question.id },
    });

    allOption.forEach((option) => {
      let count = 0;
      voters.forEach((voter) => {
        if (voter.responses.includes(option.id)) {
          count++;
        }
      });
      singleOption.push(option.option);
      singleOptionCount.push(count);
    });
    totalData.push(singleOptionCount);
    totalOption.push(singleOption);
  });

  const options = [];

  questions.forEach(async (question) => {
    const allOption = await Option.findAll({
      where: { questionId: question.id },
    });
    options.push(allOption);
  });

  if (request.user && request.user.id && !request.user.voterId) {
    const adminId = request.user.id;
    const admin = await Admin.findByPk(adminId);

    if (adminId !== election.adminId && !election.ended) {
      return response.render("errorPage/notFound");
    }

    response.render("elections/result", {
      csrfToken: request.csrfToken(),
      admin: true,
      username: admin.name,
      election,
      questions,
      options,
      totalData,
      totalOption,
      votesCount,
      voters,
      totalVoters,
    });
  } else {
    if (!election.ended) {
      return response.render("errorPage/notFound");
    }

    return response.render("elections/result", {
      csrfToken: request.csrfToken(),
      admin: false,
      election,
      questions,
      options,
      totalData,
      totalOption,
      votesCount,
      totalVoters,
    });
  }
}

module.exports = {
  getResult,
};
