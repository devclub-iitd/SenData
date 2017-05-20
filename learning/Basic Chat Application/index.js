var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var connected_clients = [];
var numUsers = 0;
var rooms = ['room1', 'room2', 'room3'];
var soc_room = {};
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {

  socket.on('add user', function(username) {
    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    addedUser = true;
    io.to(socket.id).emit('list', rooms);
    // echo globally (all clients) that a person has connected
  });
  socket.on('join', function(room) {
    rooms.push(room); //add code to add only if not already present
    // console.log('hi');
    // console.log(room);
    // console.log(rooms);
    soc_room[socket.username] = room;
    socket.join(room, function(room) {
      // console.log(socket.rooms); // [ <socket.id>, 'room 237' ]
    });
    console.log(socket.username + ' joined room ' + room);
    io.to(room).emit('new', 'a new user has joined the room'); // broadcast to everyone in the room

  });
  socket.broadcast.emit('chat message', socket.id + ' connected');
  connected_clients[socket.id] = 1;
  // console.log(connected_clients);

  socket.on('chat message', function(msg) {
    // socket.broadcast.emit('chat message', socket.id + ': ' + msg);
    // io.to('1').broadcast.emit(msg);
    console.log('message:' + msg);
    io.to('room 237').emit('chat message', msg);
  });

  socket.on('new online', function(numm) {
    io.emit('num online reply', Object.keys(connected_clients).length);
  });

  socket.on('disconnect', function() {
    io.emit('chat message', socket.id + ' Left');
    delete connected_clients[socket.id];
    io.emit('num online reply', Object.keys(connected_clients).length);
  })
});

http.listen(3001, '0.0.0.0', function() {
  console.log('listening on *:3001');
});
