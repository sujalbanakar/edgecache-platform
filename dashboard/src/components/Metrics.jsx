import React from 'react';

export default function Metrics({ stats }) {
  const total = stats.hits + stats.misses;
  const hitRatio = total ? ((stats.hits / total) * 100).toFixed(1) : '0.0';

  return (
    <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
      <div style={{ padding: '16px', background: '#1e293b', borderRadius: '8px', minWidth: '140px' }}>
        <div>Origin Offload Ratio</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8' }}>{hitRatio}%</div>
      </div>
      <div style={{ padding: '16px', background: '#1e293b', borderRadius: '8px', minWidth: '140px' }}>
        <div>Cache Hits</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4ade80' }}>{stats.hits}</div>
      </div>
      <div style={{ padding: '16px', background: '#1e293b', borderRadius: '8px', minWidth: '140px' }}>
        <div>Cache Misses (Origin Fetches)</div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f87171' }}>{stats.misses}</div>
      </div>
    </div>
  );
}