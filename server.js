require('dotenv').config();
const config = require('./config/config');
const fastify = require('fastify')({ logger: true });


fastify.register(require('fastify-jwt'), { secret: config.JWT_SECRET });
fastify.register(require('fastify-auth'));


fastify.register(require('./routes/users'));


// Run the server!
const start = async () => {
    try {
        await fastify.listen(80);
        fastify.log.info(`server listening on ${fastify.server.address().port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
