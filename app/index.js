'use strict';

const config = require('./config');
const redis = require('redis').createClient;
const adapter = require('socket.io-redis');

// social authentication logic
require('./auth')();

// create an IO server instance
let ioServer = app => {
    
    // initialise http server instance
    const server = require('http').Server(app);
    
    // bring socket.io
    const io = require('socket.io')(server);
    
    // force socket.io to only use websockets (and not long polling) so we can support session affinity (sticky sessions)
    io.set('transports', ['websocket']);
    
    // used for sending/publishing data buffers
    let pubClient = redis(config.redis.port, config.redis.host, {
        auth_pass: config.redis.password
    });
    
    // used for subscribing/getting data back from redis
    let subClient = redis(config.redis.port, config.redis.host, {
        return_buffers: true,
        auth_pass: config.redis.password
    });
    
    // interface redis with socket.io passing in our socket.io-redis module
    io.adapter(adapter({
        pubClient,
        subClient
    }));
    
    // pass requests through our session module
    io.use((socket, next) => {
        require('./session')(socket.request, {}, next);
    });
    
    // the socket module handles all the app messaging
    require('./socket')(io, app);
    
    return server;
}

module.exports = {
    router: require('./routes')(),
    session: require('./session'),
    ioServer,
    logger: require('./logger')
};