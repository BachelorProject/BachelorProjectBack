let Contest = require('./../models/contest');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

module.exports = {
    secret: async (request, reply) => {
        console.log('SECTRET ------------I managed to get here!');
        reply.send('SECTRET');
    },

    createContest: async (request, reply) => {
        console.log('SECTRET ------------I managed to get here!');

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

        let options = {where:{
                [Op.or]: {
                    description: {[Op.like]: `%${searchString}%`},
                    title: {[Op.like]: `%${searchString}%`}
                }
            },
            limit: limit,
            offset: (page - 1) * limit,

        };

        // TODO for subjects filter
        // where: {
        //     $or: [
        //         {'$B.userId$' : 100},
        //         {'$C.userId$' : 100}
        //     ]
        // },
        // include: [{
        //     model: B,
        //     required: false
        //
        // }, {
        //     model: C,
        //     required: false
        // }]

        // ???
        if (registrationIsOn === 'true') {
            options.where.status = ['N' , 'P']; // TODO statuses
        }else{
            options.where.status = {
                [Op.not]: ['N', 'P']
            };
        }

        if (createdByMe === 'true'){
            options.where.CreateUserId = request.body.userId; // TODO set userId or user to all authed methods
        }

        Contest.findAll(options).then(function(contests){
            console.log(contests);
            reply.send({error:false, message: 'contests list', data:contests});
        }).catch(function(err){
            console.log('Oops! something went wrong, : ', err);
            reply.code(500);
            reply.send({ message: 'There was an error!' });
        });
    }
};
