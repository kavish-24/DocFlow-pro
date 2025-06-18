const WebSocket = require('ws');

const setupWebSocket = (server) => {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    const documentId = req.url.split('/').pop();
    ws.documentId = documentId;
    console.log(`WebSocket client connected to document ${documentId}`);

    ws.on('message', (message) => {
      wss.clients.forEach(client => {
        if (client.documentId === documentId && client.readyState === WebSocket.OPEN) {
          client.send(message.toString());
        }
      });
    });

    ws.on('close', () => {
      console.log(`WebSocket client disconnected from document ${documentId}`);
    });
  });
};

module.exports = setupWebSocket;