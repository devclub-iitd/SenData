import debugLib from "debug";
import * as http from "http";
import * as SocketIO from "socket.io";
import { ExtendedSocket, User, Msg } from "../types";
import env from "./env";
import express from "./express";

const debug = debugLib("FileSend:Server");
const app: Express.Application = express();
const server = new http.Server(app);
const io: SocketIO.Server = SocketIO(server);
let status: number;

server.listen(env.PORT, (): void => {
  debug(`listening on *:${env.PORT}`);
});

// declaring a user map containing all users mapped from their socketIDs to their characteristics.
const users: Map<string, User> = new Map();

io.on("connection", (socket: ExtendedSocket): void => {
  const loginTheUser = (username: string): void => {
    // adding the username to the socket variable of the user
    socket.username = username;
    // if username already exists in the user map
    if (!users.has(username) && username !== "") {
      // initialising characteristics for logged user (updatable later)
      console.log(username + " connected to server"); // for dev purpose, remove later
      const val: User = {
        filesSendingState: "idle",
        inRequests: new Set(),
        outRequest: "",
        partner: "",
        socketID: socket.id,
        state: "idle",
      };
      // confirming user that its logged in
      socket.emit("isSuccessfulLogin", true, username);
      // sending users array to logged user without the new user
      const usersArray: [string, User][] = Array.from(users);
      socket.emit("login", usersArray);
      // sending the new logged user to all clients except sender
      socket.broadcast.emit("newUserLogin", {username, val});
      // @tmibvishal I changed status to usersArray because users should be sent to new client
      // mapping logged user to its characteristic values.
      users.set(username, val);
    } else {
      // rejecting user that its logged in
      socket.emit("isSuccessfulLogin", false);
    }
  };
  // Getting the username passed by client
  let uname: string = socket.handshake.query.username;
  uname = uname.substring(0, 14); // Shorten the username if it's too long
  // Logging the client into the server
  loginTheUser(uname);

  // disconnect event
  socket.on("disconnect", (): void => {
    // disconnected user username
    const disconnectedUser: string = socket.username;
    console.log("user disconnected " + disconnectedUser); // for dev
    // getting disconnected user properties
    const checkVal: User|undefined = users.get(disconnectedUser) ;
    if (checkVal !== undefined) {
      // if current disconnected user was paired to some user
      if (checkVal.partner !== "") {
        // characteristics of partner
        const changeVal: User|undefined = users.get(checkVal.partner) ;

        if (changeVal !== undefined) {
          // update properties of partner
          changeVal.state = "idle";
          changeVal.outRequest = "";
          changeVal.partner = "";
          // map updated properties of partner
          users.set(checkVal.partner, changeVal);
          // message sent to partner
          socket.broadcast.to(changeVal.socketID).emit(`PartnerDisconnected`);
        }
      }

      checkVal.inRequests.forEach((username: string): void => {
        const user = users.get(username);
        if (user) {
          user.state = "idle";
          socket.broadcast.emit("changeDataUserType", {
            username: username,
            newDataType: "idle",
          });
          io.to(user.socketID).emit("offeredUserDisconnected");
        }
      });

      // message to all connected clients
      io.emit("userDisconnected", disconnectedUser);
      // deleted socket (in any case)
      users.delete(disconnectedUser);
    }
  });

  // user1 requests user2 to connect
  socket.on("offer", (user2Name: string): void => {
    // get this user's username
    const user1Name: string = socket.username;
    // get properties of both users.
    const user1: User | undefined = users.get(user1Name) ;
    const user2: User | undefined = users.get(user2Name) ;

    if (user1 !== undefined && user2 !== undefined) {
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
        // offer request to all the other users (including user2 which will be overwritten by the next emit)
        socket.broadcast.emit("changeDataUserType", {
          username: user1Name,
          newDataType: "busy",
        });
        // offer event to user2
        socket.broadcast.to(user2.socketID).emit("changeDataUserType", {
          username: user1Name,
          newDataType: "Wants to connect",
        });
      }
    }
  });


  // user1 requests user2 to ignore offer
  socket.on("cancelOffer", (): void => {
    // get this user's username
    const user1Name: string = socket.username;
    // get properties of user1.
    const user1: User | undefined = users.get(user1Name) ;
    
    if (user1 !== undefined) {
      const user2Name: string = user1.outRequest;
      // get properties of user2.
      const user2: User | undefined = users.get(user2Name) ;
      if (user2 !== undefined) {
        if (user1.state === "waiting" && user2.inRequests.has(user1Name)) {
          // updated properties
          user1.outRequest = "";
          user1.state = "idle";
          user2.inRequests.delete(user1Name);
          // remap new properties
          users.set(user1Name, user1);
          users.set(user2Name, user2);
          // offer request to all the other users (including user2)
          socket.broadcast.emit("changeDataUserType", {
            username: user1Name,
            newDataType: "idle",
          });

          io.to(user2.socketID).emit("cancelOffer", user1Name);
        }
      }
    }
  });

  // answer event.. user2 answering user1
  socket.on("answer", (msg: {
    user1_name: string;
    answer: string;
  }): void => {
    // get usernames of both users
    const user2Name: string = socket.username;
    const user1Name: string = msg.user1_name;
    // get properties of both users
    const user1: User|undefined = users.get(user1Name) ;
    const user2: User|undefined = users.get(user2Name) ;

    if (user1 !== undefined && user2 !== undefined) {
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
        socket.broadcast.emit("changeDataUserType", {
          username: user1Name,
          newDataType: "idle",
        });
      } else if (ans === "y") {
        // updating partner properties of user1 and user2
        user2.partner = user1Name;
        user1.partner = user2Name;
        // updating status of both users to connected
        user1.state = "connected";
        user2.state = "connected";
        // rejecting all other requests of both users
        user1.inRequests.forEach( (key): void => {
          // get socketId of key
          const temp: User|undefined = users.get(key) ;
          if (temp !== undefined) {
            socket.broadcast.to(temp.socketID).emit("answer", "n");
            socket.broadcast.emit("changeDataUserType", {
              username: key,
              newDataType: "idle",
            });
          }
        });
        user1.inRequests.clear();
        user2.inRequests.forEach( (key): void => {
          // get socketId of key
          const temp: User|undefined = users.get(key) ;
          if (temp !== undefined && temp !== user1) {
            // sending no to all the inrequest users of user2 except user1
            socket.broadcast.to(temp.socketID).emit("answer", "n");
            socket.broadcast.emit("changeDataUserType", {
              username: key,
              newDataType: "idle",
            });
          }
        });
        user2.inRequests.clear();
        // remap new properties
        users.set(user1Name, user1);
        users.set(user2Name, user2);
        // users are been connected by now
        socket.broadcast.to(user1.socketID).emit("answer", ans);
        // sending to all users that user1 is busy
        socket.broadcast.emit("changeDataUserType", {
          username: user1Name,
          newDataType: "busy",
        });
        // sending to all users that user2 is busy
        socket.broadcast.emit("changeDataUserType", {
          username: user2Name,
          newDataType: "busy",
        });
      }
    }
  });

  // request for cancelling connection by either user
  socket.on("CancelConnection", (): void => {
    // get usernames of both users
    const user1Name: string = socket.username;
    // get properties of both users
    const user1: User|undefined = users.get(user1Name) ;

    if (user1 !== undefined) {
      const user2Name: string = user1.partner;  // enhancement by @tmibvishal accepted
      const user2: User|undefined = users.get(user2Name) ;

      if (user2 !== undefined) {
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
      }
    }
  });

  // ------------------------ Vishal code --------------------------------
  socket.on("message", (messageValue: string): void => {
    // Getting the user1
    const username1 = socket.username;
    const user1: User | undefined = users.get(username1);
    if (user1 !== undefined) {
      if (user1.state === "connected") {
        // Creating the new msg using the class Msg
        const msg = new Msg(username1, messageValue);
        // Getting the user2 (partner of user1)
        const username2 = user1.partner;
        const user2: User|undefined = users.get(username2) ;
        // Emitting the msg to user1 (sender)
        socket.emit("messageSentSuccess", msg);

        if (user2 !== undefined) {
          // Broadcasting the msg to user2 only
          socket.broadcast.to(user2.socketID).emit("messageIncoming", msg);
        }

      }
    }
  });

  socket.on("fileListSendRequest", (fileList: FileList): void => {
    // Getting the user1
    const username1 = socket.username;
    const user1: User | undefined = users.get(username1);
    if (user1 !== undefined) {
      if (user1.state === "connected") {
        if (user1.filesSendingState === "idle") {
          if (fileList.length > 0) {
            // file_list contains atleast 1 file
            user1.filesSendingState = "waiting";
            // Getting the user2 (partner of user1)
            const username2 = user1.partner;
            const user2: User|undefined = users.get(username2) ;

            if (user2 !== undefined) {
              // Broadcasting the msg to user2 only
              console.log("broadcasting filelist to user2");
              socket.broadcast.to(user2.socketID).emit("fileListSendRequest", fileList);
            }

          } else {
            // file_list contains no file
            // Emitting the msg to user1 (sender)
            socket.emit("fileListRequestAnswer", false);
          }
        }
      }
    }
  });

  socket.on("fileListRequestAnswer", (acceptedFilesAnswers: boolean[]): void => {
    const atleastOneFileAccepted = (answers: boolean[]): boolean => {
      for(let i = 0; i < answers.length; i++) {
        if(answers[i]) {
          return true;
        }
      }
      return false;
    };
    
    // Getting the user2
    const username2 = socket.username;
    const user2: User|undefined = users.get(username2);
    if (user2 !== undefined) {
      if (user2.state === "connected") {
        // Getting the user1 (partner of user2)
        const username1 = user2.partner;
        const user1: User | undefined = users.get(username1);
        if (user1 !== undefined) {
          if (user1.filesSendingState === "waiting") {
            if (atleastOneFileAccepted(acceptedFilesAnswers)) {
              user1.filesSendingState = "sending";
              user2.filesSendingState = "receiving";
              // Broadcasting the accepted:bool to user1 only
              socket.broadcast.to(user1.socketID).emit("fileListRequestAnswer", acceptedFilesAnswers);
              // Initiate the file sending process
              // ---------------------------------
            } else {
              user1.filesSendingState = "idle";
              user2.filesSendingState = "idle";
              // Broadcasting the accepted:bool to user1 only
              socket.broadcast.to(user1.socketID).emit("fileListRequestAnswer", acceptedFilesAnswers);
            }
          }
        }
      }
    }
  });

  /* Required by WebTorrent client */
  const user = users.get(socket.username);
  if (user === undefined) {
    console.log("Error: User object undefined for socket");
    return;
  }

  socket.on("fileReady", (magnetURI: string): void => {
    const partner = users.get(user.partner);
    if (partner === undefined) {
      console.log("Error: No partner of " + socket.username + " found");
      return;
    }
    const partnerSocket = socket.broadcast.to(partner.socketID);
    partnerSocket.emit("addTorrent", magnetURI);
  });

  socket.on("downloadClientReady", (): void => {
    const partner = users.get(user.partner);
    if (partner === undefined) {
      console.log("Error: No partner of " + socket.username + " found");
      return;
    }

    socket.on("downloadStarted", (): void => {
      socket.broadcast.to(partner.socketID).emit("downloadStarted");
    });

    socket.on("progressUpdate", (prog: {
      progress: number;
      progressFiles: number[];
      timeRemaining: number;
    }): void => {
      socket.broadcast.to(partner.socketID).emit("progressUpdate", prog);
    });

    socket.on("downloadComplete", (): void => {
      // TODO
      socket.broadcast.to(partner.socketID).emit("downloadComplete");
    });
  });
});