'use strict';

const Sequelize = require('sequelize');
const db = require('../db_connection');

let modelOptionsRegisteredUser = {
    userId: {
        type: Sequelize.INTEGER,
        allowNull: false},
    contestId: {
        type: Sequelize.INTEGER,
        allowNull: false}
};

let ContestRegisteredUser =  db.define('contestRegisteredUser', modelOptionsRegisteredUser, {});
ContestRegisteredUser.sync();
module.exports = ContestRegisteredUser;
