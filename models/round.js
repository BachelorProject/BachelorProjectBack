'use strict';

const Sequelize = require('sequelize');
const db = require('../db_connection');

let Question = require('./../models/question');

let modelDefinition = {
    roundNo: {
        type: Sequelize.INTEGER,
        unique: false,
        allowNull: false
    },

    description: {
        type: Sequelize.TEXT,
        allowNull: true
    },

    startTime: {
        type: Sequelize.DATE,
        allowNull: true
    },

    strictMode: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
    },

    isOpen: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
    },

    passingPlace: {
        type: Sequelize.INTEGER
    },

    passingScore: {
        type: Sequelize.INTEGER
    },

    duration: {
        type: Sequelize.INTEGER
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

let Round = db.define('round', modelDefinition, {});
Round.hasMany(Question);
Question.belongsTo(Round);
module.exports = Round;
