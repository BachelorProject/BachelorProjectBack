'use strict';
const Sequelize = require('sequelize');
const db = require('../db_connection');
const User = require('./../models/user');
const Subject = require('./../models/subject');

let modelDefinition = {
    rating: {
        type: Sequelize.INTEGER
    }
};

//userId
//subjectId
//rating
//createdAt

let UserRating = db.define('userRating', modelDefinition, {});
UserRating.belongsTo(User);
User.hasMany(UserRating);

UserRating.belongsTo(Subject);
Subject.hasMany(UserRating);
module.exports = UserRating;
