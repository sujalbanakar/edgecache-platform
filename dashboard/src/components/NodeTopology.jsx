import React from 'react';

export default function NodeTopology({ nodeStatus }) {
  const nodes = Object.entries(nodeStatus);

  return (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#cbd5e1' }}>
        Cluster Topology & Edge Node Health
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {nodes.map(([nodeId, isOnline]) => (
          <div
            key={nodeId}
            style={{
              background: '#1e293b',
              border: `1px solid ${isOnline ? '#22c55e' : '#ef4444'}`,
              borderRadius: '8px',
              padding: '16px',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{nodeId}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    height: '10px',
                    width: '10px',
                    borderRadius: '50%',
                    backgroundColor: isOnline ? '#22c55e' : '#ef4444',
                    display: 'inline-block',
                    boxShadow: isOnline ? '0 0 8px #22c55e' : '0 0 8px #ef4444'
                  }}
                />
                <span
                  style={{
                    fontSize: '12px',
                    color: isOnline ? '#4ade80' : '#f87171',
                    fontWeight: '600'
                  }}
                >
                  {isOnline ? 'ONLINE' : 'DOWN / FAILOVER'}
                </span>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
              Role: Cache-Aside & Replicated Ring Member
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}