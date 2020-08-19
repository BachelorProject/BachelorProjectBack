require('dotenv').config();
const config = require('./config/config');
const fastify = require('fastify')({ logger: true });

fastify.register(require('fastify-cors'), {//uncomment for debug purposes only
    // put your options here
});

fastify.register(require('fastify-jwt'), { secret: config.JWT_SECRET });
fastify.register(require('fastify-auth'));
fastify.register(require('./routes/users'));
fastify.register(require('fastify-cors'), {});

fastify.get('/api/tournament/list', async  (request, reply) => {
    console.log(request.query.fromNum);//int
    console.log(request.query.toNum);//int
    console.log(request.query.searchString);//string obviously
    console.log(request.query.categories);//it is a list
    console.log(request.query.fromDate);//timestamp
    console.log(request.query.toDate);//timestamp
    let replyData = [];
    for (var i = 0; i < 10; i++ ){
        replyData.push( //todo: replace with db call and its done.
            {
                id: 1,
                title: 'This is a test contest lol',
                body: '<h2>I am dummy data header for dummy contest.</h2>',
                imageUrl: 'https://avatar.onlinesoccermanager.nl/03319541v1.png',
                registrationStart: 1590160650706,
                registrationEnd: 1590160850706,
                nextContestStart: 1590161250706,
                nextContestDuration: 180,
                category: 'მათემატიკა'
            }
        );
    }
    reply.send(replyData)
});

fastify.get('/api/tournament/list', async  (request, reply) => {
    console.log(request.query.fromNum);//int
    console.log(request.query.toNum);//int
    console.log(request.query.searchString);//string obviously
    console.log(request.query.categories);//it is a list
    console.log(request.query.fromDate);//timestamp
    console.log(request.query.toDate);//timestamp
    let replyData = [];
    for (var i = 0; i < 10; i++ ){
        replyData.push( //todo: replace with db call and its done.
            {
                id: 1,
                title: 'This is a test contest lol',
                body: '<h2>I am dummy data header for dummy contest.</h2>',
                imageUrl: 'https://avatar.onlinesoccermanager.nl/03319541v1.png',
                registrationStart: 1590160650706,
                registrationEnd: 1590160850706,
                nextContestStart: 1590161250706,
                nextContestDuration: 180,
                category: 'მათემატიკა'
            }
        );
    }
    reply.send(replyData)
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
