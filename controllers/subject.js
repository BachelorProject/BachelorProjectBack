let Subject = require('./../models/subject');

module.exports = {
    getSubjects: async (request, reply) => {
        Subject.findAll({
            attributes: ['id', ['subject', 'name'], 'colorId']
        }).then(function(subjects) {
            reply.send(subjects)
        }).catch(function(){
            reply.code(500);
            reply.send({ message: 'There was an error!' });
        });
    }
};
