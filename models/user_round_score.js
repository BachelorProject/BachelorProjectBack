'use strict';

const Sequelize = require('sequelize');
const db = require('../db_connection');
const Round = require('./../models/round');
const User = require('./../models/user');

let modelDefinition = {
    score : {
        type: Sequelize.INTEGER,
        required: false
    }
};

let UserRoundScore = db.define('userRoundScore', modelDefinition, {});
UserRoundScore.belongsTo(Round);
Round.hasMany(UserRoundScore);

UserRoundScore.belongsTo(User);
User.hasMany(UserRoundScore);
module.exports = UserRoundScore;
