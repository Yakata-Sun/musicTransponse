import React from 'react';

export default function MelodyDisplay({ result, onPlay, isPlaying, disabled }) {
  return (
    <div className="result">
      <h3>Результат:</h3>
      <p style={{ fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
        {result || '—'}
      </p>
      <button
        onClick={onPlay}
        disabled={disabled || isPlaying}
      >
        ▶️ Воспроизвести транспонированную
      </button>
    </div>
  );
}