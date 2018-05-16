let express = require('express');
const path = require('path');
let app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);

const rooms = {
  'lobby': []
};
io.on('connection', function(socket) {
  socket.join('lobby');
  socket.emit('you', socket.id);
  socket.emit('rooms', rooms);

  socket.on('room', function(room) {
    if (rooms[room]) {
      socket.emit('room exists');
    } else {
      socket.leave('lobby');
      socket.join(room);
      rooms[room] = [socket.id];
      socket.emit('room created');
      socket.broadcast.to('lobby').emit('new room', room);
    }
  });

  socket.on('join', function(room) {
    if (!rooms[room]) {
      socket.emit('room does not exist');
      return;
    }
    socket.leave('lobby');
    rooms[room].push(socket.id);
    socket.join(room);
    socket.emit('others', rooms[room]);
    socket.broadcast.to(room).emit('joined', socket.id);
  });

  socket.on('send', function(room, tag, buffer) {
    socket.broadcast.to(room).emit('broadcast', tag, buffer);
  });

  socket.on('disconnect', function() {
    for (let room of Object.keys(rooms)) {
      let roomMembers = rooms[room];
      for(let i = roomMembers.length - 1; i >= 0; i--) {
        if(roomMembers[i] === socket.id) {
           roomMembers.splice(i, 1);
        }
      }
    }
  });
});

app.use(express.static(path.join(__dirname, 'public')));

const port = 3000;
http.listen(port, function() {
  console.log(`Started websocket server on port ${port}`);
});
