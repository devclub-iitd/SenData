var express = require('express'); // Get the module
var app = express(); // Create express by calling the prototype in var express
var http = require('http').Server(app);
var io = require('socket.io')(http);
var connected_clients = [];
var waiting_clients = [];
var logged_clients = [];
var offer_list = {};
//var soc_room = {};
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});
app.use('/css', express.static('css'));
app.use('/fonts', express.static('fonts'));
app.use('/images', express.static('images'));
app.use('/js', express.static('js'));




io.on('connection', function(socket) {

  socket.on("login", function(username) {
    if (!(username in connected_clients) && username !== "") {
      connected_clients[username] = socket.id;
      logged_clients[username] = socket.id;
      socket.username = username;
      console.log(username + " connected");
      socket.emit('login', true);
      io.sockets.emit('updateUsersList', Object.keys(connected_clients));
      offer_list[username] = [];
      // io.emit("update list", connected_clients);

    } else {
      socket.emit("login", false);
      //ask user for another username
    }

  });

  socket.on('disconnect', function(data) {
    if (socket.partner) {
      if (socket.partner in connected_clients) {
        socket.broadcast.to(connected_clients[socket.partner]).emit("PartnerDisconnected");
      }
    } else if (undefined != socket.username)
    // console.log(socket.username);
    {
      for (i = 0; i < offer_list[socket.username].length; i++) {
        socket.broadcast.to(waiting_clients[offer_list[socket.username][i]]).emit('answer', {
          answer: 'n'
        });
        //connected_clients[username] = waiting_clients[username];
        // if(username!=undefined){
        //   if (connected_clients[username] != undefined) {
        //     connected_clients[username] = waiting_clients[offer_list[socket.username][i]];
        //   } else {
        //     delete connected_clients[username];
        //     io.sockets.emit('updateUsersList', Object.keys(connected_clients));
        //   }
        // }

        delete waiting_clients[offer_list[socket.username][i]];
      }

      // io.sockets.emit('updateUsersList', Object.keys(connected_clients));

    }

    delete offer_list[socket.username];
    delete connected_clients[socket.username];
    delete logged_clients[socket.username];
    delete waiting_clients[socket.username];
    io.sockets.emit("updateUsersList", Object.keys(connected_clients));
    console.log(socket.username + " disconnected");
  });

  socket.on("offer", function(username) {
    // remove socket.username form connected_clients
    // then emit list again
    console.log("Sending offer to " + username + " from " + socket.username);
    if (offer_list[username] != undefined) {
      offer_list[username].push(socket.username);
      console.log(offer_list);
      var user = connected_clients[username];
      waiting_clients[socket.username] = socket.id;
      // console.log(username);
      delete connected_clients[socket.username];
      // console.log(connected_clients);
      io.sockets.emit('updateUsersList', Object.keys(connected_clients));

      if (waiting_clients[username] == null) { //if user is not in waiting list
        // socket.partner = username;
        console.log("Test username " + username);
        socket.broadcast.to(user).emit("offer", {
          username: socket.username,
          pid: socket.id
        }); //I THINK WE SHOULD NOT USE THE KEYWORD OFFER IE THE SAME THING AS THAT OF CLIENT MAKING AN OFFER IT SHOULD BE "OFFERgoingToPartner"

        //TO SEND SOMETHING TO BOTH THE USERS IE ONE GETS THE ACCEPT REJECT MODAL
        //THE OTHER GETS THE WAITING FOR CONFRIRMATION MODAL
      }
    } else {
      //imitate answer == 'n'


      socket.broadcast.to(socket.id).emit('answer', {
        answer: 'n'
      });
      //connected_clients[username] = waiting_clients[username];
      // connected_clients[username] = waiting_clients[username];
      delete offer_list[username];
      io.sockets.emit('updateUsersList', Object.keys(connected_clients));
      // if answer is no add the username to connected_clients
      // then emit list again


    }

    //TO WRITE AN ELSE FUNCTIONLITY IE IF THE USERNAME IS NOT IN  THE LATEST LIST ANYMORE...
    //THEN TO SEND A SORRY MESSAGE
  });

  socket.on("answer", function(msg) {
    username = msg.username;
    answer = msg.answer;
    console.log("Sending answer  '" + answer + "' to " + username + " from " + socket.username);

    if (answer === 'n') {
      socket.broadcast.to(waiting_clients[username]).emit('answer', {
        answer: answer
      });
      //connected_clients[username] = waiting_clients[username];
      connected_clients[username] = waiting_clients[username];
      delete waiting_clients[username];
      io.sockets.emit('updateUsersList', Object.keys(connected_clients));
      // if answer is no add the username to connected_clients
      // then emit list again
    } else {
      // console.log("answer : " + answer);
      console.log(waiting_clients);

      socket.partnerid = waiting_clients[username];
      socket.partner = username;


      socket.broadcast.to(waiting_clients[username]).emit('answer', {
        answer: answer,
        partner: socket.username,
        partnerid: socket.id
      });

      for (i = 0; i < offer_list[socket.username].length; i++) {

        if (waiting_clients[offer_list[socket.username][i]] != waiting_clients[username]) {
          socket.broadcast.to(waiting_clients[offer_list[socket.username][i]]).emit('answer', {
            answer: 'n'
          });
          //connected_clients[username] = waiting_clients[username];
          connected_clients[offer_list[socket.username][i]] = waiting_clients[offer_list[socket.username][i]];
          console.log("Adding " + offer_list[socket.username][i] + " to available clients");
          console.log(connected_clients);
          delete waiting_clients[offer_list[socket.username][i]];
        }
      }
      delete connected_clients[socket.username];
      delete connected_clients[username];
      io.sockets.emit('updateUsersList', Object.keys(connected_clients));
      console.log(connected_clients);
      socket.partner = username;
      socket.partnerid = waiting_clients[username];
      delete offer_list[socket.username];
    }

    //delete waiting_clients[username];
  });

  socket.on('cancel', function(target_username) {
    delete waiting_clients[socket.username];
    console.log(waiting_clients);
    connected_clients[socket.username] = socket.id;
    logged_clients[socket.username] = socket.id;
    io.sockets.emit('updateUsersList', Object.keys(connected_clients));
    socket.broadcast.to(connected_clients[target_username]).emit('cancel', socket.username, Object.keys(waiting_clients));
  });

  // var user = connected_clients[username];
  // if (user != null) {
  //   socket.partner = username;
  //   socket.broadcast.to(user).emit("answer", answer);
  // }
  // });
  //
  socket.on("candidate", function(msg) {
    username = msg.username;
    candidate = msg.candidate;
    var user = logged_clients[username];
    socket.partnerid = logged_clients[msg.username];

    console.log(username, socket.partnerid);
    if (user != null) {
      socket.partner = username;
      console.log("Sending candidate to: ", username);
      socket.broadcast.to(user).emit("candidate", candidate);
    }
  });

  socket.on("session-desc", function(msg) {
    username = msg.target;
    console.log("Sending session-desc to: ", username);
    var user = logged_clients[username];
    socket.broadcast.to(user).emit("session-desc", msg);
  });

  socket.on("file-desc", function(msg) {
    username = msg.target;
    fileData = msg.fileData;
    var user = logged_clients[username];
    if (user != null) {
      console.log("Sending file-desc to: ", username);
      socket.broadcast.to(user).emit("file-desc", fileData);
    }
  });

  socket.on("file accepted", function(username) {
    var user = logged_clients[username];
    if (user != null) socket.broadcast.to(user).emit("file accepted");
  });

  socket.on("file refused", function(username) {
    var user = logged_clients[username];
    if (user != null) socket.broadcast.to(user).emit("file refused");

  });

  socket.on("received-chunks", function(msg) {
    var user = logged_clients[msg.username];
    if (user != null) {
      socket.broadcast.to(user).emit("received-chunks", msg.progress);
      //  console.log("progress: "+msg.progress);
    }
  });
});

http.listen(3001, '0.0.0.0', function() {
  console.log('listening on *:3001');
});
