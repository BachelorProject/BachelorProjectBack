let Contest = require('./../models/contest');
let Round = require('./../models/round');
let Subject = require('./../models/subject');
let User = require('./../models/user');
let ContestRegisteredUser = require('./../models/contest_registered_user');
let UserRoundResult = require('./../models/user_round_result');
let Question = require('./../models/question');
let QuestionAnswer = require('./../models/question_answer');
let AnswerType = require('./../models/answer_type');
let ContestSubject = require('./../models/contest_subject');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const config = require('./../config/config');

async function getContests(params, reply) {
    let userId = params.userId;
    let createdByMe = params.createdByMe;
    let registrationIsOn = params.registrationIsOn;
    let subjects = params.subjects;
    let limit = params.limit;
    let from = params.from;
    let searchString = params.searchString;
    let registeredContest = params.registeredContest;

    if (!searchString) {
        searchString = '';
    }

    let options = {
        where: {
            [Op.or]: {
                description: {[Op.like]: `%${searchString}%`},
                title: {[Op.like]: `%${searchString}%`}
            }
        },
        include: [
            {
                model: Subject,
                required: false
            }
        ]
    };

    if (limit) {
        options.limit = limit;
    }

    if (from) {
        options.offset = from;
    }

    // let availableStatuses = [];

    if (registrationIsOn === 'true') {
        options.where.status = [config.STATUS_REGISTRATION_ON];
        options.order = ['registrationDeadline'];
    } else if (registrationIsOn === 'false') {
        if (createdByMe === 'true') {
            options.where.status = [config.STATUS_REGISTRATION_OVER, config.STATUS_ONGOING, config.STATUS_COMPLETED, config.STATUS_UNPUBLISHED];
        } else {
            options.where.status = [config.STATUS_REGISTRATION_OVER, config.STATUS_ONGOING, config.STATUS_COMPLETED];
        }
        options.order = [['registrationDeadline', 'DESC']];
    }

    if (createdByMe === 'true') {
        options.where.CreateUserId = userId;
    }

    if (subjects) {
        options.include[0].required = true;
        options.include[0].where = {id: subjects.split(',')};
    }

    if (registeredContest) {
        options.include.push({
            model: User,
            required: true,
            through: ContestRegisteredUser,
            where: {
                id: userId
            }
        })
    } else {
        options.include.push({
            model: User,
            required: false,
            through: ContestRegisteredUser,
            where: {
                id: userId
            }
        })
    }

    let contestsInfo = [];
    let subjectsDict = {};
    let countsDict = {};
    // status : ['A', 'C']
    let roundsDict = {};

    // find general contest info
    Contest.findAll(options).then(function (contests) {
        let contestIds = [];
        for (let i = 0; i < contests.length; i++) {
            contestsInfo.push({
                id: contests[i].id,
                title: contests[i].title,
                body: contests[i].description,
                imageUrl: contests[i].contestPictureUrl,
                registrationEnd: new Date(contests[i].registrationDeadline).getTime(),
                status: contests[i].status,
                nextContestStart: null,
                nextContestDuration: null, //todo
                subjects: [],
                registeredCount: null,
                isRegistered: true,

            });
            if (!(contests[i].users.length > 0)) {
                // console.log(contests[i].title + 'REGISTERED');
                contestsInfo[contestsInfo.length - 1].isRegistered = false;
            }
            contestIds.push(contests[i].id)
        }

        // find registered users count
        ContestRegisteredUser.findAll({
            group: ['contestId'],
            attributes: ['contestId', [Sequelize.fn('COUNT', 'contestId'), 'UserCount']],
            where: {
                contestId: contestIds
            }
        }).then(function (count) {
            for (let i = 0; i < count.length; i++) {
                let el = count[i].toJSON();
                countsDict[el.contestId] = el.UserCount;
            }

            // get all subjects list for each contest
            Contest.findAll({
                where: {
                    id: contestIds
                },
                include: {
                    model: Subject,
                    required: true
                }
            }).then(function (contestWithSubjects) {

                for (let i = 0; i < contestWithSubjects.length; i++) {
                    let subjects = [];
                    for (let j = 0; j < contestWithSubjects[i].subjects.length; j++) {
                        subjects.push({
                            id: contestWithSubjects[i].subjects[j].id,
                            name: contestWithSubjects[i].subjects[j].subject,
                            colorId: contestWithSubjects[i].subjects[j].colorId
                        });
                        subjectsDict[contestWithSubjects[i].id] = subjects;
                    }
                }

                // get next round info (or last closed round info)
                Round.findAll({
                    where: {
                        contestId: contestIds,
                        // status: ['A', 'C']
                        status: [config.STATUS_ONGOING, config.STATUS_ACTIVE, config.STATUS_COMPLETED],
                    },
                }).then(function (rounds) {

                    for (let i = 0; i < rounds.length; i++) {
                        console.log(rounds[i]);
                        let contestId = rounds[i].contestId;
                        if (!roundsDict[contestId]) {
                            roundsDict[contestId] = {'A': {}, 'C': {}};
                        }
                        if (rounds[i].status === config.STATUS_ACTIVE) {
                            roundsDict[contestId]['A'][rounds[i].roundNo] = {
                                duration: rounds[i].duration,
                                startTime: rounds[i].startTime,
                            }
                        } else {
                            roundsDict[contestId]['C'][rounds[i].roundNo] = {
                                duration: rounds[i].duration,
                                startTime: rounds[i].startTime,
                            }
                        }
                    }

                    let keys = Object.keys(roundsDict);
                    for (let i = 0; i < keys.length; i++) {
                        let contestId = keys[i];
                        let rs;
                        if (Object.keys(roundsDict[contestId]['A']).length !== 0) {
                            rs = roundsDict[contestId]['A'];
                            let roundNos = Array.from(Object.keys(rs));
                            let roundNo = Math.min.apply(null, roundNos);
                            roundsDict[contestId] = roundsDict[contestId]['A'][roundNo];
                        } else if (roundsDict[contestId]['C']) {
                            rs = roundsDict[contestId]['C'];
                            let roundNos = Array.from(Object.keys(rs));
                            let roundNo = Math.max.apply(null, roundNos);
                            roundsDict[contestId] = roundsDict[contestId]['C'][roundNo];
                        }
                    }

                    // add final data and return
                    for (let i = 0; i < contestsInfo.length; i++) {
                        if (countsDict[contestsInfo[i].id]) {
                            contestsInfo[i].registeredCount = countsDict[contestsInfo[i].id];
                        } else {
                            contestsInfo[i].registeredCount = 0;
                        }
                        if (subjectsDict[contestsInfo[i].id]) {
                            contestsInfo[i].subjects = subjectsDict[contestsInfo[i].id];
                        } else {
                            contestsInfo[i].subjects = [];
                        }
                        if (roundsDict[contestsInfo[i].id]) {
                            contestsInfo[i].nextContestDuration = roundsDict[contestsInfo[i].id].duration;
                            contestsInfo[i].nextContestStart = new Date(roundsDict[contestsInfo[i].id].startTime).getTime();
                        } else {
                            contestsInfo[i].nextContestDuration = 120;
                            contestsInfo[i].nextContestDuration = 120;
                            contestsInfo[i].nextContestStart = new Date() + 1;
                        }
                    }

                    reply.send(contestsInfo);

                }).catch(function (err) {
                    console.log(err);
                    reply.code(500).send({message: 'There was an error!'});
                });

            }).catch(function (err) {
                console.log(err);
                reply.code(500).send({message: 'There was an error!'});
            });

        }).catch(function (err) {
            console.log(err);
            reply.code(500).send({message: 'There was an error!'});
        });

    }).catch(function (err) {
        console.log(err);
        reply.code(500).send({message: 'There was an error!'});
    });
}

