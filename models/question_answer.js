'use strict';

const Sequelize = require('sequelize');
const db = require('../db_connection');
let AnswerType = require('./../models/answer_type');

let modelDefinition = {
    answer: {
        type: Sequelize.TEXT,
        allowNull: true
    },

    isCorrect: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

let QuestionAnswer = db.define('questionAnswer', modelDefinition, {});
// QuestionAnswer.belongsTo(Question);
QuestionAnswer.hasOne(AnswerType);
QuestionAnswer.sync();
module.exports = QuestionAnswer;
