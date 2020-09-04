'use strict';

const Sequelize = require('sequelize');
const db = require('../db_connection');
const config = require('./../config/config');
let Question = require('./../models/question');


let modelDefinition = {
    roundNo: {
        type: Sequelize.INTEGER,
        // allowNull: false
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

    password: {
        type: Sequelize.STRING
    },

    status: {
        type: Sequelize.STRING,
        unique: false,
        allowNull: false,
        defaultValue: config.STATUS_ACTIVE,
        validate: {
            isIn: [
                config.STATUS_ACTIVE,
                config.STATUS_ONGOING,
                config.STATUS_CANCELLED,
                config.STATUS_COMPLETED,
                config.STATUS_DELETED
            ]
        }
    }
};


let Round = db.define('round', modelDefinition, {});
Round.hasMany(Question);
Question.belongsTo(Round);
module.exports = Round;

