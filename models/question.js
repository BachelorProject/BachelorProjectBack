'use strict';

const Sequelize = require('sequelize');
const db = require('../db_connection');
let AnswerType = require('./../models/answer_type');
let QuestionAnswer = require('./../models/question_answer');

let modelDefinition = {
    question: {
        type: Sequelize.TEXT,
        allowNull: true
    },

    score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
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

let Question = db.define('question', modelDefinition, {});
// Question.belongsTo(Round, {as: 'createUser'}); // ??
Question.belongsTo(AnswerType);
Question.hasMany(QuestionAnswer);
// QuestionAnswer.belongsTo(Question);
module.exports = Question;
