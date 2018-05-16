let express = require('express');
const path = require('path');
let app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);

const rooms = {
  'lobby': true
};
io.on('connection', function(socket) {
  socket.join('lobby');
  socket.emit('you', socket.id);
  socket.emit('rooms', rooms);

  socket.on('room', function(room) {
    if (rooms[room]) {
      socket.emit('room exists');
    } else {
      socket.join(room);
      rooms[room] = true;
      socket.emit('room created');
      socket.broadcast.to('lobby').emit('new room', room);
    }
  });

  socket.on('join', function(room) {
    socket.leave('lobby');
    socket.join(room);
    socket.broadcast.to(room).emit('joined', socket.id);
  });

  socket.on('send', function(room, buffer) {
    socket.broadcast.to(room).emit('broadcast', buffer);
  });
});

app.use(express.static(path.join(__dirname, 'public')));

const port = 3000;
http.listen(port, function() {
  console.log(`Started websocket server on port ${port}`);
});
