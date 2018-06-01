const express = require('express'); // Get the module,

const app = express(); // Create express by calling the prototype in var express,
const http = require('http').Server(app);
const io = require('socket.io')(http);

const connectedClients = [];
const waitingClients = [];
const loggedClients = [];
const offerList = {};
let status;

const PORT = process.env.PORT || 7000;

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});
app.use('/css', express.static('css'));
app.use('/fonts', express.static('fonts'));
app.use('/images', express.static('images'));
app.use('/js', express.static('js'));

http.listen(PORT, '0.0.0.0', () => {
  console.log(`listening on *:${PORT}`);
});

io.on('connection', (socket) => {
  socket.on('login', (username) => {
    if (!(username in connectedClients) && username !== '') {
      connectedClients[username] = socket.id;
      loggedClients[username] = socket.id;
      socket.username = username;
      console.log(`${username} connected`);
      socket.emit('login', 0);
      io.sockets.emit('updateUsersList', Object.keys(connectedClients));
      offerList[username] = [];
    } else {
      if (username === '') status = 2;
      else status = 1;
      socket.emit('login', status);
    }
  });

  socket.on('disconnect', (data) => {
    // console.log(socket.partner);
    if (socket.partner) {
      if (socket.partner in loggedClients) {
        socket.broadcast.to(loggedClients[socket.partner]).emit('PartnerDisconnected');
        // console.log("Sent message to other user");
        connectedClients[socket.partner] = socket.partnerid;
        io.sockets.emit('updateUsersList', Object.keys(connectedClients));
      }
    } else if (undefined !== socket.username) {
      if (offerList[socket.username] !== undefined) {
        for (let i = 0; i < offerList[socket.username].length; i += 1) {
          socket.broadcast.to(waitingClients[offerList[socket.username][i]]).emit('answer', {
            answer: 'n',
          });
          delete waitingClients[offerList[socket.username][i]];
        }
      }
    }

    delete offerList[socket.username];
    delete connectedClients[socket.username];
    delete loggedClients[socket.username];
    delete waitingClients[socket.username];
    io.sockets.emit('updateUsersList', Object.keys(connectedClients));
  });

  socket.on('offer', (username) => {
    // remove socket.username form connected_clients
    // then emit list again
    // console.log("Sending offer to " + username + " from " + socket.username);
    if (offerList[username] !== undefined) {
      offerList[username].push(socket.username);
      const user = connectedClients[username];
      waitingClients[socket.username] = socket.id;
      delete connectedClients[socket.username];
      io.sockets.emit('updateUsersList', Object.keys(connectedClients));
      if (waitingClients[username] == null) { // if user is not in waiting list
        // console.log("Test username " + username);
        socket.broadcast.to(user).emit('offer', {
          username: socket.username,
          pid: socket.id, // the name and id of the user who sent the request
        });
      }
    } else if (loggedClients[username] === undefined) {
      // imitate answer == 'n'
      socket.broadcast.to(socket.id).emit('answer', {// this broadcasts to the user who is requesting with an immediate message no as there is no such user logged in which he is requesting
        answer: 'n',
      });
      delete offerList[username];
      io.sockets.emit('updateUsersList', Object.keys(connectedClients));
      // if answer is no add the username to connected_clients
      // then emit list again
    } else {
      offerList[username] = [];
      offerList[username].push(socket.username);
      const user = connectedClients[username];
      waitingClients[socket.username] = socket.id;
      delete connectedClients[socket.username];
      io.sockets.emit('updateUsersList', Object.keys(connectedClients));
      if (waitingClients[username] == null) { // if user is not in waiting list
        // console.log("Test username " + username);
        socket.broadcast.to(user).emit('offer', {
          username: socket.username,
          pid: socket.id,
        });
      }
    }
  });

  socket.on('answer', (msg) => {
    const { username, answer } = msg;
    // console.log("Sending answer  '" + answer + "' to " + username + " from " + socket.username);
    if (answer === 'n') {
      socket.broadcast.to(waitingClients[username]).emit('answer', {
        answer,
      });
      connectedClients[username] = waitingClients[username];
      delete waitingClients[username];
      io.sockets.emit('updateUsersList', Object.keys(connectedClients));
      if (offerList[socket.username] != undefined) {
        offerList[socket.username].splice(offerList[socket.username].indexOf(username), 1);
      }
      // if answer is no add the username to connected_clients
      // then emit list again
    } else {
      socket.partnerid = waitingClients[username];
      socket.partner = username;
      socket.broadcast.to(waitingClients[username]).emit('answer', {
        answer,
        partner: socket.username,
        partnerid: socket.id,
      });
      if (offerList[socket.username] !== undefined) {
        for (let i = 0; i < offerList[socket.username].length; i += 1) {
          if (waitingClients[offerList[socket.username][i]] !== waitingClients[username]) {
            socket.broadcast.to(waitingClients[offerList[socket.username][i]]).emit('answer', {
              answer: 'n',
            });
            connectedClients[offerList[socket.username][i]] =
            waitingClients[offerList[socket.username][i]];
            // console.log("Adding " + offer_list[socket.username][i] + " to available clients");
            // console.log(connected_clients);
            delete waitingClients[offerList[socket.username][i]];
          }
        }
      }
      if (offerList[username] !== undefined) {
        for (let i = 0; i < offerList[username].length; i += 1) {
          socket.broadcast.to(waitingClients[offerList[username][i]]).emit('answer', {
            answer: 'n',
          });
          connectedClients[offerList[username][i]] = waitingClients[offerList[username][i]];
          // console.log("Adding " + offer_list[username][i] + " to available clients");
          // console.log(connected_clients);
          delete waitingClients[offerList[username][i]];
        }
      }
      delete connectedClients[socket.username];
      delete connectedClients[username];
      io.sockets.emit('updateUsersList', Object.keys(connectedClients));
      console.log(connectedClients);
      socket.partner = username;
      socket.partnerid = waitingClients[username];
      delete offerList[socket.username];
      delete offerList[username];
    }
  });

  socket.on('cancel', (targetUsername) => {
    delete waitingClients[socket.username];

    if (offerList[targetUsername] !== undefined) {
      offerList[targetUsername] = removeA(offerList[targetUsername], socket.username);
    }
    const temp = console.log(`Target Username :${targetUsername}`);
    // console.log("Offer List :" + offer_list[target_username]);

    connectedClients[socket.username] = socket.id;
    loggedClients[socket.username] = socket.id;

    io.sockets.emit('updateUsersList', Object.keys(connectedClients));

    socket.broadcast.to(loggedClients[targetUsername]).emit('cancel', offerList[targetUsername]);
  });

  socket.on('candidate', (msg) => {
    const { username, candidate } = msg;
    const user = loggedClients[username];
    socket.partnerid = loggedClients[msg.username];

    // console.log(username, socket.partnerid);
    if (user != null) {
      socket.partner = username;
      // console.log("Sending candidate to: ", username);
      socket.broadcast.to(user).emit('candidate', candidate);
    }
  });

  socket.on('session-desc', (msg) => {
    const username = msg.target;
    // console.log("Sending session-desc to: ", username);
    const user = loggedClients[username];
    socket.broadcast.to(user).emit('session-desc', msg);
  });

  socket.on('file-desc', (msg) => {
    const username = msg.target;
    const { fileData } = msg;
    const user = loggedClients[username];
    if (user != null) {
      console.log('Sending file-desc to: ', username);
      socket.broadcast.to(user).emit('file-desc', fileData);
    }
  });

  socket.on('file accepted', (data) => {
    const username = data.target;
    const user = loggedClients[username];
    if (user != null) socket.broadcast.to(user).emit('file accepted', data);//
  });

  socket.on('status', (data) => {
    const username = data.from;
    const user = loggedClients[username];
    socket.broadcast.to(user).emit('status', data);
  });
  socket.on('file refused', (username) => {
    const user = loggedClients[username];
    if (user != null) socket.broadcast.to(user).emit('file refused');
  });

  socket.on('received-chunks', (msg) => {
    const user = loggedClients[msg.username];
    if (user != null) {
      socket.broadcast.to(user).emit('received-chunks', msg.progress);
      //  console.log("progress: "+msg.progress);
    }
  });

  socket.on('Cancel Connection', (username) => { // This function hears for "cancel connection" from any ot the two users
    const user = loggedClients[username];
    if (user != null) socket.broadcast.to(user).emit('Cancel Connection');

    connectedClients[socket.username] = socket.id;
    connectedClients[username] = loggedClients[username];

    // These 4 statements are just a precaution to prevent breaking.

    delete waitingClients[socket.username];
    delete waitingClients[username];
    delete offerList[socket.username];
    delete offerList[username];

    io.sockets.emit('updateUsersList', Object.keys(connectedClients));
  });

  // message handler
  socket.on('message', (msg) => {
    socket.broadcast.to(msg.socket).emit('message', msg);

    // console.log("message");
  });

  socket.on('typing', (msg) => {
    socket.broadcast.to(msg.socket).emit('typing', msg.username);
  });
});


function removeA(arr) {
  let what;
  let a = arguments;
  let L = a.length;
  let ax;
  while (L > 1 && arr.length) {
    what = a[--L];
    while ((ax = arr.indexOf(what)) !== -1) {
      arr.splice(ax, 1);
    }
  }
  return arr;
}

