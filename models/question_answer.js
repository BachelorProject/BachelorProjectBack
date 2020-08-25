'use strict';

const Sequelize = require('sequelize');
const db = require('../db_connection');

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
module.exports = QuestionAnswer;
