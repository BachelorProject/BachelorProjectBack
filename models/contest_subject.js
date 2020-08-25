'use strict';

const Sequelize = require('sequelize');
const db = require('../db_connection');

let modelOptionsContestSubject = {
    subjectId: {
        type: Sequelize.INTEGER,
        allowNull: false},
    contestId: {
        type: Sequelize.INTEGER,
        allowNull: false}
};


let ContestSubject =  db.define('contestSubject', modelOptionsContestSubject, {});
module.exports = ContestSubject;
