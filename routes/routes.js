const User = require('./../models/user');
const usersController = require('../controllers/users');
const contestController =  require('../controllers/contest');
const subjectController =  require('../controllers/subject');

const {schemas } = require('../helpers/routeHelpers');

function verifyJWTAndUser (request, reply, done) {
    const jwt = this.jwt;

    if (request.body && request.body.failureWithReply) {
        reply.code(401).send({ error: 'Unauthorized' });
        return done(new Error())
    }

    if (!request.raw.headers.authorization) {
        return done(new Error('Missing token header'))
    }

    jwt.verify(request.raw.headers.authorization, onVerify);

    function onVerify (err, decoded) {
        if (err){
            return  done(err);
        }
        if (!decoded || !decoded.exp || !decoded.sub) {
            return done(new Error('Token not valid'))
        }
        if (decoded.exp  < new Date().getTime()){
            return done(new Error('Token expired'))
        }

         User.findOne({where: {id: decoded.sub}}).then(function(user) {
            // If user doesn't exists, handle it
            if (!user) {
                return done(new Error('Token not valid. '))
            }
            // Otherwise, return the user
            request.user = user;
            done(null, user);

        }).catch(function(error) {
             console.log('in sync err');
             console.log(error);
             reply.send({ message: 'SQl ERROR' });
         });
    }
}

function verifyUserAndPassword (request, reply, done) {
    console.log('user/pass verifiation');
    if (!request.body || !request.body.email) {
        return done(new Error('Missing user in request body'))
    }
    done()
}

const multer = require('fastify-multer'); // or import multer from 'fastify-multer'
const fileController = require('./../controllers/file');

module.exports = function (fastify, opts, next) {
    fastify.decorate('verifyJWTAndUser', verifyJWTAndUser);
    fastify.decorate('verifyUserAndPassword', verifyUserAndPassword);
    fastify.register(multer.contentParser);

    fastify.get('/*', async () => {
        return { hello: 'dima' }
    });

    fastify.route({
        method: 'POST',
        // schema: schemas.authSchema,
        url: '/api/signup',
        handler: usersController.signUp
    });

    fastify.route({
        method: 'GET',
        url: '/api/confirm_email',
        preHandler: fastify.auth([fastify.verifyJWTAndUser]),
        handler: usersController.confirmEmail
    });

    fastify.route({
        method: 'POST',
        schema: schemas.authSchema,
        url: '/api/signin',
        preHandler: fastify.auth([fastify.verifyUserAndPassword]),
        handler: usersController.signIn
    });

    fastify.route({
        method: 'POST',
        url: '/api/signin/facebook',
        handler: usersController.signInFacebook
    });

    fastify.route({
        method: 'POST',
        url: '/api/change_password',
        preHandler: fastify.auth([fastify.verifyJWTAndUser]),
        handler: usersController.changePassword
    });

    fastify.route({
        method: 'POST',
        url: '/api/recover_password_by_email',
        handler: usersController.recoverPasswordByEmail
    });

    fastify.route({
        method: 'POST',
        url: '/api/signin/google',
        handler: usersController.signInGoogle
    });

    fastify.route({
        method: 'POST',
        url: '/api/update_contest',
        preHandler: fastify.auth([fastify.verifyJWTAndUser]),
        handler: contestController.updateContest
    });

    fastify.route({
        method: 'GET',
        url: '/api/tournament/board_list',
        preHandler: fastify.auth([fastify.verifyJWTAndUser]),
        handler: contestController.getTournamentList
    });

    fastify.route({
        method: 'GET',
        url: '/api/contest',
        preHandler: fastify.auth([fastify.verifyJWTAndUser]),
        handler: contestController.getContest
    });

    fastify.route({
        method: 'GET',
        url: '/api/contest_rounds',
        preHandler: fastify.auth([fastify.verifyJWTAndUser]),
        handler: contestController.getContestRounds
    });
    fastify.route({
        method: 'GET',
        url: '/api/upcoming_tournament',
        preHandler: fastify.auth([fastify.verifyJWTAndUser]),
        handler: contestController.getUpcomingTournament
    });


    fastify.route({
        method: 'POST',
        url: '/api/add_round',
        preHandler: fastify.auth([fastify.verifyJWTAndUser]),
        handler: contestController.addRound
    });

    fastify.route({
        method: 'POST',
        url: '/api/save_rounds',
        preHandler: fastify.auth([fastify.verifyJWTAndUser]),
        handler: contestController.saveRounds
    });


    fastify.route({
        method: 'GET',
        url: '/api/tournament/registered_list',
        preHandler: fastify.auth([fastify.verifyJWTAndUser]),
        handler: contestController.getRegisteredTournamentList
    });

    fastify.route({
        method: 'GET',
        url: '/api/user_info',
        preHandler: fastify.auth([fastify.verifyJWTAndUser]),
        handler: usersController.getUserInfo
    });

    fastify.route({
        method: 'GET',
        url: '/api/questions',
        preHandler: fastify.auth([fastify.verifyJWTAndUser]),
        handler: contestController.getQuestions
    });

    fastify.route({
        method: 'GET',
        url: '/api/past_contests',
        preHandler: fastify.auth([fastify.verifyJWTAndUser]),
        handler: contestController.getPastContests
    });

    fastify.route({
        method: 'GET',
        url: '/api/subjects',
        preHandler: fastify.auth([fastify.verifyJWTAndUser]),
        handler: subjectController.getSubjects
    });

    fastify.route({
        method: 'POST',
        url: '/api/set_profile_picture',
        preHandler: [fastify.auth([fastify.verifyJWTAndUser]) , fileController.upload.single('avatar')],
        handler:  usersController.setProfilePicture
    });

    fastify.route({
        method: 'POST',
        url: '/api/set_contest_picture',
        preHandler: [fastify.auth([fastify.verifyJWTAndUser]) , fileController.upload.single('avatar')],
        handler:  contestController.setContestPicture
    });

    fastify.route({
        method: 'POST',
        url: '/api/register_contest',
        preHandler: fastify.auth([fastify.verifyJWTAndUser]),
        handler: contestController.registerToContest
    });

    fastify.route({
        method: 'GET',
        url: '/api/leader_board_meta',
        preHandler: fastify.auth([fastify.verifyJWTAndUser]),
        handler:  contestController.getLeaderBoardMeta
    });

    fastify.route({
        method: 'GET',
        url: '/api/leaderboard',
        preHandler: fastify.auth([fastify.verifyJWTAndUser]),
        handler:  contestController.getLeaderBoard
    });
    // fastify.route({
    //     method: 'GET',
    //     url: '/api/update_questions',
    //     preHandler: fastify.auth([fastify.verifyJWTAndUser]),
    //     handler:  contestController.updateQuestions
    // });

    fastify.route({
        method: 'GET',
        url: '/api/get_user_metadata',
        preHandler: fastify.auth([fastify.verifyJWTAndUser]),
        handler:  contestController.getUserMetaData
    });

    fastify.route({
        method: 'POST',
        url: '/api/submit_result',
        preHandler: fastify.auth([fastify.verifyJWTAndUser]),
        handler:  contestController.submitResult
    });


    next();

};

