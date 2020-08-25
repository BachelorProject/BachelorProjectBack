'use strict';

const Sequelize = require('sequelize');
const db = require('../db_connection');

let modelDefinition = {
    subject: {
        type: Sequelize.TEXT,
        allowNull: true
    },

    colorId: {
        type: Sequelize.INTEGER,
        allowNull: true
    }
};

let Subject = db.define('subject', modelDefinition, {});
// Subject.belongsToMany(Contest, {through: ContestSubject});
module.exports = Subject;
