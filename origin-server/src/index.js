const express = require('express');
const app = express();
const PORT = process.env.PORT || 4000;

app.get('/*', (req, res) => {
  const simulatedDelay = 1200; // 1.2s origin latency to demonstrate cache benefit
  const path = req.originalUrl;

  setTimeout(() => {
    res.json({
      source: 'ORIGIN_SERVER',
      path,
      timestamp: Date.now(),
      payload: `High compute response for: ${path}`
    });
  }, simulatedDelay);
});

app.listen(PORT, () => {
  console.log(`Origin Server running on port ${PORT}`);
});