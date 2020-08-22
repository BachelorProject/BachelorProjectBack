'use strict';

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
        unique: true, // ???
        allowNull: false
    },

    description: {
        type: Sequelize.TEXT,
        allowNull: true
    },

    registrationDeadline: {
        type: Sequelize.DATE,
        allowNull: true
    },

    status: {
        type: Sequelize.STRING,
        unique: false,
        allowNull: false,
        defaultValue: 'N',
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

let ContestModel = db.define('contest', modelDefinition, modelOptions);

ContestModel.belongsTo(User, {as: 'createUser'});
ContestModel.belongsToMany(User, {through: ContestRegisteredUser}); /// ?? add someth
ContestModel.belongsToMany(Subject, {through: ContestSubject});
ContestModel.hasMany(Round); /// ???
ContestModel.sync();
module.exports = ContestModel;
