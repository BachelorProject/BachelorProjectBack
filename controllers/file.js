const multer = require('fastify-multer'); // or import multer from 'fastify-multer'
const publicDirUrl = './public/uploads/';
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, publicDirUrl)
    },
    filename: function (req, file, cb) {
        let mime = require('mime-types'),
            fileExtension = mime.extension(file.mimetype);

        let fileName = file.fieldname + '-' + req.user.dataValues.id + '-' + Date.now() + '.' + fileExtension;
        req.file_url = publicDirUrl + fileName;
        cb(null, fileName)
    }
});

const upload = multer({storage: storage});

module.exports = {
    upload
};
