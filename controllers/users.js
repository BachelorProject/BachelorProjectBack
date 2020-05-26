let db = require('./../db_connection'),
    User = require('./../models/user');

const JWT = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/config');

signToken = user => {
    return JWT.sign({
        iss: 'mari',
        sub: user.id,
        iat: new Date().getTime(), // current time
        exp: new Date().setDate(new Date().getDate() + 1) // current time + 1 day ahead
    }, JWT_SECRET);
};

module.exports = {
    secret: async (request, reply, next ) => {
        console.log('SECTRET ------------I managed to get here!');
        reply.send('SECTRET');
    },

    signUp:  (request, reply)  => {
        console.log('signup!!!!!!!!!!!!!!!!!');
        db.sync().then(function() {
            console.log('in sync');
            let newUser = {
                email: request.body.email,
                password: request.body.password
            };
            // check email/ google / fb
            User.findOne({where: {email: newUser.email}}).then(function(user) {
                console.log(user);
                if (!user) {
                    User.create(newUser).then(function(result) {
                        user = result.dataValues;
                        let token = signToken(user);
                        reply.send({message: 'Account created!', email: user.email, password: user.password, token: token});
                    });
                } else {
                    reply.code(403);
                    reply.send({message: 'User already exists'});
                }
            });

        }).catch(function(error) {
            console.log('in sync err');
            console.log(error);
            reply.code(500);
            reply.send({ message: 'ERROR' });
        });
    },

    signIn:  (request, reply)  => {
        console.log('signIn!!!!!!!!!!!!!!!!!');

        if(!request.body.email || !request.body.password) {
            reply.code(404);
            return reply.send({ message: 'Email and password are needed!' });
        }

        let password = request.body.password;

        User.findOne({ where: { email: request.body.email } }).then(function(user) {
            if(!user) {
                reply.code(404);
                reply.send({ message: 'Authentication failed!' });
            } else {
                user.comparePasswords(password, function(error, isMatch) {
                    if(isMatch && !error) {
                        let token = signToken(user);
                        reply.send({ success: true, token: token});
                    } else {
                        reply.code(404);
                        reply.send({ message: 'Authentication failed!' });
                    }
                });
            }
        }).catch(function(error) {
            console.log('error in catch', error);
            reply.code(500);
            reply.send({ message: 'There was an error!' });
        });

    },

    signInGoogle:  (data, reply) => {
        console.log('googleOAuth!!!!!!!!!!!!!!!!!');

        const id = data.id;
        if(!id) {
            reply.code(404);
            return reply.send({ message: 'id needed' });
        }

        User.findOne({ where: { google_id: request.body.id } }).then(function(user) {
            if(!user) {
                reply.code(404);
                reply.send({ message: 'Authentication failed!' });
            } else {
                let token = signToken(user);
                reply.send({ success: true, token: token});
            }
        }).catch(function(error) {
            console.log('error in catch', error);
            reply.code(500);
            reply.send({ message: 'There was an error!' });
        });
    },
    signUpGoogle:  (data, reply)  => {
        console.log('signUpFacebook!!!!!!!!!!!!!!!!!');

        const id = data.id;
        const email = data.email;
        if(!id ) {
            reply.code(404);
            return reply.send({ message: 'id needed, name needed' });
        }

        let newUser = {
            google_id: id,
            google_email:  email
        };

        User.findOne({ where: { google_id: id } }).then(function(user) {
            if(!user) {
                User.create(newUser).then(function(result) {
                    user = result.dataValues;
                    let token = signToken(user);
                    reply.send({message: 'Account created!', email: user.email, password: user.password, token: token});
                });
            } else {
                reply.code(403);
                reply.send({message: 'User already exists'});
            }
        }).catch(function(error) {
            console.log('error in catch', error);
            reply.code(500);
            reply.send({ message: 'There was an error!' });
        });
    },

    signInFacebook:(data, reply) => {
        console.log('facebookOAuth!!!!!!!!!!!!!!!!!');
        console.log(data);
        const id = data.id;
        if(!id) {
            reply.code(404);
            return reply.send({ message: 'id needed' });
        }

        User.findOne({ where: { facebook_id: id } }).then(function(user) {
            if(!user) {
                reply.code(404);
                reply.send({ message: 'Authentication failed!' });
            } else {
                let token = signToken(user);
                reply.send({ success: true, token: token});
            }
        }).catch(function(error) {
            console.log('error in catch', error);
            reply.code(500);
            reply.send({ message: 'There was an error!' });
        });
    },

    signUpFacebook:  (data, reply)  => {
        console.log('signUpFacebook!!!!!!!!!!!!!!!!!');
        const id = data.id;
        const name = data.name;
        if(!id ) {
            reply.code(404);
            return reply.send({ message: 'id needed, name needed' });
        }

        let newUser = {
            facebook_id: id,
            facebook_name:  name
        };

        User.findOne({ where: { facebook_id: id } }).then(function(user) {
            if(!user) {
                User.create(newUser).then(function(result) {
                    user = result.dataValues;
                    let token = signToken(user);
                    reply.send({message: 'Account created!', email: user.email, password: user.password, token: token});
                });
            } else {
                reply.code(403);
                reply.send({message: 'User already exists'});
            }
        }).catch(function(error) {
            console.log('error in catch', error);
            reply.code(500);
            reply.send({ message: 'There was an error!' });
        });
    },

};
