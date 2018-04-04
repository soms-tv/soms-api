let express = require('express');
let app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);

const rooms = {};
io.on('connection', function(socket) {
  socket.emit('you', socket.id);
  socket.emit('rooms', rooms);

  socket.on('room', function(room) {
    if (rooms[room]) {
      socket.emit('room exists');
    } else {
      socket.join(room);
      rooms[room] = true;
      socket.emit('room created');
    }
  });

  socket.on('join', function(room) {
    socket.join(room);
    socket.broadcast.to(room).emit('joined', socket.id);
  });

  socket.on('send', function(room, buffer) {
    socket.broadcast.to(room).emit('broadcast', buffer);
  });
});

const port = 3000;
http.listen(port, function() {
  console.log(`Started websocket server on port ${port}`);
});
