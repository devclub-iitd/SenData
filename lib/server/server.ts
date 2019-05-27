import http = require('http');
import express = require('./express');
import env = require('./env');
import socketIO = require('socket.io');
import webTorrent = require('webtorrent')

const app: Express.Application = express();
const server: http.Server = new http.Server(app);
const io: socketIO.Server= socketIO(server);

server.listen(env.PORT, () => {
    console.log(`listening on *:${env.PORT}`);
});

let numUsers: number = 0;
let user1: string, user2: string;

io.on('connection', (socket: socketIO.Socket) => {
    if(numUsers >= 2) {
        socket.emit('bye-bye');
        socket.disconnect();
        return;
    }

    numUsers++;

    if (numUsers == 2){
        io.emit('connected')
    }

    socket.on('fileReady', (opts: { magnetURI: string }) => {
        socket.broadcast.emit('addTorrent', opts);
    })

    socket.on('downloadComplete', () => {
        //TODO
    });

    socket.on('disconnect', () => {
        if(numUsers == 2){
            io.emit('disconnected');
        }

        numUsers--;
    })
});