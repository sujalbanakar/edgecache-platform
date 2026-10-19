const { Server } = require('socket.io');

let io = null;

function initTelemetry(server) {
  io = new Server(server, {
    cors: { origin: '*' }
  });
}

function emitMetrics(metric) {
  if (io) {
    io.emit('telemetry', {
      ...metric,
      timestamp: Date.now()
    });
  }
}

module.exports = { initTelemetry, emitMetrics };