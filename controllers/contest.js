let Contest = require('./../models/contest');
let Round = require('./../models/round');
let Subject = require('./../models/subject');
let User = require('./../models/user');
let ContestRegisteredUser = require('./../models/contest_registered_user');
let UserRoundResult = require('./../models/user_round_result');

const Sequelize = require('sequelize');
const Op = Sequelize.Op;




async function getContests (params, reply) {
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
        where:{
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

    if (from){
        options.offset = from;
    }

    if (registrationIsOff === 'false') {
        options.where.status = ['N' , 'P']; // TODO statuses
    }else if (registrationIsOff === 'true'){
        options.where.status = {
            [Op.not]: ['N', 'P']
        };
    }

    if (createdByMe === 'true'){
        options.where.CreateUserId = userId;
    }

    if (subjects){
        options.include[0].required = true;
        options.include[0].where = { id: subjects.split(',')};
    }

    if (registeredContest){
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
    Contest.findAll(options).then(function(contests){
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
                contestId : contestIds
            }
        }).then(function(count){
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
            }).then(function(contestWithSubjects){

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
                        status : ['A', 'C']
                    },
                }).then(function(rounds) {

                    for (let i = 0; i < rounds.length; i++) {
                        let contestId = rounds[i].contestId;
                        if(!roundsDict[contestId]){
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
                        if(Object.keys(roundsDict[contestId]['A']).length !== 0){
                            rs = roundsDict[contestId]['A'];
                            let roundNos = Array.from( Object.keys(rs));
                            let roundNo = Math.min.apply(null,roundNos);
                            roundsDict[contestId] = roundsDict[contestId]['A'][roundNo];
                        }else if(roundsDict[contestId]['C']){
                            rs = roundsDict[contestId]['C'];
                            let roundNos = Array.from( Object.keys(rs));
                            let roundNo = Math.max.apply(null,roundNos);
                            roundsDict[contestId] = roundsDict[contestId]['C'][roundNo];
                        }
                    }

                    // add final data and return
                    for (let i = 0; i < contestsInfo.length; i++) {
                        if (countsDict[contestsInfo[i].id]){
                            contestsInfo[i].registeredCount = countsDict[contestsInfo[i].id];
                        } else{
                            contestsInfo[i].registeredCount = 0;
                        }
                        if (subjectsDict[contestsInfo[i].id]){
                            contestsInfo[i].subjects = subjectsDict[contestsInfo[i].id];
                        } else{
                            contestsInfo[i].subjects = [];
                        }
                        if (roundsDict[contestsInfo[i].id]){
                            contestsInfo[i].nextContestDuration = roundsDict[contestsInfo[i].id].duration;
                            contestsInfo[i].nextContestStart = new Date(roundsDict[contestsInfo[i].id].startTime).getTime();
                        } else{
                            contestsInfo[i].nextContestDuration = null;
                            contestsInfo[i].nextContestStart = null;
                        }
                    }

                    reply.send( contestsInfo);

                }).catch(function(){
                    reply.code(500).send({ message: 'There was an error!' });
                });

            }).catch(function(){
                reply.code(500).send({ message: 'There was an error!' });
            });

        }).catch(function(){
            reply.code(500).send({ message: 'There was an error!' });
        });

    }).catch(function(){
        reply.code(500).send({ message: 'There was an error!' });
    });
}

module.exports = {
    createContest: async (request, reply) => {
        let newContest = {
            title: request.body.title,
            description: request.body.description,
            // creator_id: request.body.creator_id
        };
        Contest.findOne({where: {title: newContest.title}}).then(function(contest) {
            if (!contest) {
                Contest.create(newContest).then(function (result) {
                    reply.send({success: true, contest: result});
                }).catch(function (error) {
                    console.log('error in catch', error);
                    reply.code(500).send({message: 'There was an error!'});
                });
            }else{
                reply.code(403).send({message: 'contest with same name already exists'});
            }
        }).catch(function(err){
            console.log('Oops! something went wrong, : ', err);
            reply.code(500).send({ message: 'There was an error!' });
        });
    },


    getTournamentList: async (request, reply) => {
        let params = {
            createdByMe : request.query.myContests,
            registrationIsOff : request.query.pastContests,
            subjects : request.query.subjectIds,
            limit : request.query.to - request.query.from,
            from : parseInt(request.query.from),
            searchString : request.query.searchString,
            userId : request.user.dataValues.id
        };
        await getContests(params, reply);
    },

    getRegisteredTournamentList: async (request, reply) => {
        let params = {
            registeredContest : true,
            userId : request.user.dataValues.id
        };
        await getContests(params, reply);
    },

    setContestPicture:  (request, reply)  => {
        let userId = request.user.dataValues.id ,
            id = request.body.id;
        if(!userId || !id) {
            return reply.code(404).send({ message: 'contest not found!' });
        }
        Contest.findOne({ where: {
                createUserId: userId ,
                id : id
            }}).then(function(contest) {
            if(!contest) {
                reply.code(404).send({ message: 'contest not found!' });
            } else {
                contest.contestPictureUrl = request.file_url;
                Contest.update({contestPictureUrl: request.file_url}, {where : {id: contest.id} }).then(function() {
                    reply.send({ success: true, file_url: request.file_url});
                }).catch(function() {
                    reply.code(500).send({ message: 'There was an error!' });
                });
            }
        }).catch(function(error) {
            console.log('error in catch', error);
            reply.code(500).send({ message: 'There was an error!' });
        });

    },

    getLeaderBoardMeta: (request, reply) => {
        let contestId = request.query.contestId,
            roundNumber = request.query.roundNumber;
        if (!contestId || !roundNumber){
           return reply.code(404).send({ message: 'Not enough info!' });
        }
        Round.findOne({
            group: ['description'],
            attributes: [['description', 'title']],
            where: {
                contestId : contestId,
                roundNo : roundNumber
            },
            include: [
                {
                    model: UserRoundResult,
                    attributes: [[Sequelize.fn('COUNT', 'roundId'), 'UserCount']],
                    required: false
                }
            ]}).then(function(round) {
            if(!round) {
                reply.code(404).send({ message: 'round not found!' });
            } else {
                //
                //   myPlace: LeaderBoardPlaceModel;
                //   title: string;
                //   contestants: number;
                reply.code(200).send({round: round});

            }
        }).catch(function(error) {
            console.log('error in catch', error);
            reply.code(500).send({ message: 'There was an error!' });
        });

    }
};
