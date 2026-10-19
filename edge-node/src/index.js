const express = require('express');
const http = require('http');
const cors = require('cors');
const axios = require('axios');
const { redis, redlock } = require('./redis');
const coalescer = require('./coalescing');
const { initTelemetry, emitMetrics } = require('./telemetry');

const app = express();
const server = http.createServer(app);
initTelemetry(server);

app.use(cors());

const PORT = process.env.PORT || 5001;
const NODE_ID = process.env.NODE_ID || 'edge-default';
const ORIGIN_URL = process.env.ORIGIN_URL || 'http://origin-server:4000';
const CACHE_TTL_SECONDS = 30;

// Health endpoint for gateway health checks
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

app.get('/*', async (req, res) => {
  const startTime = Date.now();
  const cacheKey = `cache:${req.originalUrl}`;
  const lockKey = `locks:${req.originalUrl}`;

  try {
    // 1. Check Redis Cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      const latency = Date.now() - startTime;
      emitMetrics({ nodeId: NODE_ID, path: req.originalUrl, status: 'HIT', latency });
      return res.json({ ...JSON.parse(cached), edge: NODE_ID, cache: 'HIT', latencyMs: latency });
    }

    // 2. Request Coalescing
    const data = await coalescer.execute(req.originalUrl, async () => {
      const secondCheck = await redis.get(cacheKey);
      if (secondCheck) return JSON.parse(secondCheck);

      let lock = null;
      try {
        lock = await redlock.acquire([lockKey], 3000);
        
        const thirdCheck = await redis.get(cacheKey);
        if (thirdCheck) return JSON.parse(thirdCheck);

        const response = await axios.get(`${ORIGIN_URL}${req.originalUrl}`);
        await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(response.data));
        return response.data;
      } catch (lockErr) {
        // Fallback: if lock fails or is contended, wait and retry cache, or fetch origin directly
        await new Promise((resolve) => setTimeout(resolve, 300));
        const postLockData = await redis.get(cacheKey);
        if (postLockData) return JSON.parse(postLockData);

        const fallback = await axios.get(`${ORIGIN_URL}${req.originalUrl}`);
        return fallback.data;
      } finally {
        if (lock) {
          try { await lock.release(); } catch (_) {}
        }
      }
    });

    const latency = Date.now() - startTime;
    emitMetrics({ nodeId: NODE_ID, path: req.originalUrl, status: 'MISS', latency });
    return res.json({ ...data, edge: NODE_ID, cache: 'MISS', latencyMs: latency });
  } catch (err) {
    console.error(`[${NODE_ID}] Handler Exception:`, err.message);
    return res.status(500).json({ error: err.message, edge: NODE_ID });
  }
});

server.listen(PORT, () => {
  console.log(`Edge Node [${NODE_ID}] online on port ${PORT}`);
});