"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const express = require("./express");
const env = require("./env");
const socketIO = require("socket.io");
const app = express();
const server = new http.Server(app);
const io = socketIO(server);
server.listen(env.PORT, () => {
    console.log(`listening on *:${env.PORT}`);
});
let users = new Set();
io.on('connection', (socket) => {
    if (users.size >= 2) {
        socket.emit('bye-bye');
        socket.disconnect();
        return;
    }
    users.add(socket.id);
    if (users.size == 2) {
        io.emit('connected');
    }
    socket.on('disconnect', () => {
        if (users.size == 2) {
            io.emit('disconnected');
        }
        users.delete(socket.id);
    });
});
