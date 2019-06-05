import debugLib from "debug";
import * as http from "http";
import * as SocketIO from "socket.io";
import { IExtendedSocket, IUser, Msg } from "../types";
import env from "./env";
import express from "./express";

const debug = debugLib("FileSend:Server");
const app: Express.Application = express();
const server = new http.Server(app);
const io: SocketIO.Server = SocketIO(server);
let status: number;

server.listen(env.PORT, () => {
    debug(`listening on *:${env.PORT}`);
});

// using username property in typescript
// interface IExtendedSocket extends SocketIO.Socket{
//     username: string;
// }

// creating interface for different characteristics of a logged user
// interface added to ../Util.ts
// interface IUser {
//     socketID: string,
//     state: string,
//     outRequest: string,
//     partner: string,
//     inRequests: Set<string>
// }

// declaring a user map containing all users mapped from their soscketids to their characteristics.
const users: Map<string, IUser> = new Map();

// function to get username from socketID
// function getUname(socket_id: string): string {
//     for(let key of users.keys()){

//         let loopval = <IUser> users.get(key);

//         if(loopval.socketID === socket_id){
//             return key;
//         }
//     }

//     return "";
// }    not required for the time being

io.on("connection", (socket: IExtendedSocket) => {

    // ------------------------ anweshan code --------------------------------

    // login event
    socket.on("login", (username: string) => {

        // if username already exists in the user map
        if (users.has(username) || username === "") {
            status = 1;
        } else {
            // initialising characteristics for logged user(updatable later)
            const val: IUser = {
                filesSendingState: "idle",
                inRequests: {},
                outRequest: "",
                partner: "",
                socketID: socket.id,
                state: "idle",
            } as IUser;

            // mapping logged user to its characteristic values.
            users.set(username, val);

            // confirming user that its logged in
            status = 0;
            socket.emit("login", status);
        }
    });

    // disconnect event
    socket.on("disconnect", () => {

        // disconnected user username
        const disconnectedUser: string = socket.username;

        // getting disconnected user properties
        const checkVal: IUser = users.get(disconnectedUser) as IUser;

        // if current disconnected user was paired to some user
        if (checkVal.partner !== "") {

            // characteristics of partner
            const changeVal: IUser = users.get(checkVal.partner) as IUser;

            // update properties of partner
            changeVal.state = "idle";
            changeVal.outRequest = "";
            changeVal.partner = "";

            // map updated properties of partner
            users.set(checkVal.partner, changeVal);

            // message sent to partner
            socket.broadcast.to(changeVal.socketID).emit(`PartnerDisconnected`);
        }

        // message to all other users also
        socket.broadcast.emit("disconnect", disconnectedUser);

        // deleted socket (in any case)
        users.delete(disconnectedUser);
    });

    // user1 requests user2 to connect
    socket.on("offer", (user2Name: string) => {

        // get this user's username
        const user1Name: string = socket.username;

        // get properties of both users.
        const user1: IUser = users.get(user1Name) as IUser;
        const user2: IUser = users.get(user2Name) as IUser;

        if (user2.state === "waiting" || user2.state === "connected") {
            socket.emit("answer", "n");
        } else {
            // updated properties
            user1.outRequest = user2Name;
            user1.state = "waiting";
            user2.inRequests.add(user1Name);

            // remap new properties
            users.set(user1Name, user1);
            users.set(user2Name, user2);

            // offer event to user2
            socket.broadcast.to(user2.socketID).emit("offer", user1Name);

            // broadcast event to all other users
            socket.broadcast.emit("userRequested", {
                user1_name: user1Name,
                user2_name: user2Name,
            });
        }
    });

    // answer event.. user2 answering user1
    socket.on("answer", (msg: {
        user1_name: string,
        answer: string,
    }) => {

        // get usernames of both users
        const user2Name: string = socket.username;
        const user1Name: string = msg.user1_name;

        // get properties of both users
        const user1: IUser = users.get(user1Name) as IUser;
        const user2: IUser = users.get(user2Name) as IUser;

        // getting response of user2 to user1 as answer
        const ans: string = msg.answer;

        if (ans === "n") {

            // updating properties of user2
            // remove user1 from inRequest list of user2
            user2.inRequests.delete(user1Name);
            user1.state = "idle";
            user1.outRequest = "";

            // remap new properties
            users.set(user1Name, user1);
            users.set(user2Name, user2);

            // emit messages to user1 and all other users.
            socket.broadcast.to(user1.socketID).emit("answer", ans);
            socket.broadcast.emit("userRejected", {
                user1_name: user1Name,
                user2_name: user2Name,
            });
        } else {

            // updating partner properties of user1 and user2
            user2.partner = user1Name;
            user1.partner = user2Name;

            // updating status of both users to connected
            user1.state = "connected";
            user2.state = "connected";

            // rejecting all other requests of both users
            user1.inRequests.forEach( (key) => {
                // get socketId of key
                const temp: IUser = users.get(key) as IUser;

                socket.broadcast.to(temp.socketID).emit("answer", "n");
            });

            user1.inRequests.clear();

            user1.inRequests.forEach( (key) => {

                // get socketId of key
                const temp: IUser = users.get(key) as IUser;

                socket.broadcast.to(temp.socketID).emit("answer", "n");
            });

            user2.inRequests.clear();

            // remap new properties
            users.set(user1Name, user1);
            users.set(user2Name, user2);

        }

    });

    // request for cancelling connection by either user
    socket.on("CancelConnection", (user2Name: string) => {

        // get usernames of both users
        const user1Name: string = socket.username;

        // get properties of both users
        const user1: IUser = users.get(user1Name) as IUser;
        const user2: IUser = users.get(user2Name) as IUser;

        // updating properties
        user1.state = "idle";
        user1.partner = "";
        user2.state = "idle";
        user2.partner = "";

        // message to user2
        socket.broadcast.to(user2.socketID).emit("cancel", user1Name);

        // message to all other users
        socket.broadcast.emit("usersIdle", {
            user1_name: user1Name,
            user2_name: user2Name,
        });
    });

    // ------------------------ Vishal code --------------------------------
    socket.on("message", (messageValue: string) => {
        // Getting the user1
        const username1 = socket.username;
        const user1: IUser = users.get(username1) as IUser;
        if (user1.state === "connected") {
            // Creating the new msg using the class Msg
            const msg = new Msg(username1, messageValue);
            // Getting the user2 (partner of user1)
            const username2 = user1.partner;
            const user2: IUser = users.get(username2) as IUser;
            // Emitting the msg to user1 (sender)
            socket.emit("message", msg);
            // Broadcasting the msg to user2 only
            socket.broadcast.to(user2.socketID).emit("message", msg);
        }
    });

    socket.on("fileListSendRequest", (fileList: FileList) => {
        // Getting the user1
        const username1 = socket.username;
        const user1: IUser = users.get(username1) as IUser;
        if (user1.state === "connected") {
            if (user1.filesSendingState === "idle") {
                if (fileList.length > 0) {
                    // file_list contains atleast 1 file
                    user1.filesSendingState = "waiting";
                    // Getting the user2 (partner of user1)
                    const username2 = user1.partner;
                    const user2: IUser = users.get(username2) as IUser;
                    // Broadcasting the msg to user2 only
                    socket.broadcast.to(user2.socketID).emit("fileListSendRequest", fileList);
                } else {
                    // file_list contains no file
                    // Emitting the msg to user1 (sender)
                    socket.emit("fileListRequestAnswer", false);
                }
            }
        }
    });

    socket.on("fileListRequestAnswer", (accepted: boolean) => {
        // Getting the user2
        const username2 = socket.username;
        const user2: IUser = users.get(username2) as IUser;
        if (user2.state === "connected") {
            // Getting the user1 (partner of user2)
            const username1 = user2.partner;
            const user1: IUser = users.get(username1) as IUser;
            if (user1.filesSendingState === "waiting") {
                if (accepted) {
                    user1.filesSendingState = "sending";
                    user2.filesSendingState = "receiving";
                    // Broadcasting the accepted:bool to user1 only
                    socket.broadcast.to(user1.socketID).emit("fileListRequestAnswer", accepted);
                    // Initiate the file sending process
                    // ---------------------------------
                } else {
                    user1.filesSendingState = "idle";
                    user2.filesSendingState = "idle";
                    // Broadcasting the accepted:bool to user1 only
                    socket.broadcast.to(user1.socketID).emit("fileListRequestAnswer", accepted);
                }
            }
        }
    });

});
