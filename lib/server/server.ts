import http = require('http');
import express = require('./express');
import env = require('./env');
import socketIO = require('socket.io');
import { userInfo } from 'os';
import { stringify } from 'querystring';

const app: Express.Application = express();
const server: http.Server = new http.Server(app);
const io: socketIO.Server= socketIO(server);
let status: number;

server.listen(env.PORT, () => {
    console.log(`listening on *:${env.PORT}`);
});

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

//function to get username from socketID
function getUname(socket_id: string): string {
    for(let key of users.keys()){

        let loopval = <User> users.get(key);
    
        if(loopval.socketID === socket_id){
            return key;
        }
    }

    return "";
}

io.on('connection', (socket: socketIO.Socket) => {

    // login event
    socket.on('login', (username: string)=>{
        
        // if username already exists in the user map
        if(users.has(username) || username === ''){
            status = 1;
        }
        else{
            //initialising characteristics for logged user(updatable later)
            let val: User = <User> {
                socketID: socket.id,
                state: "idle",
                outRequest: "",
                partner: "",
                inRequests: {}
            }

            //mapping logged user to its characteristic values.
            users.set(username, val);

            // confirming user that its logged in
            status = 0;
            socket.emit('login', status);
        }
    });

    //disconnect event
    socket.on('disconnect', () => {

        // disconnected user username
        let disconnected_user: string = getUname(socket.id);

        //getting disconneted user properties
        let checkval: User = <User> users.get(disconnected_user);
        
        // if current disconnected user was paired to some user
        if(checkval.partner !== ""){

            //characteristics of partner
            let changeval: User = <User> users.get(checkval.partner);

            // update properties of partner
            changeval.state = "idle";
            changeval.outRequest = "";
            changeval.partner = "";

            //map updated properties of partner
            users.set(checkval.partner, changeval);

            //message sent to partner
            socket.broadcast.to(checkval.partner).emit(`PartnerDisconnected`);
        }

        //message to all other users also
        socket.broadcast.emit('disconnect', disconnected_user);

        //deleted socket (in any case)
        users.delete(disconnected_user);
    });

    //user1 requests user2 to connect
    socket.on('offer', (user2_name: string) => {
        
        //get this user's username
        let user1_name: string = getUname(socket.id);

        //get properties of both users.
        let user1: User = <User> users.get(user1_name);
        let user2: User = <User> users.get(user2_name);


        if(user2.state === "waiting" || user2.state === "connected"){
            socket.emit('answer','n');
        }
        else{
            //updated properties
            user1.outRequest = user2_name;
            user1.state = "waiting";
            user2.inRequests.add(user1_name);

            //remap new properties
            users.set(user1_name, user1);
            users.set(user2_name,user2);

            // offer event to user2
            socket.broadcast.to(user2.socketID).emit('offer', user1_name);
            
            // broadcast event to all other users
            socket.broadcast.emit('userRequested', {
                user1_name,
                user2_name
            });
        }     
    });

    // answer event.. user2 answering user1
    socket.on('answer', (msg: {
        user1_name: string,
        answer: string
    }) => {

        //get usernames of both users
        let user2_name: string = getUname(socket.id);
        let user1_name: string = msg.user1_name;
        
        //get properties of both users
        let user1: User = <User> users.get(user1_name);
        let user2: User = <User> users.get(user2_name);

        //getting response of user2 to user1 as answer
        let ans: string = msg.answer;

        if(ans === 'n'){

            //updating properties of user2
            //remove user1 from inRequest list of user2
            user2.inRequests.delete(user1_name);
            user1.state = "idle";
            user1.outRequest = "";

            //remap new properties
            users.set(user1_name,user1);
            users.set(user2_name,user2);

            //emit messages to user1 and all other users.
            socket.broadcast.to(user1.socketID).emit('answer', ans);
            socket.broadcast.emit('userRejected', {
                user1_name,
                user2_name
            });
        }
        else{
            
            //updating partner properties of user1 and user2
            user2.partner = user1_name;
            user1.partner = user2_name;
            
            //updating status of both users to connected
            user1.state = "connected";
            user2.state = "connected";

            //rejecting all other requests of both users
            for(let key of user1.inRequests){
                
                //get socketid of key
                let temp: User = <User> users.get(key);

                socket.broadcast.to(temp.socketID).emit('answer', 'n');
            }

            user1.inRequests.clear();

            for(let key of user2.inRequests){
                
                //get socketid of key
                let temp: User = <User> users.get(key);

                socket.broadcast.to(temp.socketID).emit('answer', 'n');
            }

            user2.inRequests.clear();

            //remap new properties
            users.set(user1_name,user1);
            users.set(user2_name,user2);
            
        }

    });

    //request for cancelling connection by either user
    socket.on('CancelConnection',(user2_name: string) => {

        //get usernames of both users
        let user1_name: string = getUname(socket.id);
        
        //get properties of both users
        let user1: User = <User> users.get(user1_name);
        let user2: User = <User> users.get(user2_name);

        //updating properties
        user1.state = "idle";
        user1.partner = "";
        user2.state = "idle";
        user2.partner = "";

        //message to user2
        socket.broadcast.to(user2.socketID).emit('cancel', user1_name);

        //message to all other users
        socket.broadcast.emit('usersIdle',{
            user1_name,
            user2_name
        });
    });
});