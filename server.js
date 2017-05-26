var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var connected_clients = [];
//var soc_room = {};
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});




io.on('connection', function (socket) {
    socket.on("login", function (username) {
        var idx = connected_clients.indexOf(username);
        if (idx == -1) {
            connected_clients[username] = socket.id;
            socket.username = username;
            socket.emit("login", true);
            io.emit("update list", connected_clients)
        }
        // else {//not needed now as not implemented a handler on client side
        //   socket.emit("login", false);
        // }
    });
    socket.on("offer", function (username) { //currently not passed offer
        // remove socket.username form connected_clients
        // then emit list again
        console.log("Sending offer to: ", username);
        var user = connected_clients[username];
        if (user != null) {
            socket.partner = username;
            socket.broadcast.to(user).emit("offer", socket.username);//I THINK WE SHOULD NOT USE THE KEYWORK OFFER IE THE SAME THING AS THAT OF CLIENT MAKING AN OFFER IT SHOULD BE "OFFERgoingToPartner"

            //TO SEND SOMETHING TO BOTH THE USERS IE ONE GETS THE ACCEPT REJECT MODAL
            //THE OTHER GETS THE WAITING FOR CONFRIRMATION MODAL
        }
        //TO WRITE AN ELSE FUNCTIONLITY IE IF THE USERNAME IS NOT IN  THE LATEST LIST ANYMORE...
        //THEN TO SEND A SORRY MESSAGE
    });
    socket.on("answer", function (username, answer) {
        console.log("Sending answer to: ", username);
        // if answer is no add the username to connected_clients
        // then emit list again
        var user = connected_clients[username];
        if (user != null) {
            socket.partner = username;
            socket.broadcast.to(user).emit("answer", answer);
        }
    });

    socket.on("candidate", function (username, candidate) {
        console.log("Sending candidate to: ", username);
        var user = connected_clients[username];
        if (user != null) {
            socket.partner = username;
            socket.broadcast.to(user).emit("candidate", socket.username, candidate);
        }
    });

    socket.on("disconnect", function () {
        if (socket.partner) {
            if (socket.partner in connected_clients) {
                socket.broadcast.to(connected_clients[socket.partner]).emit("Partner disconnected");
            }
        }
        delete connected_clients[socket.username];
    })

http.listen(3001, '0.0.0.0', function () {
    console.log('listening on *:3001');
});


});
