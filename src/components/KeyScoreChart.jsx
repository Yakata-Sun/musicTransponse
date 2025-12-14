// src/components/KeyScoreChart.jsx
import React from 'react';
import { NOTE_TO_NUM } from '../constants/notes';

const KeyScoreChart = ({ alternatives, best }) => {
  if (!best) return null;

  const allCandidates = [best, ...(alternatives || [])].slice(0, 10);
  const maxScore = Math.max(...allCandidates.map(c => c.score || 0), 0.1);

  return (
    <div style={{ marginTop: '20px' }}>
      <h3>Рейтинг тональностей</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '400px' }}>
        {allCandidates.map((item, i) => {
          const width = ((item.score || 0) / maxScore) * 100;
          const [root, mode] = item.key;
          const label = `${root} ${mode === 'major' ? 'major' : mode.replace(/([A-Z])/g, ' $1').trim()}`;
          const isBest = i === 0;

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  width: `${width}%`,
                  height: '24px',
                  backgroundColor: isBest ? '#4CAF50' : '#2196F3',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '8px',
                  color: 'white',
                  fontWeight: isBest ? 'bold' : 'normal',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {label} ({((item.confidence || 0) * 100).toFixed(0)}%)
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KeyScoreChart;