'use strict';

var config = require('./config/config'),
    Sequelize = require('sequelize');

module.exports = new Sequelize(
    config.db.database,
    config.db.user,
    config.db.password,
    config.db.details
);