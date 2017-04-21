var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var connected_clients = new Array();

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {

    socket.broadcast.emit('chat message', socket.id + ' connected');
    connected_clients[socket.id] = 1;
    // console.log(connected_clients);

    socket.on('chat message', function(msg) {
        socket.broadcast.emit('chat message', socket.id + ': ' + msg);
        console.log('message:' + msg);
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

http.listen(3001,'0.0.0.0', function() {
    console.log('listening on *:3001');
});
