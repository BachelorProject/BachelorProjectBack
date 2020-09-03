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


async function getContests(params, reply) {
    let userId = params.userId;
    let createdByMe = params.createdByMe;
    let registrationIsOff = params.registrationIsOff;
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

    if (registrationIsOff === 'false') {
        options.where.status = ['N', 'P']; // TODO statuses
    } else if (registrationIsOff === 'true') {
        options.where.status = {
            [Op.not]: ['N', 'P']
        };
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
                registrationEnd: new Date(contests[i].registrationEnd).getTime(),
                nextContestStart: null,
                nextContestDuration: null, //todo
                subjects: [],
                registeredCount: null
            });
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
                        status: ['A', 'C']
                    },
                }).then(function (rounds) {

                    for (let i = 0; i < rounds.length; i++) {
                        let contestId = rounds[i].contestId;
                        if (!roundsDict[contestId]) {
                            roundsDict[contestId] = {'A': {}, 'C': {}};
                        }
                        roundsDict[contestId][rounds[i].status][rounds[i].roundNo] = {
                            duration: rounds[i].duration,
                            startTime: rounds[i].startTime,
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
                            contestsInfo[i].nextContestDuration = null;
                            contestsInfo[i].nextContestStart = null;
                        }
                    }

                    reply.send(contestsInfo);

                }).catch(function () {
                    reply.code(500).send({message: 'There was an error!'});
                });

            }).catch(function () {
                reply.code(500).send({message: 'There was an error!'});
            });

        }).catch(function () {
            reply.code(500).send({message: 'There was an error!'});
        });

    }).catch(function () {
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
        Contest.update(contestModel, {where: {id: contestInfo.id}}).then(function (contest) {
            //
            ContestSubject.destroy({where: {contestId: contestInfo.id}}).then(function () {

                //
                // var p1 = functionA();
                // var p2 = condition ? functionB() : Promise.resolve(); // or empty promise
                // Promise.all([p1, p2]).then(results => {
                //     // access results here, p2 is undefined if the condition did not hold
                // });

                let records = [];
                for (let i = 0; i < contestInfo.subjectIds.length; i++) {
                    records.push({contestId: contestInfo.id, subjectId: contestInfo.subjectIds[i]});
                }

                let roundModels = [];
                for (let i = 0; i < contestInfo.rounds.length; i++) {
                    let roundModel = {
                        isOpen: contestInfo.rounds[i].isOpen,
                        strictMode: contestInfo.rounds[i].strictMode,
                        duration: contestInfo.rounds[i].duration,
                        passingPlace: contestInfo.rounds[i].placeToPass,
                        passingScore: contestInfo.rounds[i].pointsToPass,
                        startTime: contestInfo.rounds[i].startTime
                    };

                    //if update
                    if (contestInfo.rounds[i].id !== -1) {
                        roundModel.id = contestInfo.rounds[i].id;
                        roundModel.status = contestInfo.rounds[i].status
                    }
                    roundModels.push(roundModel);
                }

                let subjectsPromise = contestInfo.subjectIds.length > 0 ? ContestSubject.bulkCreate(records) : Promise.resolve();
                let roundsPromise = contestInfo.rounds.length > 0 ? Round.bulkCreate(roundModels, {updateOnDuplicate: ['id']}) : Promise.resolve();

                Promise.all([subjectsPromise, roundsPromise]).then(results => {
                    // access results here, p2 is undefined if the condition did not hold
                    reply.code(200).send();
                }).catch(function (error) {
                    console.log('error in catch', error);
                    reply.code(500).send({message: 'There was an error!'});
                });

                // if (contestInfo.subjectIds.length > 0) {
                //
                //     //
                //     // ContestSubject.bulkCreate(records).then(function (contestSubjects) {
                //     //     reply.send({success: true, contest: contest, contestSubjects: contestSubjects});
                //     // }).catch(function (error) {
                //     //     console.log('error in catch', error);
                //     //     reply.code(500).send({message: 'There was an error!'});
                //     // });
                // }
                //
                // // reply.send({success: true, contest: contest});
                //
                //
                // if (contestInfo.rounds.length > 0) {
                //
                //     // //contestInfo.rounds
                //     // Round.bulkCreate(roundModels, {updateOnDuplicate: ['id']}).then(function (newRounds) {
                //     //     reply.send({yeyy: newRounds})
                //     // }).catch(function (error) {
                //     //     console.log('error in catch', error);
                //     //     reply.code(500).send({message: 'There was an error!'});
                //     // });
                //
                // }

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

            // roundNo: contest.rounds[i].roundNo,
            //     strictMode: contest.rounds[i].strictMode,
            //     isOpen: contest.rounds[i].isOpen,
            //     duration: contest.rounds[i].duration,
            //     placeToPass: contest.rounds[i].passingPlace,
            //     pointsToPass: contest.rounds[i].passingScore,
            //     status: contest.rounds[i].status,
            //     startTime: contest.rounds[i].startTime,
            //     questions: contest.rounds[i].questions

        }).catch(function (error) {
            console.log('error in catch', error);
            reply.code(500).send({message: 'There was an error!'});
        });


        //
        //
        // Contest.findOne({where: {title: newContest.title}}).then(function (contest) {
        //     if (!contest) {
        //         Contest.create(newContest).then(function (result) {
        //             reply.send({success: true, contest: result});
        //         }).catch(function (error) {
        //             console.log('error in catch', error);
        //             reply.code(500).send({message: 'There was an error!'});
        //         });
        //     } else {
        //         reply.code(403).send({message: 'contest with same name already exists'});
        //     }
        // }).catch(function (err) {
        //     console.log('Oops! something went wrong, : ', err);
        //     reply.code(500).send({message: 'There was an error!'});
        // });
    },


    getTournamentList: async (request, reply) => {
        let params = {
            createdByMe: request.query.myContests,
            registrationIsOff: request.query.pastContests,
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
                            username: userResults[i].user.userName,
                            imageUrl: userResults[i].user.profilePictureUrl,
                            score: userResults[i].score,
                            userId: userResults[i].userId,
                            time: (userResults[i].end_time - startTime) / 1000 // in seconds
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
            Contest.create({createUser: userId}).then(function (contest) {
                let contestInfo = {
                    id: contest.id,
                    title: contest.title,
                    body: contest.description,
                    imageUrl: contest.contestPictureUrl,
                    registrationEnd: contest.registrationDeadline,
                    createUser: contest.createUserId,
                    status: contest.status,
                    rounds: [],
                    subjectIds: []
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
                    {
                        model: Round,
                        // attributes: ['roundNo', 'strictMode', 'isOpen', 'duration', ['passingPlace', 'placeToPass'], ['passingScore', 'pointsToPass'], 'status', 'startTime'],
                        order: ['roundNo'],
                        // include: {model: Question,
                        //     attributes: [['id', 'questionId'], [Sequelize.fn('COUNT', 'id'), 'questionCount']],
                        //     group: ['roundId']
                        // },
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
                        };

                        if (contest.registrationDeadline) {
                            contestInfo.registrationEnd = contest.registrationDeadline.time;
                        }

                        let subjectIds = [];
                        for (let i = 0; i < contest.subjects.length; i++) {
                            subjectIds.push(contest.subjects[i].id);
                        }
                        contestInfo.subjectIds = subjectIds;

                        let rounds = [];
                        for (let i = 0; i < contest.rounds.length; i++) {

                            let round = {
                                id: contest.rounds[i].id,
                                roundNo: contest.rounds[i].roundNo,
                                strictMode: contest.rounds[i].strictMode,
                                isOpen: contest.rounds[i].isOpen,
                                duration: contest.rounds[i].duration,
                                placeToPass: contest.rounds[i].passingPlace,
                                pointsToPass: contest.rounds[i].passingScore,
                                status: contest.rounds[i].status,
                                startTime: contest.rounds[i].startTime,
                                questions: contest.rounds[i].questions
                            };

                            if (contest.rounds[i].startTime) {
                                round.startTime = new Date(contest.rounds[i].startTime).getTime();
                            }

                            if (round.placeToPass === null) {
                                round.placeToPass = -1;
                            }

                            if (round.pointsToPass === null) {
                                round.pointsToPass = -1;
                            }

                            rounds.push(round);
                        }

                        contestInfo.rounds = rounds;
                        reply.code(200).send(contestInfo);
                    }
                }
            ).catch(function (error) {
                console.log('error in catch', error);
                reply.code(500).send({message: 'There was an error!'});
            });
        }
    },


    getQuestions: async (request, reply) => {
        // contest: contest.toString(),
        //     round: round.toString()

        let contest = parseInt(request.query.contest);
        let round = parseInt(request.query.round);


        Round.findOne({
            where: {
                contestId: contest,
                roundNo: round
            }
        }).then(function (round) {
            if (!round) {
                //return err
                return reply.code(500).send('Round does not exist!');
            }
            Question.findAll({
                where: {
                    roundId: round.id
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
            for(let i = 0; i < contests.length; i++ ){
                let contestInfo = {
                    contestId: contests[i].id,
                    title: contests[i].title,
                    imageUrl: contests[i].contestPictureUrl
                };
                let subjectIds = [];
                for (let j = 0; j < contests[i].subjects.length; j++){
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

    }

};
