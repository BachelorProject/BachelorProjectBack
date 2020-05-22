require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const mysqlConnection = require("./db_connection");
const userModule = new (require('./modules/user/user.module.js'))();


fastify.get('/*', async (request, reply) => {
    return { hello: 'dima' }
});

fastify.get('/user', async (request, reply) => {
    return userModule.loginUser(request.query.name, request.query.pass)
});

fastify.get('/users', async (request, reply) => {
    mysqlConnection.query("select * from app_users;", (err,rows,fields) =>{
        if(!err){
            reply.send(rows);
            console.log((rows));
        }else{
            console.log(err);
        }
    });
});

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