module.exports = {
    updateContest: async (request, reply) => {
        let contestInfo = request.body;
        let userId = request.user.dataValues.id;

        // let newContest = {
        //     title: request.body.title,
        //     description: request.body.description,
        //     // creator_id: request.body.creator_id
        // };
        //     id: number;
        //     title: string;
        //     body: string;
        //     imageUrl: string;
        //     registrationEnd: number;
        //     subjectIds: number[];
        //     status: string; //   'UNPUBLISHED', 'REGISTRATION ON', 'REGISTRATION OVER', 'ONGOING', 'CANCELLED', 'COMPLETED'
        //     rounds: ContestRound[];
        // }

        let contestModel = {
            // id: contestInfo.id,
            title: contestInfo.title,
            description: contestInfo.body,
            // imageUrl: contestInfo.contestPictureUrl,
            registrationEnd: contestInfo.registrationDeadline, //time to date convert
            status: contestInfo.status,
            createUser: userId
            // rounds: contestInfo.rounds,
            //subjects
        };
        // if (contestInfo.I)

        //
        // let subjectIds = [];
        // for (let i = 0; i < contest.subjects.length; i++) {
        //     subjectIds.push(contest.subjects[i].id);
        // }
        // contestInfo.subjectIds = subjectIds;

        //update contestinfo
        Contest.update(contestModel, {where: {id: contestInfo.id}}).then(function () {
            //
            ContestSubject.destroy({where: {contestId: contestInfo.id}}).then(function () {

                let records = [];
                for (let i = 0; i < contestInfo.subjectIds.length; i++) {
                    records.push({contestId: contestInfo.id, subjectId: contestInfo.subjectIds[i]});
                }


                let subjectsPromise = contestInfo.subjectIds.length > 0 ? ContestSubject.bulkCreate(records) : Promise.resolve();

                let roundsPromise = Promise.resolve();
                Promise.all([subjectsPromise, roundsPromise]).then(() => {
                    // access results here, p2 is undefined if the condition did not hold
                    reply.code(200).send();
                }).catch(function (error) {
                    console.log('error in catch', error);
                    reply.code(500).send({message: 'There was an error!'});
                });

            }).catch(function (error) {
                console.log('error in catch', error);
                reply.code(500).send({message: 'There was an error!'});
            });

            // roundId: number
            // roundNo: number;
            // strictMode: boolean;
            // isOpen: boolean;
            // duration: number;
            // placeToPass: number; // -1 means this is not passing criteria
            // pointsToPass: number; // -1 means this is not passing criteria
            // questions: number;
            // status: string; //   'ACTIVE', 'ONGOING', 'CANCELLED', 'COMPLETED'
            // startTime: number;

        }).catch(function (error) {
            console.log('error in catch', error);
            reply.code(500).send({message: 'There was an error!'});
        });

    },


    getTournamentList: async (request, reply) => {
        let params = {
            createdByMe: request.query.myContests,
            registrationIsOn: request.query.registrationIsOn,
            subjects: request.query.subjectIds,
            limit: request.query.to - request.query.from,
            from: parseInt(request.query.from),
            searchString: request.query.searchString,
            userId: request.user.dataValues.id
        };
        await getContests(params, reply);
    },

    getRegisteredTournamentList: async (request, reply) => {
        let params = {
            registeredContest: true,
            userId: request.user.dataValues.id
        };
        await getContests(params, reply);
    },

    setContestPicture: async (request, reply) => {
        let userId = request.user.dataValues.id,
            id = request.body.id;
        if (!userId || !id) {
            return reply.code(404).send({message: 'contest not found!'});
        }
        Contest.findOne({
            where: {
                createUserId: userId,
                id: id
            }
        }).then(function (contest) {
            if (!contest) {
                reply.code(404).send({message: 'contest not found!'});
            } else {
                contest.contestPictureUrl = request.file_url;
                Contest.update({contestPictureUrl: request.file_url}, {where: {id: contest.id}}).then(function () {
                    reply.send({success: true, file_url: request.file_url});
                }).catch(function () {
                    reply.code(500).send({message: 'There was an error!'});
                });
            }
        }).catch(function (error) {
            console.log('error in catch', error);
            reply.code(500).send({message: 'There was an error!'});
        });

    },

    getLeaderBoardMeta: async (request, reply) => {
        let roundNumber = request.query.roundNumber,
            userId = request.user.dataValues.id;
        if (!roundNumber) {
            return reply.code(404).send({message: 'Not enough info!'});
        }
        Round.findOne({
            attributes: ['id', ['description', 'title']],
            where: {
                // contestId: contestId,
                id: roundNumber
            }
        }).then(function (round) {
            if (!round) {
                reply.code(404).send({message: 'Round not found!'});
            } else {

                UserRoundResult.findOne({
                        attributes: [[Sequelize.fn('COUNT', 'roundId'), 'userCount']],
                        where: {roundId: round.id}
                    }
                ).then(function (results) {
                    let userCount = 0;
                    if (results) {
                        userCount = results.dataValues.userCount;
                    }
                    // get place model
                    let startTime = round.dataValues.startTime;
                    UserRoundResult.findOne({
                        where: {
                            userId: userId,
                            roundId: round.id
                        },
                        include: {
                            model: User
                        }
                    }).then(function (userResult) {

                        if (userResult == null) {
                            reply.code(200).send({title: round.dataValues.title, contestants: userCount});
                        } else {
                            let vals = userResult.dataValues;
                            let userVals = vals.user.dataValues;

                            let result = {
                                rank: 1,
                                username: userVals.userName, //todo
                                imageUrl: userVals.profilePictureUrl,
                                score: vals.score,
                                userId: userId,
                                time: (vals.end_time - startTime) / 1000 // in seconds
                            };
                            UserRoundResult.findOne({
                                attributes: [[Sequelize.fn('COUNT', 'roundId'), 'rank']],
                                where: {
                                    roundId: round.id,
                                    [Op.or]: {
                                        score: {[Op.gt]: result.score},
                                        [Op.and]: {
                                            score: {[Op.eq]: vals.score},
                                            end_time: {[Op.lt]: vals.end_time}
                                        }
                                    }
                                }
                            }).then(function (rankRes) {
                                result.rank = rankRes.dataValues.rank + 1;
                                // resolve (result);
                                reply.code(200).send({
                                    title: round.dataValues.title,
                                    contestants: userCount,
                                    myPlace: result
                                });

                            }).catch(function (err) {
                                console.log(err);
                                reply.code(500).send({message: 'There was an error!'});
                            });
                        }

                    }).catch(function (error) {
                        console.log('error in catch', error);
                        reply.code(500).send({message: 'There was an error!'});
                    });
                }).catch(function (error) {
                    console.log('error in catch', error);
                    reply.code(500).send({message: 'There was an error!'});
                });
            }
        }).catch(function (error) {
            console.log('error in catch', error);
            reply.code(500).send({message: 'There was an error!'});
        });

    },


    getLeaderBoard: async (request, reply) => {
        let roundNumber = request.query.roundNumber,
            from = request.query.from,
            count = request.query.count;

        Round.findOne({
            // attributes: ['id', ['description', 'title']],
            where: {
                id: roundNumber
            }
        }).then(function (round) {
            if (!round) {
                reply.code(404).send({message: 'round not found!'});
            } else {
                let options = {
                    where: {
                        roundId: round.id
                    },
                    include: {
                        model: User
                    },
                    order: [['score', 'DESC'], ['end_time', 'ASC']]
                };

                if (count) {
                    count = parseInt(count);
                    options.limit = count;
                }

                if (from) {
                    from = parseInt(from);
                    options.offset = from;
                }

                UserRoundResult.findAll(options).then(function (userResults) {
                    let results = [];
                    let startTime = round.startTime;
                    for (let i = 0; i < userResults.length; i++) {
                        results.push({
                            rank: from + i + 1, // ???
                            username: userResults[i].user.username,
                            imageUrl: userResults[i].user.profilePictureUrl,
                            score: userResults[i].score,
                            userId: userResults[i].userId,
                            time:   1200 + i*100// (userResults[i].end_time - startTime) / 1000 // in seconds
                        });
                    }

                    reply.send(results);

                }).catch(function (error) {
                    console.log('error in catch', error);
                    reply.code(500).send({message: 'There was an error!'});
                });
            }
        }).catch(function (error) {
            console.log('error in catch', error);
            reply.code(500).send({message: 'There was an error!'});
        });

    },

    getContest: async (request, reply) => {
        let id = parseInt(request.query.id);
        let userId = request.user.dataValues.id;
        // id: number;
        // title: string;
        // body: string;
        // imageUrl: string;
        // registrationEnd: number;
        // subjectIds: number[];
        // status: string; //   'UNPUBLISHED', 'REGISTRATION ON', 'REGISTRATION OVER', 'ONGOING', 'CANCELLED', 'COMPLETED'
        // rounds: ContestRound[];

        if (id === -1) {
            Contest.create({createUserId: userId}).then(function (contest) {
                let contestInfo = {
                    id: contest.id,
                    title: contest.title,
                    body: contest.description,
                    imageUrl: contest.contestPictureUrl,
                    registrationEnd: contest.registrationDeadline,
                    createUser: contest.createUserId,
                    status: contest.status,
                    // rounds: [],
                    subjectIds: [],
                    isRegistered: false
                };
                console.log('in thn');
                reply.send({success: true, contest: contestInfo});
            }).catch(function (error) {
                console.log('error in catch', error);
                reply.code(500).send({message: 'There was an error!'});
            });
        } else {
            Contest.findOne({
                where: {
                    id: id
                },
                include: [
                    {
                        model: Subject,
                        attributes: ['id']
                    },
                    // {
                    //     model: Round,
                    //     // attributes: ['roundNo', 'strictMode', 'isOpen', 'duration', ['passingPlace', 'placeToPass'], ['passingScore', 'pointsToPass'], 'status', 'startTime'],
                    //     order: ['roundNo'],
                    //     // include: {model: Question,
                    //     //     attributes: [['id', 'questionId'], [Sequelize.fn('COUNT', 'id'), 'questionCount']],
                    //     //     group: ['roundId']
                    //     // },
                    // },
                    {
                        model: User,
                        required: false,
                        through: ContestRegisteredUser,
                        where: {
                            id: userId
                        }
                    }
                ],

            }).then(function (contest) {
                    if (!contest) {
                        reply.code(404).send({message: 'Contest not found!'});
                    } else {
                        let contestInfo = {
                            id: contest.id,
                            title: contest.title,
                            body: contest.description,
                            imageUrl: contest.contestPictureUrl,
                            registrationEnd: contest.registrationDeadline,
                            createUser: contest.createUserId,
                            status: contest.status, //todo Statuses
                            rounds: contest.rounds,
                            isRegistered: true
                        };

                        if (!(contest.users.length > 0)) {
                            contestInfo.isRegistered = false;
                        }

                        if (contest.registrationDeadline) {
                            contestInfo.registrationEnd = contest.registrationDeadline.time;
                        }

                        let subjectIds = [];
                        for (let i = 0; i < contest.subjects.length; i++) {
                            subjectIds.push(contest.subjects[i].id);
                        }
                        contestInfo.subjectIds = subjectIds;
                        //
                        // let rounds = [];
                        // for (let i = 0; i < contest.rounds.length; i++) {
                        //
                        //     let round = {
                        //         id: contest.rounds[i].id,
                        //         roundNo: contest.rounds[i].roundNo,
                        //         strictMode: contest.rounds[i].strictMode,
                        //         isOpen: contest.rounds[i].isOpen,
                        //         duration: contest.rounds[i].duration,
                        //         placeToPass: contest.rounds[i].passingPlace,
                        //         pointsToPass: contest.rounds[i].passingScore,
                        //         status: contest.rounds[i].status,
                        //         startTime: contest.rounds[i].startTime,
                        //         questions: contest.rounds[i].questions,
                        //         password: contest.rounds[i].password,
                        //     };
                        //
                        //     if (contest.rounds[i].startTime) {
                        //         round.startTime = new Date(contest.rounds[i].startTime).getTime();
                        //     }
                        //
                        //     if (round.placeToPass === null) {
                        //         round.placeToPass = -1;
                        //     }
                        //
                        //     if (round.pointsToPass === null) {
                        //         round.pointsToPass = -1;
                        //     }
                        //
                        //     rounds.push(round);
                        // }
                        //
                        // contestInfo.rounds = rounds;
                        reply.code(200).send(contestInfo);
                    }
                }
            ).catch(function (error) {
                console.log('error in catch', error);
                reply.code(500).send({message: 'There was an error!'});
            });
        }
    },

    getContestRounds: (request, reply) => {
        let userId = request.user.dataValues.id;
        let contestId = request.query.contestId;

        Contest.findOne({
            where: {
                id: contestId
            },
            include: {
                model: Round
            }
        }).then(function (contest) {

            let rounds = [];
            for (let i = 0; i < contest.rounds.length; i++) {

                let round = {
                    id: contest.rounds[i].id,
                    roundNo: contest.rounds[i].roundNo,
                    strictMode: contest.rounds[i].strictMode,
                    isClosed: !contest.rounds[i].isOpen,
                    duration: contest.rounds[i].duration,
                    placeToPass: contest.rounds[i].passingPlace,
                    pointsToPass: contest.rounds[i].passingScore,
                    status: contest.rounds[i].status,
                    startTime: contest.rounds[i].startTime,
                    questions: contest.rounds[i].questions,
                    password: contest.rounds[i].password,
                };

                if (contest.rounds[i].startTime) {
                    round.startTime = new Date(contest.rounds[i].startTime).getTime();
                }

                rounds.push(round);
            }

            reply.send(rounds);
        }).catch(function (error) {
            console.log('error in catch', error);
            reply.code(500).send({message: 'There was an error!'});
        });
    },

    getQuestions: async (request, reply) => {
        // contest: contest.toString(),
        //     round: round.toString()

        // let contest = parseInt(request.query.contest);
        let round = parseInt(request.query.round);


        Round.findOne({
            where: {
                // contestId: contest,
                id: round
            }
        }).then(function (round) {
            if (!round) {
                //return err
                return reply.code(404).send('Round does not exist!');
            }
            Question.findAll({
                where: {
                    roundId: round.id,
                    status: {[Op.not]: config.STATUS_DELETED}
                },
                include: [
                    {model: QuestionAnswer},
                    {model: AnswerType}
                ]
            }).then(function (questions) {
                let questionsInfo = [];
                for (let i = 0; i < questions.length; i++) {
                    let answers = [];
                    let correctAnswerIds = [];
                    for (let j = 0; j < questions[i].questionAnswers.length; j++) {
                        let ans = questions[i].questionAnswers[j];
                        answers.push(ans.answer);
                        // answers.push({
                        //     answer: ans.answer,
                        //     isCorrect: ans.isCorrect
                        // });
                        if (ans.isCorrect) {
                            correctAnswerIds.push(j);
                        }
                    }
                    let question = {
                        question: questions[i].question,
                        score: questions[i].score,
                        type: questions[i].answerType.answerType,
                        options: answers,
                        correctAnswer: correctAnswerIds
                    };
                    questionsInfo.push(question);
                }
                reply.send(questionsInfo, questions);
            });
            // question: 'ragaca kitxva',
            //     options: ['pasuxi1', 'pasuxi2', 'pasuxi3'],
            //     score: null,
            //     type: 'MULTIPLE CHOICE',
            //     correctAnswer: [2],
            //

        }).catch(function (error) {
            console.log('error in catch', error);
            reply.code(500).send({message: 'There was an error!'});
        });

    },


    getPastContests: async (request, reply) => {
//         imageUrl: string;
// title: string;
// subjectIds: number[];
// contestId: number;
        let userId = request.query.userId;
        Contest.findAll({
            include: [
                {
                    model: User,
                    required: true,
                    through: ContestRegisteredUser,
                    where: {
                        id: userId
                    }
                },
                {
                    model: Subject
                }
            ]
        }).then(function (contests) {
            let contestsInfo = [];
            for (let i = 0; i < contests.length; i++) {
                let contestInfo = {
                    contestId: contests[i].id,
                    title: contests[i].title,
                    imageUrl: contests[i].contestPictureUrl
                };
                let subjectIds = [];
                for (let j = 0; j < contests[i].subjects.length; j++) {
                    subjectIds.push(contests[i].subjects[j].id);
                }
                contestInfo.subjectIds = subjectIds;
                contestsInfo.push(contestInfo);
            }
            reply.send(contestsInfo);
        }).catch(function (error) {
            console.log('error in catch', error);
            reply.code(500).send({message: 'There was an error!'});
        });

    },

    registerToContest: (request, reply) => {
        let userId = request.user.dataValues.id;
        let contestId = request.body.contestId;

        Contest.findOne({
            where: {
                id: contestId,
                // status: config.STATUS_REGISTRATION_ON,
                // registrationDeadline: {[Op.gt]: new Date()}
            }
        }).then(function (contest) {
            if (contest) {
                ContestRegisteredUser.findOrCreate({
                    where: {
                        userId: userId,
                        contestId: contestId
                    },
                    defaults: {
                        userId: userId,
                        contestId: contestId
                    }
                }).then(function (res) {
                    reply.send();

                }).catch(function (error) {
                    console.log('error in catch', error);
                    reply.code(500).send({message: 'There was an error!'});
                });
                // , {updateOnDuplicate: ['userId', 'contestId']}
            } else {
                reply.code(404).send('Registration is not possible!');
            }
        }).catch(function (error) {
            console.log('error in catch', error);
            reply.code(500).send({message: 'There was an error!'});
        });
    },

    addRound: (request, reply) => {
        // id: 1231,
        //     password: '',
        //     isClosed: false,
        //     duration: null,
        //     placeToPass: null,
        //     pointsToPass: null,
        //     status: 'ACTIVE', //   'ACTIVE', 'ONGOING', 'CANCELLED', 'COMPLETED'
        //     startTime: null
        let contestId = request.body.contestId;

        Round.create({
            contestId: contestId
        }).then(function (round) {
            let roundInfo = {
                id: round.id,
                // roundNo: round.roundNo,
                // strictMode: round.strictMode,
                isClosed: !round.isOpen,
                duration: round.duration,
                placeToPass: round.passingPlace,
                pointsToPass: round.passingScore,
                status: round.status,
                startTime: round.startTime,
                password: round.password,
            };

            if (round.startTime) {
                roundInfo.startTime = new Date(round.startTime).getTime();
            }
            reply.send(roundInfo);
        }).catch(function (error) {
            console.log('error in catch', error);
            reply.code(500).send({message: 'There was an error!'});
        });

    },


    saveRounds: (request, reply) => {
        // id: number;
        // isClosed: boolean;
        // duration: number;
        // placeToPass: number; // -1 means this is not passing criteria
        // pointsToPass: number; // -1 means this is not passing criteria
        // status: string; //   'ACTIVE', 'ONGOING', 'CANCELLED', 'COMPLETED'
        // startTime: number;
        // password: '';

        let rounds = request.body;

        let toCreate = [];
        let toUpdate = [];

        for (let i = 0; i < rounds.length; i++) {
            let roundModel = {
                isOpen: !rounds[i].isClosed,
            };

            if (rounds[i].placeToPass) {
                roundModel.passingPlace = rounds[i].placeToPass;
            }
            if (rounds[i].pointsToPass) {
                roundModel.passingScore = rounds[i].pointsToPass;
            }
            if (rounds[i].startTime) {
                roundModel.startTime = rounds[i].startTime;
            }

            if (rounds[i].duration) {
                roundModel.duration = rounds[i].duration;
            }

            if (rounds[i].strictMode) {
                roundModel.strictMode = rounds[i].strictMode;
            }

            if (rounds[i].password) {
                roundModel.password = rounds[i].password;
            }

            //if update
            if (rounds[i].id !== -1) {
                roundModel.id = rounds[i].id;
                roundModel.status = rounds[i].status;
                toUpdate.push(roundModel);
            } else {
                toCreate.push(roundModel);

            }
        }

        let promises = [Round.bulkCreate(toCreate)];
        for (let i = 0; i < toUpdate.length; i++) {
            let prom = Round.update(toUpdate[i], {where: {id: toUpdate[i].id}});
            promises.push(prom);
        }

        Promise.all(promises).then(() => {
            // access results here, p2 is undefined if the condition did not hold
            reply.code(200).send();
        }).catch(function (error) {
            console.log('error in catch', error);
            reply.code(500).send({message: 'There was an error!'});
        });

    },

    getUpcomingTournament: (request, reply) => {
        let userId = request.user.dataValues.id;
        Contest.findOne({
            order: [['rounds', 'startTime']],
            attributes: [],
            where: {
                status: [
                    config.STATUS_REGISTRATION_ON,
                    config.STATUS_REGISTRATION_OVER,
                    config.STATUS_ONGOING]
            },
            include: [
                {
                    attributes: ['startTime', 'contestId'],
                    model: Round,
                    required: true,
                    where: {
                        // startTime: {[Op.gt]: Sequelize.fn('NOW')}
                        startTime: {[Op.gt]: new Date()}

                    }
                },
                {
                    attributes: [],
                    model: User,
                    required: true,
                    through: ContestRegisteredUser,
                    where: {
                        id: userId
                    }
                },
            ]

        }).then(function (contest) {

            if (contest){
                reply.send({
                    contestId : contest.rounds[0].contestId,
                    timestamp : new Date(contest.rounds[0].startTime).getTime()
                });
            }else{
                reply.send({
                    contestId : -1,
                    timestamp : -1
                });
            }
        }).catch(function (error) {
            console.log('error in catch', error);
            reply.code(500).send({message: 'There was an error!'});
        });



    },

    updateQuestions: (request, reply) => {
        let questions = request.body.questions;
        let roundId = request.body.roundId;
        Question.update({status : config.STATUS_DELETED}, {where: {roundId : roundId}}).then(function () {
            reply.send();
        }).catch(function (error) {
            console.log('error in catch', error);
            reply.code(500).send({message: 'There was an error!'});
        });

    },

    // get_user_metadata
//     userId: number;
// profileImageUrl: string;
    getUserMetaData : (request, reply) =>{
        reply.send({userId: request.user.dataValues.id,
            profileImageUrl: request.user.dataValues.profilePictureUrl})

    },


    submitResult: (request, reply) =>{
        reply.send();
    }
};
