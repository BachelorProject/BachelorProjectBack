let Contest = require('./../models/contest');
let Round = require('./../models/round');
let Subject = require('./../models/subject');
let User = require('./../models/user');
let ContestRegisteredUser = require('./../models/contest_registered_user');
let ContestSubject = require('./../models/contest_subject');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

module.exports = {
    createContest: async (request, reply) => {
        console.log('createContest ------------I managed to get here!');

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
                    reply.code(500);
                    reply.send({message: 'There was an error!'});
                });
            }else{
                reply.code(403);
                reply.send({message: 'contest with same name already exists'});
            }
        }).catch(function(err){
            console.log('Oops! something went wrong, : ', err);
            reply.code(500);
            reply.send({ message: 'There was an error!' });
        });
    },

    getContests: async (request, reply) => {
        console.log('getContests --------');
        let createdByMe = request.body.created_by_me;
        let registrationIsOn = request.body.registration_is_on;
        let subjects = request.body.subjects;
        let limit = request.body.limit;
        let page = request.body.page;
        let searchString = request.body.search_string;
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

                },
                {
                    model: Round,
                    required: false
                }
            ],
            // attributes: ['contests.*', 'contestRegisteredUsers.*', [Sequelize.fn('COUNT', 'contestRegisteredUsers.userId'), 'userCount']],
            limit: limit,
            offset: (page - 1) * limit,
        };

        if (registrationIsOn === 'true') {
            options.where.status = ['N' , 'P']; // TODO statuses
        }else{
            options.where.status = {
                [Op.not]: ['N', 'P']
            };
        }
        if (createdByMe === 'true'){
            options.where.CreateUserId = request.user.dataValues.id; // TODO set userId or user to all authed methods
        }

        if (subjects){
            options.include[0].required = true;
            options.include[0].where = { id: subjects.split()};
        }

        let contestsInfo = [];
        let subjectsDict = {};
        let countsDict = {};

        // find general contest info
        Contest.findAll(options).then(function(contests){
            console.log(contests);
            let contestIds = [];
            for (let i = 0; i < contests.length; i++) {
                contestsInfo.push({
                    id: contests[i].id,
                    title: contests[i].title,
                    body: contests[i].description,
                    imageUrl: 'https://www.pngitem.com/pimgs/m/21-211363_slendytubbies-3-skin-url-hd-png-download.png', //TODO pictures
                    registrationEnd: contests[i].registrationEnd, // TODO to long -- > .getTime(),
                    nextContestStart: null, //todo
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
            }).then(function(count){
                for (let i = 0; i < count.length; i++) {
                    let el = count[i].toJSON()
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
                                color_id: contestWithSubjects[i].subjects[j].colorId
                            });
                            subjectsDict[contestWithSubjects[i].id] = subjects;
                        }
                    }

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
                    }
                    reply.send({error:false, message: 'contests list', contestsInfo: contestsInfo});

                });

            });






        }).catch(function(err){
            console.log('Oops! something went wrong, : ', err);
            reply.code(500);
            reply.send({ message: 'There was an error!' });
        });
    }
};
