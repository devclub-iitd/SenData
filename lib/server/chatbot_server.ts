import http = require('http');
import socketIO = require('socket.io');
import express = require('./express');

const app: Express.Application = express();
const server: http.Server = new http.Server(app);
const io: socketIO.Server = socketIO(server);

// using username property in typescript
interface ExtendedSocket extends SocketIO.Socket {
    username: string;
}

// creating interface for different characteristics of a logged user
interface User {
    socketID: string,
    state: string,
    outRequest: string,
    partner: string,
    inRequests: Set<string>,
    fileSendingState: string, // 'idle' || 'file_request' || 'sending' || 'receiving'
}

// declaring a user map containing all users mapped from their soscketids to their characteristics.
let users: Map<string, User> = new Map();
// --------------------------------------------------------------------------------

class Msg {
    public username: string;
    public messageValue: string;
    public timeStamp: string;
    constructor(username: string, messageValue: string) {
        this.username = username;
        this.messageValue = messageValue;
        const currentdate = new Date();
        this.timeStamp = currentdate.getHours() + ':'
                        + currentdate.getMinutes() + ':'
                        + currentdate.getSeconds();
    }
}

interface FileRequest {
    filename: string;
    filesize: string;
}

io.on('connection', (socket: ExtendedSocket) => { 
    socket.on('message', (messageValue: string) => {
        // Getting the user1
        const username1 = socket.username;
        const user1: User = users.get(username1) as User;
        if (user1.state === 'connected') {
            // Creating the new msg using the class Msg
            const msg = new Msg(username1, messageValue);
            // Getting the user2 (partner of user1)
            const username2 = user1.partner;
            const user2: User = users.get(username2) as User;
            // Emitting the msg to user1 (sender)
            socket.emit('message', msg);
            // Broadcasting the msg to user2 only
            socket.broadcast.to(user2.socketID).emit('message', msg);
        }
    });

    socket.on('file_send_request', (filerequest: FileRequest) => {
        // Getting the user1
        const username1 = socket.username;
        const user1: User = users.get(username1) as User;
        if (user1.state === 'connected') {
            if (user1.fileSendingState === 'idle') {
                user1.fileSendingState = 'file_request';
                // Getting the user2 (partner of user1)
                const username2 = user1.partner;
                const user2: User = users.get(username2) as User;
                // Broadcasting the msg to user2 only
                socket.broadcast.to(user2.socketID).emit('file_send_request', filerequest);
            }
        }
    });

    socket.on('file_request_answer', (accepted: boolean) => {
        // Getting the user2
        const username2 = socket.username;
        const user2: User = users.get(username2) as User;
        if (user2.state === 'connected') {
            // Getting the user1 (partner of user2)
            const username1 = user2.partner;
            const user1: User = users.get(username1) as User;
            if (user1.fileSendingState === 'file_request') {
                if (accepted) {
                    user1.fileSendingState = 'sending';
                    user2.fileSendingState = 'receiving';
                    // Broadcasting the accepted:bool to user1 only
                    socket.broadcast.to(user1.socketID).emit('file_request_answer', accepted);
                    // Initiate the file sending process
                    // ---------------------------------
                } else {
                    user1.fileSendingState = 'idle';
                    user2.fileSendingState = 'idle';
                    // Broadcasting the accepted:bool to user1 only
                    socket.broadcast.to(user1.socketID).emit('file_request_answer', accepted);
                }
            }
        }
    });
  });
