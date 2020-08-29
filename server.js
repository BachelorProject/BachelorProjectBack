require('dotenv').config();
const config = require('./config/config');
const fastify = require('fastify')({ logger: true });

fastify.register(require('fastify-jwt'), { secret: config.JWT_SECRET });
fastify.register(require('fastify-auth'));
fastify.register(require('./routes/routes'));
fastify.register(require('fastify-cors'), {});

require('./models/models_sync');

const path = require('path');

fastify.register(require('fastify-static'), {
    root: path.join(__dirname, 'public'),
    prefix: '/public/', // optional: default '/'
});

// Run the server!
const start = async () => {
    try {
        await fastify.listen(3000);
        fastify.log.info(`server listening on ${fastify.server.address().port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
