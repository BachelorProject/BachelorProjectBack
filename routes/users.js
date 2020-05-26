const Fastify = require('fastify');
const User = require('./../models/user');
const usersController = require('../controllers/users');
const sget = require('simple-get');
const oauthPlugin = require('fastify-oauth2');
const config = require('./../config/config');
const {schemas } = require('../helpers/routeHelpers');

function verifyJWTAndUser (request, reply, done) {
    const jwt = this.jwt

    if (request.body && request.body.failureWithReply) {
        reply.code(401).send({ error: 'Unauthorized' })
        return done(new Error())
    }

    if (!request.raw.headers.authorization) {
        return done(new Error('Missing token header'))
    }

    jwt.verify(request.raw.headers.authorization, onVerify)

    function onVerify (err, decoded) {
        console.log(err);
        console.log(decoded);
        if (err || !decoded.exp || !decoded.sub) {
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
             console.log(error)
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

module.exports = function (fastify, opts, next) {

    fastify.register(oauthPlugin, {
        name: 'facebookOAuth2',
        credentials: {
            client: {
                id: config.FB_ID,
                secret: config.FB_SERET
            },
            auth: oauthPlugin.FACEBOOK_CONFIGURATION
        },
        // register a fastify url to start the redirect flow
        startRedirectPath: '/login/facebook',
        // facebook redirect here after the user login
        callbackUri: 'http://localhost:80/login/facebook/callback' //port ??? 3000
    });


    fastify.register(oauthPlugin, {
        name: 'facebookOAuth2Signup',
        credentials: {
            client: {
                id: config.FB_ID,
                secret: config.FB_SERET
            },
            auth: oauthPlugin.FACEBOOK_CONFIGURATION
        },
        // register a fastify url to start the redirect flow
        startRedirectPath: '/signup/facebook',
        // facebook redirect here after the user login
        callbackUri: 'http://localhost:80/signup/facebook/callback' //port ??? 3000
    });

    fastify.register(oauthPlugin, {
        name: 'googleOAuth2',
        scope: ['profile'],
        credentials: {
            client: {
                id: config.GOOGLE_ID,
                secret: config.GOOGLE_SECRET
            },
            auth: oauthPlugin.GOOGLE_CONFIGURATION
        },
        startRedirectPath: '/login/google',
        callbackUri: 'http://localhost:80/login/google/callback'
    });

    fastify.register(oauthPlugin, {
        name: 'googleOAuth2Signup',
        scope: ['profile'],
        credentials: {
            client: {
                id: config.GOOGLE_ID,
                secret: config.GOOGLE_SECRET
            },
            auth: oauthPlugin.GOOGLE_CONFIGURATION
        },
        startRedirectPath: '/signup/google',
        callbackUri: 'http://localhost:80/signup/google/callback'
    });

    fastify.decorate('verifyJWTAndUser', verifyJWTAndUser);
    fastify.decorate('verifyUserAndPassword', verifyUserAndPassword);

    fastify.get('/*', async (request, reply) => {
        return { hello: 'dima' }
    });

    fastify.route({
        method: 'POST',
        schema: schemas.authSchema,
        url: '/signup',
        handler: usersController.signUp
    });

    fastify.route({
        method: 'POST',
        schema: schemas.authSchema,
        url: '/signin',
        preHandler: fastify.auth([fastify.verifyUserAndPassword]),
        handler: usersController.signIn
    });


    fastify.route({
        method: 'GET',
        url: '/no-auth',
        handler: (req, reply) => {
            req.log.info('Auth free route')
            reply.send({ hello: 'world' })
        }
    });

    fastify.route({
        method: 'GET',
        url: '/auth',
        preHandler: fastify.auth([fastify.verifyJWTAndUser]),
        handler: (req, reply) => {
            req.log.info('Auth route')
            reply.send({ hello: req.user })
        }
    });

    fastify.route({
        method: 'POST',
        url: '/auth-multiple',
        preHandler: fastify.auth([
            // Only one of these has to pass
            fastify.verifyJWTAndUser,
            fastify.verifyUserAndPassword
        ]),
        handler: (req, reply) => {
            req.log.info('Auth route')
            reply.send({ hello: 'world' })
        }
    });

    fastify.get('/login/facebook/callback', function (request, reply) {
        this.facebookOAuth2.getAccessTokenFromAuthorizationCodeFlow(request, (err, result) => {
            if (err) {
                reply.send(err)
                return
            }

            sget.concat({
                url: 'https://graph.facebook.com/v6.0/me',
                method: 'GET',
                headers: {
                    Authorization: 'Bearer ' + result.access_token
                },
                json: true
            }, function (err, res, data) {
                if (err) {
                    reply.send(err)
                    return
                }
                usersController.signInFacebook(data,reply);
            })
        })
    });

    fastify.get('/signup/facebook/callback', function (request, reply) {
        this.facebookOAuth2Signup.getAccessTokenFromAuthorizationCodeFlow(request, (err, result) => {
            if (err) {
                reply.send(err)
                return
            }

            sget.concat({
                url: 'https://graph.facebook.com/v6.0/me',
                method: 'GET',
                headers: {
                    Authorization: 'Bearer ' + result.access_token
                },
                json: true
            }, function (err, res, data) {
                if (err) {
                    reply.send(err)
                    return
                }
                usersController.signUpFacebook(data,reply);
            })
        })
    });

    fastify.get('/login/google/callback', function (request, reply) {
        this.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request, (err, result) => {
            console.log('here');
            if (err) {
                reply.send(err)
                return
            }

            sget.concat({
                url: 'https://www.googleapis.com/plus/v1/people/me',
                method: 'GET',
                headers: {
                    Authorization: 'Bearer ' + result.access_token
                },
                json: true
            }, function (err, res, data) {
                console.log('here',err, res, data);

                if (err) {
                    reply.send(err)
                    return
                }
                usersController.signInGoogle(data,reply);
            })
        })
    });

    fastify.get('/signup/google/callback', function (request, reply) {
        this.googleOAuth2Signup.getAccessTokenFromAuthorizationCodeFlow(request, (err, result) => {
            console.log('here');
            if (err) {
                reply.send(err)
                return
            }

            sget.concat({
                url: 'https://www.googleapis.com/plus/v1/people/me',
                method: 'GET',
                headers: {
                    Authorization: 'Bearer ' + result.access_token
                },
                json: true
            }, function (err, res, data) {
                console.log('here',err, res, data);
                if (err) {
                    reply.send(err)
                    return
                }
                usersController.signUpGoogle(data,reply);
            })
        })
    });

    next();

};

