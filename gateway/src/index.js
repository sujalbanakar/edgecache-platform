const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const ConsistentHash = require('./consistent-hash');

const app = express();
const PORT = process.env.PORT || 8080;
const configuredNodes = (process.env.EDGE_NODES || 'http://localhost:5001').split(',');

const ring = new ConsistentHash(configuredNodes);
const healthyNodes = new Set(configuredNodes);

// Background health checker using native fetch
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
        console.warn(`[HealthCheck] Node failure detected: ${node}. Pruning from hash ring.`);
        healthyNodes.delete(node);
        ring.removeNode(node);
      }
    }
  }
}, 3000);

app.use('/', (req, res, next) => {
  const targetNode = ring.getNode(req.originalUrl);

  if (!targetNode) {
    return res.status(503).json({ error: 'All edge nodes are unavailable' });
  }

  createProxyMiddleware({
    target: targetNode,
    changeOrigin: true,
    onError: (err, pReq, pRes) => {
      console.error(`Proxy error to ${targetNode}:`, err.message);
      pRes.status(502).json({ error: 'Edge gateway upstream failure' });
    }
  })(req, res, next);
});

app.listen(PORT, () => {
  console.log(`Gateway active with health checking on port ${PORT}`);
});