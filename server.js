const fastify = require('fastify')({ logger: true });
const userModule = new (require('./modules/user/user.module.js'))();

fastify.get('/*', async (request, reply) => {
    return { hello: 'dima' }
});

fastify.get('/user', async (request, reply) => {
    return userModule.loginUser(request.query.name, request.query.pass)
});


// Run the server!
const start = async () => {
    try {
        await fastify.listen(3000);
        fastify.log.info(`server listening on ${fastify.server.address().port}`)
    } catch (err) {
        fastify.log.error(err);
        process.exit(1)
    }
};



start();
