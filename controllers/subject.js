let Subject = require('./../models/subject');

module.exports = {
    getSubjects: async (request, reply) => {
        Subject.findAll().then(function(subjects) {
            reply.send({success: true, data: subjects })
        }).catch(function(err){
            reply.code(500);
            reply.send({ message: 'There was an error!' });
        });
    }
};
