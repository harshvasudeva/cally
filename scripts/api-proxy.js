// Tiny HTTP proxy: external Emergent ingress sends /api/* → port 8001;
// we forward those requests to the Next.js dev server on port 3000.
// All requests (not just /api/*) are forwarded so Cally remains reachable
// even if a future ingress rule changes.

const http = require('node:http');
const { URL } = require('node:url');

const PORT = parseInt(process.env.PROXY_PORT || '8001', 10);
const UPSTREAM = process.env.UPSTREAM || 'http://127.0.0.1:3000';
const upstreamUrl = new URL(UPSTREAM);

const server = http.createServer((req, res) => {
  const opts = {
    hostname: upstreamUrl.hostname,
    port: upstreamUrl.port || 80,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `${upstreamUrl.hostname}:${upstreamUrl.port}` },
  };

  const proxyReq = http.request(opts, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('[api-proxy] upstream error', err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Upstream unavailable', detail: err.message }));
    } else {
      res.destroy();
    }
  });

  req.pipe(proxyReq, { end: true });
});

server.on('upgrade', (req, socket, head) => {
  const opts = {
    hostname: upstreamUrl.hostname,
    port: upstreamUrl.port || 80,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `${upstreamUrl.hostname}:${upstreamUrl.port}` },
  };
  const proxyReq = http.request(opts);
  proxyReq.on('upgrade', (proxyRes, proxySocket) => {
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\n` +
        Object.entries(proxyRes.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\r\n') +
        `\r\n\r\n`,
    );
    proxySocket.pipe(socket).pipe(proxySocket);
  });
  proxyReq.on('error', () => socket.destroy());
  proxyReq.end();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[api-proxy] forwarding 0.0.0.0:${PORT} → ${UPSTREAM}`);
});
