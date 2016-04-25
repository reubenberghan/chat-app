'use strict';

const router = require('express').Router();
const db = require('../db');
const crypto = require('crypto');

// iterate throught the routes object and mount the routes
let _registerRoutes = (routes, method) => {
    
    for(let key in routes) {
        if (typeof routes[key] === 'object' &&
            routes[key] !== null &&
            !(routes[key] instanceof Array)) {
            
            _registerRoutes(routes[key], key);
            
        } else {
            
            if (method === 'get') {
                router.get(key, routes[key]);
            } else if (method === 'post') {
                router.post(key, routes[key]);
            } else {
                router.use(routes[key]);
            }
            
        }
        
    }
    
}

let route = routes => {
    _registerRoutes(routes);
    return router;
};

// find a single user based on a key
let findOne = profileID => {
    return db.userModel.findOne({
        'profileId': profileID
    });
}

// create a new user and returns that instance
let createNewUser = profile => {
    return new Promise((resolve, reject) => {
        let newChatUser = new db.userModel({
            profileId: profile.id,
            fullName: profile.displayName,
            profilePic: profile.photos[0].value || ''
        });
        
        newChatUser.save(error => {
            if (error) {
                reject(error);
            } else {
                resolve(newChatUser);
            }
        });
    });
};

// the ES6 promisified version of findById
let findById = id => {
    return new Promise((resolve, reject) => {
        db.userModel.findById(id, (error, user) => {
            if (error) {
                reject(error);
            } else {
                resolve(user);
            }
        });
    });
};

// a middleware that checks to see if the user is authenticated & logged in
let isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.redirect('/');
    }
}

// find a chatroom by a given name
let findRoomByName = (allRooms, room) => {
    let findRoom = allRooms.findIndex((element, index, array) => {
        if (element.room === room) {
            return index;
        }
    });
    
    return findRoom > -1 ? true : false;
};

// a function that generates a unique roomID
let randomHex = () => {
    return crypto.randomBytes(24).toString('hex');
};

// find chatroom with a given ID
let findRoomById = (allRooms, roomID) => {
    return allRooms.find((element, index, array) => {
        if (element.roomID === roomID) {
            return true;
        } else {
            return false;
        }
    });
};

// add a user to a chatroom
let addUserToRoom = (allRooms, data, socket) => {
    // get the room object
    let getRoom = findRoomById(allRooms, data.roomID);
    if (getRoom !== undefined) {
        // get the active user's ID (ObjectID as used in session)
        let userID = socket.request.session.passport.user;
        // check to see if this user already exists in the chatroom
        let checkUser = getRoom.users.findIndex((element, index, array) => {
            if (element.userID === userID) {
                return true;
            } else {
                return false;
            }
        });
        
        // if the user is already present in the room, remove them first
        if (checkUser > -1) {
            getRoom.users.splice(checkUser, 1);
        }
        
        // push the user into the room's users array
        getRoom.users.push({
            socketID: socket.id,
            userID,
            user: data.user,
            userPic: data.userPic
        });
        
        // join the room channel
        socket.join(data.roomID);
        
        // return the updated room object
        return getRoom;
        
    }
};

// find a purge the user when a socket disconnects
let removeUserFromRoom = (allRooms, socket) => {
    for(let room of allRooms) {
        // find the user
        let findUser = room.users.findIndex((element, index, array) => {
            if (element.socketID === socket.id) {
                return true;
            } else {
                return false;
            }
            // could use a ternary
            // return element.socketID === socket.id ? true : false;
        });
        
        if (findUser > -1) {
            socket.leave(room.roomID);
            room.users.splice(findUser, 1);
            return room;
        }
    }
};

module.exports = {
    route,
    findOne,
    createNewUser,
    findById,
    isAuthenticated,
    findRoomByName,
    randomHex,
    findRoomById,
    addUserToRoom,
    removeUserFromRoom
}