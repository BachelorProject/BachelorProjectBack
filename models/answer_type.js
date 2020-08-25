'use strict';

const Sequelize = require('sequelize');
const db = require('../db_connection');

let modelDefinition = {
    answerType: {
        type: Sequelize.STRING,
        allowNull: true
    },

    description: {
        type:  Sequelize.STRING,
        allowNull: true
    }
};

let AnswerType = db.define('answerType', modelDefinition, {});
module.exports = AnswerType;
