'use strict';

const h = require('../helpers');
const logger = require('../logger');

module.exports = (io, app) => {
    
    io.of('/roomslist').on('connection', socket => {
        
        socket.on('getChatrooms', () => {
            
            h.findRooms({})
                .then(rooms => socket.emit('chatRoomsList', JSON.stringify(rooms)),
                error => logger.log('error', 'Error finding rooms for socket getChatRooms: ' + error));
            
        })
        
        socket.on('createNewRoom', newRoomInput => {
            // check to see if a room with the same title exists or not
            // if not, create one and broadcast it to everyone
            
            h.findOneRoom({ room: newRoomInput })
                .then(room => {
                    if (room) return;
                    
                    let newRoom = {
                        room: newRoomInput,
                        roomID: h.randomHex(),
                        users: []
                    };
                    
                    h.createRoom(newRoom)
                        .then(newRoom => {
                            h.findRooms({})
                                .then(rooms => {
                                    // emit an updated list to the creator
                                    socket.emit('chatRoomsList', JSON.stringify(rooms));
                                    // emit an updated list to everyone connected to the rooms page
                                    socket.broadcast.emit('chatRoomsList', JSON.stringify(rooms));
                            });
                        });
                })
                .catch(error => logger.log('error', 'Error for socket createNewRoom: ' + error));
            
        });
        
    });
    
    io.of('/chatter').on('connection', socket => {
        // join a chatroom 
        socket.on('join', data => {
            
            h.removeRoomUsers({ socketId: socket.id })
                .then(room => {
                    h.addRoomUser(data, socket)
                        .then(room => {
                            // join the room channel
                            socket.join(room.roomID);
                            
                            // update the list of active users as shown on the chatroom page
                            socket.broadcast.to(room.roomID).emit('updateUsersList', JSON.stringify(room.users));
                            socket.emit('updateUsersList', JSON.stringify(room.users));
                        });
                })
                .catch(error => logger.log('error', 'Error for socket join: ' + error));
            
        });
        
        // when a socket exits
        socket.on('disconnect', () => {
            
            // find the room, to which the socket is connected to and purge the user
            h.removeRoomUsers({ socketId: socket.id })
                .then(room => {
                    if (room) socket.broadcast.to(room.roomID).emit('updateUsersList', JSON.stringify(room.users));
                })
                .catch(error => logger.log('error', 'Error removing socket on disconnect: ' + error));
            
        });
        
        // when a new message arrives
        socket.on('newMessage', data => {
            socket.to(data.roomID).emit('inMessage', JSON.stringify(data));
        });
        
    });
    
};