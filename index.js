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

const somsKeyPrefixLength = 'soms-key: '.length;
wss.on('connection', function(ws) {
  ws.on('message', function(message) {
    logger.debug('received: ' + message);
    if (typeof message === 'string') {
      if (message.indexOf('soms-key: ') === 0) {
        const key = message.slice(somsKeyPrefixLength);

        logger.debug('key: ' + key);

        ws.send('soms accept')
      }
    } else {

    }
  });

  ws.send('soms requesting key');
});

server.listen(8080);
