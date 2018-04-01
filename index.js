let express = require('express');
let app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);

let socket = require('./lib/socket');

io.on('connection', socket.connectionHandler({
  'io': io
}));
app.use(express.static('public'));

const port = 3000;
http.listen(port, function() {
  console.log(`Started server on port ${port}`);
});
