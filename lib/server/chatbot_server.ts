import http = require('http');
import socketIO = require('socket.io');
import express = require('./express');

const app: Express.Application = express();
const server: http.Server = new http.Server(app);
const io: socketIO.Server = socketIO(server);

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

io.on('connection', (socket) => {
    socket.on('message', (messageValue: string) => {
        const msg = new Msg(messageValue);
        socket.emit('message', msg);
    });
  });
