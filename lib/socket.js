module.exports = {
  connectionHandler: config => socket => {
    console.log('Received websocket connection');
    socket.emit('Hello World!');
  }
};
