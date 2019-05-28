import http = require('http');
import express = require('./express');
import env = require('./env');
import socketIO = require('socket.io');

const app: Express.Application = express();
const server: http.Server = new http.Server(app);
const io: socketIO.Server= socketIO(server);
let status: number;

server.listen(env.PORT, () => {
    console.log(`listening on *:${env.PORT}`);
});

// creating interface for different characteristics of a logged user
interface User {
    uname: string,
    state: string,
    outRequest: string,
    partner: string,
    inRequests: Set<string>
}

// declaring a user map containing all users mapped from their soscketids to their characteristics.
let users: Map<string, UserCh> = new Map();



io.on('connection', (socket: socketIO.Socket) => {
    // if(users.size >= 2) {
    //     socket.emit('bye-bye');
    //     socket.disconnect();
    //     return;
    // }



    // users.add(socket.id);

    // var val= <UserCh> {
    //     socketID: socket.id,
    //     state: "",
    //     outRequest: "",
    //     partner: "",
    //     inRequests: {}
    // } 

    // if(users.size == 2) {
    //     io.emit('connected');
    // }

    // login event
    socket.on('login', (username: string)=>{
        
        // if username already exists in the user map
        if(users.has(socket.id) || username === ''){
            status = 1;
        }
        else{

            //initialising characteristics for logged user(updatable later)
            let val= <UserCh> {
                uname: username,
                state: "idle",
                outRequest: "",
                partner: "",
                inRequests: {}
            }

            //mapping logged user to its characteristic values.
            users.set(socket.id, val);

            // confirming user that its logged in
            status = 0;
            socket.emit('login', status);
        }
    });

    socket.on('disconnect', () => {
        // if(users.size == 2){
        //     io.emit('disconnected');
        // }
        // disconnected user characteristics
        let checkval = <UserCh> users.get(socket.id);

        // if current disconnected user was paired to some user
        if(checkval.partner !== ""){

            //characteristics of partner
            let changeval = <UserCh> users.get(checkval.partner);
            
            // let toval = <UserCh> {
            //     uname: fromval.uname,
            //     state: "idle",
            //     outRequest: "",
            //     partner: "",
            //     inRequests: fromval.inRequests
            // }

            changeval.state = "idle";
            changeval.outRequest = "";
            changeval.partner = "";

            //characteristics of partner updated
            users.set(checkval.partner, changeval);

            //message sent to partner
            socket.broadcast.to(checkval.partner).emit(`${checkval.uname} disconnected`);
        }

        // looping user map for all other users waiting for this socket to reply yo their request
        for(let key of users.keys()){

            //getting characteristics
            let waitval = <UserCh> users.get(key);

            if(waitval.partner === socket.id){
                
                //updating characteristics
                waitval.outRequest = "";

                users.set(key, waitval);

                socket.broadcast.to(key).emit(`${checkval.uname} disconnected`);
            }

        }

        //deleted socket
        users.delete(socket.id);
        // users.delete(socket.id);
    });
});