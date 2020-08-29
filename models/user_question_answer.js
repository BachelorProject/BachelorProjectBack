'use strict';

const db = require('../db_connection');
const QuestionAnswer = require('./../models/question_answer');
const User = require('./../models/user');

let modelDefinition = {};

let UserQuestionAnswer = db.define('userQuestionAnswer', modelDefinition, {});
UserQuestionAnswer.belongsTo(QuestionAnswer);
QuestionAnswer.hasMany(UserQuestionAnswer);

UserQuestionAnswer.belongsTo(User);
User.hasMany(UserQuestionAnswer);
module.exports = UserQuestionAnswer;
