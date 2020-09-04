let db = require('./../db_connection'),
    User = require('./../models/user');
    UserRating = require('./../models/user_rating');
const JWT = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/config');
const mail = require('./../modules/mailsender/sender');

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
        exp: new Date().setTime(new Date().getTime() + 10 * 60000) // current time + 10min day ahead
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
                password: request.body.password,
                status: 'N'
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
                        // reply.send({ success: true, token: token, new_user: true});

                        // let token = signTokenForPasswordChange(user);
                        mail.send(user.email, "E-mail Confirmation",
                            "follow link to confirm e-mail: \n" +
                            'http://localhost:4200/auth?' +
                            'confirmationToken=' + token,
                            () => {
                                reply.send({success: true});
                            },
                            () => {
                                reply.code(404).send({message: 'Error! try again later'});
                            })
                    });
                } else {
                    reply.code(403); //// ????
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

        User.findOne({ where: { email: request.body.email , status: 'A'} }).then(function(user) {
            if(!user) {
                reply.code(404);
                reply.send({ message: 'Authentication failed!' });
            } else {
                user.comparePasswords(password, function(error, isMatch) {
                    if(isMatch && !error) {
                        let token = signToken(user);

                        let CurrentUserInformation = {
                            userId: user.id,
                            profileImageUrl: user.profilePictureUrl
                        };
                        reply.send({ success: true, token: token, new_user: false, CurrentUserInformation: CurrentUserInformation });

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

    confirmEmail:  (request, reply)  => {
        console.log('confirmEmail!!!!!!!!!!!!!!!!!');

        User.findOne({ where: { id: request.user.dataValues.id  } }).then(function(user) {
            if(!user) {
                reply.code(404).send({ message: 'Authentication failed!' });
            } else {
                user.status = 'A';
                User.update({status : 'A'}, {where : {id: user.id} }).then(function() {
                    let token = signToken(user);
                    let CurrentUserInformation = {
                        userId: user.id,
                        profileImageUrl: user.profilePictureUrl
                    };
                    reply.send({ success: true, token: token, new_user: true, CurrentUserInformation: CurrentUserInformation });
                })
            }
        }).catch(function(error) {
            console.log('error in catch', error);
            reply.code(500).send({ message: 'There was an error!' });
        });
    },

    changePassword:  (request, reply)  => {
        console.log('changePassword!!!!!!!!!!!!!!!!!');

        if( !request.body.password) {
            reply.code(404);
            return reply.send({ message: 'New password is needed!' });
        }

        let password = request.body.password;

        let userId = request.user.dataValues.id;

        User.findOne({ where: { id: userId} }).then(function(user) {
            if(!user) {
                reply.code(404);
                reply.send({ message: 'Authentication failed!' });
            } else {
                user.password = password;
                User.update({password: password}, {where : {id: userId} }).then(function() {
                    let token = signToken(user);
                    let CurrentUserInformation = {
                        userId: user.id,
                        profileImageUrl: user.profilePictureUrl
                    };
                    reply.send({ success: true, token: token, new_user: false, CurrentUserInformation: CurrentUserInformation });
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
                    let CurrentUserInformation = {
                        userId: user.id,
                        profileImageUrl: user.profilePictureUrl
                    };
                    reply.send({ success: true, token: token, new_user: true, CurrentUserInformation: CurrentUserInformation });
                });
            }else{
                let token = signToken(user);
                let CurrentUserInformation = {
                    userId: user.id,
                    profileImageUrl: user.profilePictureUrl
                };
                reply.send({ success: true, token: token, new_user: false, CurrentUserInformation: CurrentUserInformation });
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
                    let CurrentUserInformation = {
                        userId: user.id,
                        profileImageUrl: user.profilePictureUrl
                    };
                    reply.send({ success: true, token: token, new_user: true, CurrentUserInformation: CurrentUserInformation });
                });
            }else{
                let token = signToken(user);
                let CurrentUserInformation = {
                    userId: user.id,
                    profileImageUrl: user.profilePictureUrl
                };
                reply.send({ success: true, token: token, new_user: false, CurrentUserInformation: CurrentUserInformation });
            }
        }).catch(function(error) {
            console.log('error in catch', error);
            reply.code(500);
            reply.send({ message: 'There was an error!' });
        });
    },

    recoverPasswordByEmail:  (request, reply)  => {
        console.log('recoverPasswordByEmail!!!!!!!!!!!!!!!!!');

        if(!request.body.email) {
            reply.code(404);
            return reply.send({ message: 'Email is needed' });
        }

        User.findOne({ where: { email: request.body.email } }).then(function(user) {
            if(!user) {
                reply.code(404).send({ message: 'Email not found!' });
            } else {
                let token = signTokenForPasswordChange(user);
                mail.send(user.email, "password change",
                    "follow link to change password: \n" +
                    'http://localhost:4200/auth?' +
                    'recoverToken=' + token,
                    () => {
                        reply.send({ success: true});
                    },
                    () => {
                        reply.code(404).send({ message: 'Error! try again later' });
                    })
            }
        }).catch(function(error) {
            console.log('error in catch', error);
            reply.code(500).send({ message: 'There was an error!' });
        });

    },

    setProfilePicture:  (request, reply)  => {
        User.findOne({ where: { id: request.user.dataValues.id } }).then(function(user) {
            if(!user) {
                reply.code(404).send({ message: 'User not found!' });
            } else {
                user.profilePictureUrl = request.file_url;
                User.update({profilePictureUrl: request.file_url}, {where : {id: user.id} }).then(function() {
                    reply.send({ success: true, file_url: request.file_url});
                });
            }
        }).catch(function(error) {
            console.log('error in catch', error);
            reply.code(500).send({ message: 'There was an error!' });
        });

    },

    getUserInfo: async (request, reply) => {
        let userId = parseInt(request.query.userId);
        if (userId === -1){
            userId = request.user.dataValues.id;
        }

        // UserInformation {
        //     userId: number;
        //     firstName: string;
        //     lastName: string;
        //     gender: string;
        //     birthDay: number; // timestamp
        //     education: string;
        //     username: string;
        //     profileImageUrl: string;
        //     email: string;
        //     subjects: SubjectStat[];

        User.findOne({
            // attributes: [['id', 'userId'], ['first_name', 'firstName'], ['last_name', 'lastName'], 'gender', 'birthday', 'education', 'username', ['profilePictureUrl','profileImageUrl'], 'email'],
            where: {
                id: userId
            },
            include: {
                model : UserRating,
                // as: 'usRating',
                // order: ['subjectId', 'createdAt']
            },
            order: [['userRatings','subjectId' ], ['userRatings','createdAt']]

        }).then(function (user) {
            if(!user){
                reply.send('User not found');
            }else{
                let userInfo = {
                    userId: user.id,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    gender: user.gender,
                    birthday: user.birthday,
                    education: user.education,
                    username: user.username,
                    profileImageUrl: user.profilePictureUrl,
                    email: user.email
                };

                let subjects = [];
                let subjectId = null;
                let subjectStats = [];
                for (let i = 0; i < user.userRatings.length; i++){
                    if( subjectId !== user.userRatings[i].subjectId ){
                        if(subjectId){
                            subjects.push({
                                subjectId: subjectId,
                                subjectStats: subjectStats
                            });
                        }
                        subjectId = user.userRatings[i].subjectId;
                        subjectStats = [];
                    }
                    subjectStats.push({
                        timestamp: new Date(user.userRatings[i].createdAt).getTime(),
                        score: user.userRatings[i].rating
                    });
                }

                if(subjectId){
                    subjects.push({
                        subjectId: subjectId,
                        subjectStats: subjectStats
                    });
                }

                userInfo.subjects = subjects;
                reply.send(userInfo);
            }
        }).catch(function(error) {
            console.log('error in catch', error);
            reply.code(500).send({ message: 'There was an error!' });
        });




    }


};
