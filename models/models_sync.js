let User = require('./../models/user');
let Subject = require('./../models/subject');
let ContestRegisteredUser = require('./../models/contest_registered_user');
let ContestSubject = require('./../models/contest_subject');
let Round = require('./../models/round');
let AnswerType  =  require('./../models/answer_type');
let Contest  =  require('./../models/contest');
let Question  =  require('./../models/question');
let QuestionAnswer  =  require('./../models/question_answer');


let sequelize = require('../db_connection');
sequelize.sync();



