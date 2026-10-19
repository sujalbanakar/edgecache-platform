import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const NODES = [
  { id: 'edge-1', port: 5001 },
  { id: 'edge-2', port: 5002 },
  { id: 'edge-3', port: 5003 }
];

export function useTelemetry() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ hits: 0, misses: 0 });
  const [nodeStatus, setNodeStatus] = useState({
    'edge-1': false,
    'edge-2': false,
    'edge-3': false
  });

  useEffect(() => {
    const sockets = NODES.map(({ id, port }) => {
      const socket = io(`http://localhost:${port}`, {
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        timeout: 2000
      });

      socket.on('connect', () => {
        setNodeStatus((prev) => ({ ...prev, [id]: true }));
      });

      socket.on('disconnect', () => {
        setNodeStatus((prev) => ({ ...prev, [id]: false }));
      });

      socket.on('connect_error', () => {
        setNodeStatus((prev) => ({ ...prev, [id]: false }));
      });

      socket.on('telemetry', (data) => {
        setLogs((prev) => [data, ...prev.slice(0, 19)]);
        setStats((prev) => ({
          hits: data.status === 'HIT' ? prev.hits + 1 : prev.hits,
          misses: data.status === 'MISS' ? prev.misses + 1 : prev.misses
        }));
      });

      return socket;
    });

    return () => sockets.forEach((s) => s.disconnect());
  }, []);

  return { logs, stats, nodeStatus };
}