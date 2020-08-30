'use strict';

const Sequelize = require('sequelize');
const db = require('../db_connection');
const Round = require('./../models/round');
const User = require('./../models/user');

let modelDefinition = {
    score : {
        type: Sequelize.INTEGER,
        required: false
    },
    end_time : {
        type: Sequelize.DATE,
        required: false
    }
};

let UserRoundResult = db.define('userRoundResult', modelDefinition, {});
UserRoundResult.belongsTo(Round);
Round.hasMany(UserRoundResult);

UserRoundResult.belongsTo(User);
User.hasMany(UserRoundResult);
module.exports = UserRoundResult;
