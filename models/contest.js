'use strict';
const config = require('./../config/config');
const Sequelize = require('sequelize');
const db = require('../db_connection');
let User = require('./../models/user');
let Subject = require('./../models/subject');
let ContestRegisteredUser = require('./../models/contest_registered_user');
let ContestSubject = require('./../models/contest_subject');
let Round = require('./../models/round');

let modelDefinition = {
    title: {
        type: Sequelize.STRING,
        unique: false, // ???
        allowNull: false,
        defaultValue: ''
    },

    description: {
        type: Sequelize.TEXT,
        allowNull: true
    },

    registrationDeadline: {
        type: Sequelize.DATE,
        allowNull: true
    },

    contestPictureUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: config.API_URL +  config.PUBLIC_DIR_URL + config.DEFAULT_CONTEST_AVATAR
    },

    status: {
        type: Sequelize.STRING,
        unique: false,
        allowNull: false,
        defaultValue: config.STATUS_UNPUBLISHED,
        validate: {
            isIn: [
                config.STATUS_UNPUBLISHED,
                config.STATUS_REGISTRATION_ON,
                config.STATUS_REGISTRATION_OVER,
                config.STATUS_CANCELLED,
                config.STATUS_COMPLETED,
                config.STATUS_ONGOING
            ]
        }
    }
};

let modelOptions = {
    // hooks: {
    //     beforeValidate: hashPassword
    // }
};

let Contest = db.define('contest', modelDefinition, modelOptions);

Contest.belongsTo(User, {as: 'createUser'});
Contest.belongsToMany(User, {through: ContestRegisteredUser}); /// ?? add someth
Contest.belongsToMany(Subject, {through: ContestSubject});

Contest.hasMany(Round); /// ???
// Round.belongsTo(Contest);

module.exports = Contest;

