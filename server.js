var express = require('express'); // Get the module
var app = express(); // Create express by calling the prototype in var express
var http = require('http').Server(app);
var io = require('socket.io')(http);
var connected_clients = [];
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
            socket.username = username;
            console.log(username + " connected");
            socket.emit('login', true);
            io.sockets.emit('updateUsersList',Object.keys(connected_clients));
            // io.emit("update list", connected_clients);

        }
        else {
            socket.emit("login", false);
            //ask user for another username
        }

    });

    socket.on('disconnect',function(data){
        if (socket.partner) {
            if (socket.partner in connected_clients) {
                socket.broadcast.to(connected_clients[socket.partner]).emit("PartnerDisconnected");
            }
        }
        delete connected_clients[socket.username];
        io.sockets.emit("updateUsersList", Object.keys(connected_clients));
        console.log(socket.username + " disconnected");
    });

    // socket.on("offer", function (username) { //currently not passed offer
    //     // remove socket.username form connected_clients
    //     // then emit list again
    //     console.log("Sending offer to: ", username);
    //     var user = connected_clients[username];
    //     if (user != null) {
    //         socket.partner = username;
    //         socket.broadcast.to(user).emit("offer", socket.username);//I THINK WE SHOULD NOT USE THE KEYWORK OFFER IE THE SAME THING AS THAT OF CLIENT MAKING AN OFFER IT SHOULD BE "OFFERgoingToPartner"
    //
    //         //TO SEND SOMETHING TO BOTH THE USERS IE ONE GETS THE ACCEPT REJECT MODAL
    //         //THE OTHER GETS THE WAITING FOR CONFRIRMATION MODAL
    //     }
    //     //TO WRITE AN ELSE FUNCTIONLITY IE IF THE USERNAME IS NOT IN  THE LATEST LIST ANYMORE...
    //     //THEN TO SEND A SORRY MESSAGE
    // });
    // socket.on("answer", function (msg) {
    //     username=msg.username;
    //     answer=msg.answer;
    //     console.log("Sending answer to: ", username);
    //     // if answer is no add the username to connected_clients
    //     // then emit list again
    //     var user = connected_clients[username];
    //     if (user != null) {
    //         socket.partner = username;
    //         socket.broadcast.to(user).emit("answer", answer);
    //     }
    // });
    //
    // socket.on("candidate", function (msg) {
    //     username=msg.username;
    //     candidate=msg.candidate;
    //     console.log("Sending candidate to: ", username);
    //     var user = connected_clients[username];
    //     if (user != null) {
    //         socket.partner = username;
    //         socket.broadcast.to(user).emit("candidate", candidate);
    //     }
    // });
    //
    // socket.on("session-desc",function (msg) {
    //     username=msg.target;
    //     var user=connected_clients
    //     socket.broadcast.to(user).emit("session-desc",msg);
    // });
});

http.listen(3001, '0.0.0.0', function() {
    console.log('listening on *:3001');
});
