'use strict';

const express = require('express');
const app = express();

const chatcat = require('./app');

const passport = require('passport');

// const PORT = process.env.PORT || 3000;
app.set('port', process.env.PORT || 3000);

// to get our static assets (images, css files, anything that doesn't require pre-processing)
// we use the use() method and invoke the static() method on the express instance passing it the folder containing these assets
app.use(express.static('public'));

app.use(express.static('node_modules/babel-standalone'));

// the set() method on an instance of an express app will set a property on the instance
app.set('view engine', 'ejs');

// as a note the need to add the filepath for our view in the render() method is not needed
// this is because express defaults this to './views' in the current directory
// we could set this manually (or change) by using the set() method
// app.set('views', './views')

app.use(chatcat.session);
app.use(passport.initialize());
app.use(passport.session());

// use our logging middleware
app.use(require('morgan')('combined', {
    stream: {
        write: message => {
            // write to logs
            chatcat.logger.log('info', message);
        }
    }
}));

app.use('/', chatcat.router);

chatcat.ioServer(app).listen(app.get('port'), () => { console.log('ChatCAT running on port:', app.get('port')); });