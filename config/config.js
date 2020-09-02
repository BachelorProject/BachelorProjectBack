require('dotenv').config();

'use strict';

let config = module.exports;

config.db = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
};

config.db.details = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql'
};

config.JWT_SECRET = process.env.JWT_SECRET;

config.EMAIL_USER = process.env.EMAIL_USER;
config.EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
config.API_URL = process.env.API_URL;
