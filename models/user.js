'use strict';

const Sequelize = require('sequelize');
const bcrypt = require('bcrypt');
const db = require('../db_connection');
const config = require('./../config/config');

let modelDefinition = {
    email: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: true
    },

    password: {
        type: Sequelize.STRING,
        allowNull: true
    },

    first_name: {
        type: Sequelize.STRING,
        allowNull: true
    },

    last_name: {
        type: Sequelize.STRING,
        allowNull: true
    },

    facebook_id: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: true
    },

    facebook_name: {
        type: Sequelize.STRING,
        allowNull: true
    },

    facebook_email: {
        type: Sequelize.STRING,
        allowNull: true
    },

    google_id: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: true
    },

    google_email: {
        type: Sequelize.STRING,
        allowNull: true
    },

    profilePictureUrl: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: config.API_URL +  config.PUBLIC_DIR_URL + config.DEFAULT_AVATAR
    },

    username: {
        type: Sequelize.STRING,
        allowNull: true
    },

    gender: {
        type: Sequelize.STRING
    },

    birthday : {
        type: Sequelize.DATE
    },

    education: {
        type: Sequelize.STRING
    },
    status: {
        type: Sequelize.STRING,
        allowNull: true
    },
};


let modelOptions = {
    hooks: {
        beforeValidate: hashPassword
    }
};

let UserModel = db.define('user', modelDefinition, modelOptions);

UserModel.prototype.comparePasswords = function(password, callback) {
    bcrypt.compare(password, this.password, function(error, isMatch) {
        if(error) {
            return callback(error);
        }

        return callback(null, isMatch);
    });
};

function hashPassword(user) {
    if(user.changed('password')) {
        return bcrypt.hash(user.password, 10).then(function(password) {
            user.password = password;
        });
    }
}

module.exports = UserModel;
