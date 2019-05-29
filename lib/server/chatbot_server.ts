import http = require('http');
import socketIO = require('socket.io');
import express = require('./express');

// --------------------------------------------------------------------------------
// Code from anweshan server.ts file, this code will later be added in server.ts
const app: Express.Application = express();
const server: http.Server = new http.Server(app);
const io: socketIO.Server = socketIO(server);

// using username property in typescript
interface ExtendedSocket extends SocketIO.Socket{
    username: string;
}

// creating interface for different characteristics of a logged user
interface User {
    socketID: string,
    state: string,
    outRequest: string,
    partner: string,
    inRequests: Set<string>
}

// declaring a user map containing all users mapped from their soscketids to their characteristics.
let users: Map<string, User> = new Map();
// --------------------------------------------------------------------------------

class Msg {
    public messageValue: string;
    public timeStamp: string;
    constructor(messageValue: string) {
        this.messageValue = messageValue;
        const currentdate = new Date();
        this.timeStamp = currentdate.getHours() + ":"
                        + currentdate.getMinutes() + ":"
                        + currentdate.getSeconds();
    }
}

io.on('connection', (socket: ExtendedSocket) => {
    socket.on('message', (messageValue: string) => {
        // Creating the new msg using the class Msg
        const msg = new Msg(messageValue);
        // Getting the users
        const username1 = socket.username;
        const user1: User = users.get(username1) as User;
        if (user1.state === "connected") {
            const username2 = user1.partner;
            const user2: User = users.get(username2) as User;
            // Emitting the msg to user1 (sender)
            socket.emit('message', msg);
            // Broadcasting the msg to user2 only
            socket.broadcast.to(user2.socketID).emit('message', msg);
        }
    });
  });
