const multer = require('fastify-multer'); // or import multer from 'fastify-multer'
const config = require('./../config/config');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, config.PUBLIC_DIR_URL)
    },
    filename: function (req, file, cb) {
        let mime = require('mime-types'),
            fileExtension = mime.extension(file.mimetype);

        let fileName = file.fieldname + '-' + req.user.dataValues.id + '-' + Date.now() + '.' + fileExtension;
        req.file_url = config.API_URL +  config.PUBLIC_DIR_URL + fileName;
        cb(null, fileName)
    }
});

const upload = multer({storage: storage});

module.exports = {
    upload
};
