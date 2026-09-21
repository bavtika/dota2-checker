const http = require('http');
const logger = require('./logger');

/**
 * Minimal HTTP server for container / Kubernetes probes.
 * Liveness: process is up. Readiness: bot finished launch.
 */
function createHealthServer({ port, getState }) {
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && (req.url === '/healthz' || req.url === '/livez')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (req.method === 'GET' && req.url === '/readyz') {
      const state = getState();
      const ready = Boolean(state.botReady);
      res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: ready ? 'ready' : 'starting',
          queueLength: state.queueLength,
        })
      );
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found' }));
  });

  server.listen(port, '0.0.0.0', () => {
    logger.info('Health server listening', { port });
  });

  return server;
}

module.exports = { createHealthServer };
