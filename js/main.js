$(function() {
  var username = prompt('Enter name:');
  var socket = io();
  socket.emit('add user', username);
  var flag = 0;
  // var room = prompt("enter room name");
});
