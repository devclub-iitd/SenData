import http = require('http');
import express = require('./express');
import env = require('./env');
import socketIO = require('socket.io');

const app: Express.Application = express();
const server: http.Server = new http.Server(app);
const io: socketIO.Server= socketIO(server);

server.listen(env.PORT, () => {
    console.log(`listening on *:${env.PORT}`);
});

let users: Set<String> = new Set<String>();

io.on('connection', (socket: socketIO.Socket) => {
    if(users.size >= 2) {
        socket.emit('bye-bye');
        socket.disconnect();
        return;
    }

    users.add(socket.id);
    if(users.size == 2) {
        io.emit('connected');
    }

    socket.on('disconnect', () => {
        if(users.size == 2){
            io.emit('disconnected');
        }

        users.delete(socket.id);
    })
});