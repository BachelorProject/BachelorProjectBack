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

signTokenForPasswordChange = user => {
    return JWT.sign({
        iss: 'mari',
        sub: user.id,
        iat: new Date().getTime(), // current time
        exp: new Date().setDate(new Date().getTime() + 10 * 60000) // current time + 1 day ahead
    }, JWT_SECRET);
};

module.exports = {
    secret: async (request, reply) => {
        console.log('SECTRET ------------I managed to get here!');
        reply.send('SECTRET');
    },

    signUp:  (request, reply)  => {
        console.log('signup!!!!!!!!!!!!!!!!!');
        db.sync().then(function() {
            let newUser = {
                email: request.body.email,
                password: request.body.password
            };
            if(!newUser.email || !newUser.password) {
                reply.code(404);
                return reply.send({ message: 'Email and password are needed!' });
            }
            // check email/ google / fb
            User.findOne({where: {email: newUser.email}}).then(function(user) {
                if (!user) {
                    User.create(newUser).then(function(result) {
                        user = result.dataValues;
                        let token = signToken(user);
                        reply.send({ success: true, token: token, new_user: true});
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
                        reply.send({ success: true, token: token, new_user: false});
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

    changePassword:  (request, reply)  => {
        console.log('changePassword!!!!!!!!!!!!!!!!!');

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
                user.password = password;
                User.update({password: password}, {where : {id: user.id} }).then(function(user) {
                    let token = signToken(user);
                    reply.send({ success: true, token: token, new_user: false});
                });
            }
        }).catch(function(error) {
            console.log('error in catch', error);
            reply.code(500);
            reply.send({ message: 'There was an error!' });
        });

    },

    signInGoogle:  (request, reply) => {
        console.log('googleOAuth!!!!!!!!!!!!!!!!!');
        let data = request.body;
        let newUser = {
            first_name: data.first_name,
            last_name: data.last_name,
            google_id:data.google_id,
            google_email: data.google_email
            // photo_url: r.photoUrl ???
        };
        if(!newUser.google_id) {
            reply.code(404);
            return reply.send({ message: 'id needed' });
        }
        User.findOne({ where: { google_id: newUser.google_id } }).then(function(user) {
            if(!user) {
                User.create(newUser).then(function(result) {
                    user = result.dataValues;
                    let token = signToken(user);
                    reply.send({ success: true, token: token, new_user: true });
                });
            }else{
                let token = signToken(user);
                reply.send({ success: true, token: token, new_user: false });
            }

        }).catch(function(error) {
            console.log('error in catch', error);
            reply.code(500);
            reply.send({ message: 'There was an error!' });
        });
    },

    signInFacebook:(request, reply) => {
        console.log('facebookOAuth!!!!!!!!!!!!!!!!!');
        let data = request.body;
        console.log(data);

        let newUser = {
            first_name: data.first_name,
            last_name: data.last_name,
            facebook_id:data.facebook_id,
            facebook_name:data.facebook_name,
            facebook_email: data.facebook_email
        };
        if(!newUser.facebook_id ) {
            reply.code(404);
            return reply.send({ message: 'id needed, name needed' });
        }
        User.findOne({ where: { facebook_id: newUser.facebook_id } }).then(function(user) {
            if(!user) {
                User.create(newUser).then(function(result) {
                    user = result.dataValues;
                    let token = signToken(user);
                    reply.send({ success: true, token: token, new_user: true });
                });
            }else{
                let token = signToken(user);
                reply.send({ success: true, token: token, new_user: false });
            }
        }).catch(function(error) {
            console.log('error in catch', error);
            reply.code(500);
            reply.send({ message: 'There was an error!' });
        });
    }
};
