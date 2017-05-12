var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var connected_clients = new Array();
//var soc_room = {};
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});
io.on('connection', function(socket) {
	socket.on("login",function(username){
		var idx=connected_clients.indexOf(username);
		if (idx==-1) {
			connected_clients[username]=socket.id;
			socket.username=username;
			socket.emit("login",true);
		}
		else{
			socket.emit("login",false);
		}
	})
	socket.on("offer",function(username,offer){
		console.log("Sending offer to: ", username);
		var user=connected_clients[username];
		if(user!=null){
			socket.partner=username;
			socket.broadcast.to(user).emit("offer", socket.username,offer);
		}
		}) 
	socket.on("answer",function(username,answer){
		console.log("Sending answer to: ", username);
		var user=connected_clients[username];
		if(user!=null){
			socket.partner=username;
			socket.broadcast.to(user).emit("answer", socket.username,answer);
		}
		}) 
		
	socket.on("candidate",function(username,candidate){
		console.log("Sending candidate to: ", username);
		var user=connected_clients[username];
		if(user!=null){
			socket.partner=username;
			socket.broadcast.to(user).emit("candidate", socket.username,candidate);
		}
		}) 
	
	socket.on("disconnect",function(){
		if (socket.partner){
			if (socket.partner in connected_clients)
			{
			socket.broadcast.to(connected_clients[socket.partner]).emit("Partner disconnected");
			}
		}
		delete connected_clients[socket.username];
		}) 
	
});

http.listen(3001, '0.0.0.0', function() {
  console.log('listening on *:3001');
})

