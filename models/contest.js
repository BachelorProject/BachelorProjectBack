'use strict';
const config = require('./../config/config');
const Sequelize = require('sequelize');
const db = require('../db_connection');
let User = require('./../models/user');
let Subject = require('./../models/subject');
let ContestRegisteredUser = require('./../models/contest_registered_user');
let ContestSubject = require('./../models/contest_subject');
let Round = require('./../models/round');


// 'UNPUBLISHED', 'REGISTRATION ON', 'REGISTRATION OVER', 'ONGOING', 'CANCELLED', 'COMPLETED'
const STATUS_UNPUBLISHED = 'UNPUBLISHED';
const STATUS_REGISTRATION_ON = 'REGISTRATION ON';
const STATUS_REGISTRATION_OVER = 'REGISTRATION OVER';
const STATUS_ONGOING = 'ONGIONG';
const STATUS_CANCELLED = 'CANCELLED';
const STATUS_COMPLETED = 'COMPLETED';

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
        defaultValue: STATUS_UNPUBLISHED,
        // validate: {
        //     isIn: []
        // }
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
exports.STATUS_UNPUBLISHED = STATUS_UNPUBLISHED;
exports.STATUS_REGISTRATION_ON = STATUS_REGISTRATION_ON;
exports.STATUS_REGISTRATION_OVER = STATUS_REGISTRATION_OVER;
exports.STATUS_ONGOING = STATUS_ONGOING;
exports.STATUS_CANCELLED = STATUS_CANCELLED;
exports.STATUS_COMPLETED = STATUS_COMPLETED;
