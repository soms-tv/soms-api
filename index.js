const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'debug',
  transports: [
    new winston.transports.Console()
  ]
});

const server = new https.createServer({
  cert: fs.readFileSync('cert.pem'),
  key: fs.readFileSync('key.pem')
});

const wss = new WebSocket.Server({ 'server': server });

const roomExpiryAfterLastHeartbeatMilliseconds = 1000 * 30;
const pingIntervalMilliseconds = 1000 * 30;

const rooms = {};

function createRoom(name, password, creatorSocket) {
  if (rooms[name] !== undefined) {
    throw new Error('Room already exists');
  }
  if (creatorSocket.room) {
    throw new Error('Websocket already member of room');
  }
  rooms[name] = {
    'sockets': [creatorSocket],
    'password': password,
    'expire': Date.now() + roomExpiryAfterLastHeartbeatMilliseconds
  };
}

function sendRoom(ws, message) {
  if (!ws.room) {
    throw new Error('Sender not member of room');
  }
  for (let socket of ws.room.sockets) {
    if (socket !== ws) {
      socket.send(message);
    }
  }
}

function joinRoom(room, socket, password) {
  if (room.sockets.indexOf(socket) !== -1) {
    throw new Error('Socket already in room');
  }
  if (room.password !== password) {
    throw new Error('Wrong password');
  }
  room.sockets.push(socket);
  socket.room = room;
}

function leaveRoom(socket) {
  if (socket.room) {
    const index = socket.room.sockets.indexOf(socket);
    if (index > -1) {
      socket.room.sockets.splice(index, 1);
      socket.room = undefined;
      return true;
    }
  }
  return false;
}

const messageHandlers = {
  'soms-key': function(ws, req) {
    logger.debug('key: ' + req.key);

    if (true) {
      ws.authenticated = true;
      ws.send('soms accept');
    } else {
      ws.send('soms deny');
    }
  },
  'create-room': function(ws, req) {
    if (!req.name || req.name.length === 0) {
      return;
    }
    if (req.password === null || req.password === undefined) {
      return;
    }
    try {
      createRoom(req.name, req.password, ws);
      ws.send('room created');
    } catch (err) {
      logger.error(err.message);
    }
  },
  'join-room': function(ws, req) {
    const room = rooms[req.name];
    if (!room) {
      return;
    }
    try {
      joinRoom(room, ws, req.password);
      ws.send('room joined');
    } catch (err) {
      logger.error(err.message);
      if (err.message === 'Wrong password') {
        ws.send('wrong room password');
      }
    }
  }
};

function heartbeat() {
  this.isAlive = true;
  if (this.room) {
    this.room.expire = Date.now() + roomExpiryAfterLastHeartbeatMilliseconds;
  }
}

wss.on('connection', function(ws) {
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  ws.on('message', function(message) {
    logger.debug('received: ' + message);
    if (typeof message === 'string') {
      const split = message.indexOf(': ');
      if (split === -1) {
        return;
      }
      const keyword = message.substring(0, split);
      const data = message.substring(split + 2);

      if (!ws.authenticated && keyword !== 'soms-key') {
        logger.debug('bad keyword from unauthenticated socket');
        ws.terminate();
        return;
      }
      if (messageHandlers[keyword]) {
        try {
          messageHandlers[keyword](ws, JSON.parse(data));
        } catch (err) {
          logger.error(err.message);
        }
      }
    } else {
      // Binary data always goes to the socket's room
      if (ws.room) {
        sendRoom(ws, message);
      }
    }
  });

  ws.on('close', function() {
    leaveRoom(ws);
    logger.debug('socket disconnected');
  });

  ws.send('soms requesting key');
});

setInterval(function() {
  wss.clients.forEach(function(ws) {
    if (ws.isAlive === false) {
      leaveRoom(ws);
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping(() => {});
  });
}, pingIntervalMilliseconds);

setInterval(function() {
  for (let roomName of Object.keys(rooms)) {
    const room = rooms[roomName];
    if (Date.now() > room.expire) {
      room.sockets.forEach(leaveRoom);
      delete rooms[roomName];
    }
  }
}, roomExpiryAfterLastHeartbeatMilliseconds);

server.listen(8080);
