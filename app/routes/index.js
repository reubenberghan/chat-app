'use strict';

const h = require('../helpers');
const passport = require('passport');
const config = require('../config');
const logger = require('../logger');

module.exports = () => {
    let routes = {
        'get': {
            '/': (req, res, next) => {
                
                h.removeRooms({ users: { $size: 0 } })
                    .catch(error => logger.log('error', 'Error removing rooms on index: ' + error));
                
                res.render('login');
            },
            '/rooms': [h.isAuthenticated, (req, res, next) => {
                res.render('rooms', {
                    user: req.user,
                    host: config.host
                });
            }],
            '/chat/:id': [h.isAuthenticated, (req, res, next) => {
                // find a chatroom with the given id
                // render it if the id is found
                
                h.findOneRoom({ roomID: req.params.id })
                    .then(room => {
                        if (!room) return next();
                        
                        res.render('chatroom', {
                            user: req.user,
                            host: config.host,
                            room: room.room,
                            roomID: room.roomID
                        });
                    },
                    error => logger.log('error', 'Error finding room for chat route: ' + error));
                    
            }],
            '/auth/facebook': passport.authenticate('facebook'),
            '/auth/facebook/callback': passport.authenticate('facebook', {
                successRedirect: '/rooms',
                failureRedirect: '/'
            }),
            '/auth/twitter': passport.authenticate('twitter'),
            '/auth/twitter/callback': passport.authenticate('twitter', {
                successRedirect: '/rooms',
                failureRedirect: '/'
            }),
            '/logout': (req, res, next) => {
                
                h.removeRooms({ users: { $size: 0 } })
                    .catch(error => logger.log('error', 'Error removing rooms on logout: ' + error));
                
                req.logout();
                res.redirect('/');
            }
        },
        'post': {
            
        },
        'NA': (req, res, next) => {
            res.status(404).sendFile(process.cwd() + '/views/404.htm');
        }
    };
    
    return h.route(routes);
    
};