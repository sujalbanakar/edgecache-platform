import React from 'react';
import { useTelemetry } from './hooks/useTelemetry';
import Metrics from './components/Metrics';
import NodeTopology from './components/NodeTopology';

export default function App() {
  const { logs, stats, nodeStatus } = useTelemetry();

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '8px' }}>EdgeCache — Distributed CDN Telemetry</h1>
      <p style={{ color: '#94a3b8', marginTop: '0', marginBottom: '24px' }}>
        Real-time telemetry, consistent hashing failover & thundering herd mitigation
      </p>

      <Metrics stats={stats} />
      <NodeTopology nodeStatus={nodeStatus} />

      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#cbd5e1' }}>
        Live Edge Event Stream
      </h3>
      <div style={{ background: '#1e293b', borderRadius: '8px', padding: '16px' }}>
        {logs.length === 0 ? (
          <div style={{ color: '#64748b' }}>Waiting for CDN traffic through Gateway (:8080)...</div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} style={{ padding: '8px 0', borderBottom: '1px solid #334155' }}>
              <span style={{ color: '#94a3b8' }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
              <strong style={{ color: log.status === 'HIT' ? '#4ade80' : '#f87171' }}>
                {log.status}
              </strong>{' '}
              on <strong>{log.nodeId}</strong>: {log.path}{' '}
              <span style={{ color: log.latency <= 5 ? '#4ade80' : '#facc15' }}>
                ({log.latency}ms)
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}