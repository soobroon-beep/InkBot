const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // Serve inkbot.html for any request
  const filePath = path.join(__dirname, 'inkbot.html');
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('inkbot.html not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`INKBOT PRO corriendo en puerto ${PORT}`);
});
