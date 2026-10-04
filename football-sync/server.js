import http from 'node:http';

const PORT = Number(process.env.PORT || 8080);

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      ok: true,
      service: 'VYBET Football Sync'
    }));
    return;
  }

  res.writeHead(200);
  res.end(JSON.stringify({
    ok: true,
    service: 'VYBET Football Sync',
    status: 'ready'
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`VYBET Football Sync listening on port ${PORT}`);
});
