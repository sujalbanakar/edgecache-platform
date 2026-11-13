const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const ConsistentHash = require('./consistent-hash');

const app = express();
const PORT = process.env.PORT || 8080;
const configuredNodes = (process.env.EDGE_NODES || 'http://localhost:5001')
  .split(',')
  .map((n) => n.trim())
  .filter(Boolean); 

const ring = new ConsistentHash(configuredNodes);
const healthyNodes = new Set(configuredNodes);

// Active health check: polls every 2 seconds
setInterval(async () => {
  for (const node of configuredNodes) {
    try {
      const res = await fetch(`${node}/healthz`, { signal: AbortSignal.timeout(1000) });
      if (res.ok && !healthyNodes.has(node)) {
        console.log(`[HealthCheck] Node recovered: ${node}. Re-adding to hash ring.`);
        healthyNodes.add(node);
        ring.addNode(node);
      }
    } catch {
      if (healthyNodes.has(node)) {
        console.warn(`[HealthCheck] Node down: ${node}. Pruning from hash ring.`);
        healthyNodes.delete(node);
        ring.removeNode(node);
      }
    }
  }
}, 2000);

function handleProxy(req, res, next, retries = configuredNodes.length) {
  const targetNode = ring.getNode(req.originalUrl);

  if (!targetNode) {
    return res.status(503).json({ error: 'All edge nodes are unavailable' });
  }

  const onProxyError = (err, pReq, pRes) => {
    console.warn(`[Failover] ${targetNode} failed (${err.code || err.message}). Pruning & retrying...`);
    healthyNodes.delete(targetNode);
    ring.removeNode(targetNode);

    if (retries > 1 && !pRes.headersSent) {
      return handleProxy(req, res, next, retries - 1);
    }

    if (!pRes.headersSent) {
      pRes.status(503).json({ error: 'All edge nodes are unavailable' });
    }
  };

  createProxyMiddleware({
    target: targetNode,
    changeOrigin: true,
    onError: onProxyError,         // Support http-proxy-middleware v2
    on: { error: onProxyError }    // Support http-proxy-middleware v3
  })(req, res, next);
}

app.use('/', (req, res, next) => handleProxy(req, res, next));

app.listen(PORT, () => {
  console.log(`Gateway active on port ${PORT} with nodes:`, configuredNodes);
});