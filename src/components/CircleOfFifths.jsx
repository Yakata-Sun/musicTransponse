// src/components/CircleOfFifths.jsx
import React from 'react';
import { NOTE_TO_NUM } from '../constants/notes';
import { SCALES } from '../constants/modes';

const CircleOfFifths = ({ detectedData, bestKey }) => {
  if (!detectedData || !bestKey) return null;

  const { melodyNotes, noteDistribution } = detectedData;
  const [tonic, mode] = bestKey;
  const tonicNum = NOTE_TO_NUM[tonic];
  const scaleNotes = SCALES[mode].map(i => (tonicNum + i) % 12);

  // Круг квинт: порядок по квинтам вверх
  const circleOrder = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
  const relativeMinors = {
    C: 'A', G: 'E', D: 'B', A: 'F#', E: 'C#', B: 'G#',
    'F#': 'D#', Db: 'Bb', Ab: 'F', Eb: 'C', Bb: 'G', F: 'D'
  };

  // Вспомогательная функция цвета
  const getNoteColor = (noteName, isMajor) => {
    const num = NOTE_TO_NUM[noteName] % 12;

    const inMelody = melodyNotes.includes(num);
    const inScale = scaleNotes.includes(num);

    if (inMelody && inScale) return '#4CAF50'; // зелёный — идеально
    if (inMelody && !inScale) return '#F44336'; // красный — диссонанс/хроматика
    if (!inMelody && inScale) return '#888';    // серый — есть в ладе, но не сыграно
    return '#eee';                               // фон
  };

  const getMinorColor = (minorRoot) => {
    const num = NOTE_TO_NUM[minorRoot] % 12;
    // В миноре будем проверять по натуральному минору (база), но для гарм. минора — отдельно
    const minorScale = SCALES.naturalMinor.map(i => (num + i) % 12);
    const inMelody = melodyNotes.includes(num);
    const inScale = minorScale.includes(num);
    // Можно улучшить: использовать тот же mode, но для простоты — naturalMinor как база

    if (inMelody && minorScale.some(n => melodyNotes.includes(n))) {
      const overlap = melodyNotes.filter(n => minorScale.includes(n)).length;
      if (overlap / melodyNotes.length > 0.6) return '#8BC34A';
    }
    return getNoteColor(minorRoot, false);
  };

  const radius = 120;
  const innerRadius = 70;
  const fontSize = '12px';

  return (
    <div style={{ textAlign: 'center', margin: '20px 0' }}>
      <h3>Круг квинт с анализом</h3>
      <svg width="300" height="300" viewBox="-150 -150 300 300" style={{ overflow: 'visible' }}>
        {/* Фон круга */}
        <circle cx="0" cy="0" r={radius + 20} fill="#fff" stroke="#ddd" strokeWidth="1" />

        {circleOrder.map((note, i) => {
          const angle = (i * 30 - 90) * Math.PI / 180; // 30° шаг, старт с верха
          const x = radius * Math.cos(angle);
          const y = radius * Math.sin(angle);

          const minor = relativeMinors[note];
          const xInner = innerRadius * Math.cos(angle);
          const yInner = innerRadius * Math.sin(angle);

          const majorColor = getNoteColor(note, true);
          const minorColor = getMinorColor(minor);

          return (
            <g key={note}>
              {/* Мажорный сектор (кольцо) */}
              <circle
                cx={x}
                cy={y}
                r="18"
                fill={majorColor}
                stroke="#333"
                strokeWidth="0.5"
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={fontSize}
                fontWeight="bold"
                fill={majorColor === '#eee' ? '#333' : '#fff'}
              >
                {note}
              </text>

              {/* Минорный — ближе к центру */}
              <circle
                cx={xInner}
                cy={yInner}
                r="12"
                fill={minorColor}
                stroke="#333"
                strokeWidth="0.5"
              />
              <text
                x={xInner}
                y={yInner}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10px"
                fill={minorColor === '#eee' ? '#333' : '#fff'}
              >
                {minor}
                <tspan dy="14" x={xInner} fontSize="8px">m</tspan>
              </text>
            </g>
          );
        })}

        {/* Центр: лучшая тональность */}
        <circle cx="0" cy="0" r="25" fill="#2196F3" />
        <text
          x="0"
          y="0"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="12px"
          fontWeight="bold"
        >
          {tonic} {mode === 'major' ? 'maj' : 'min'}
        </text>
      </svg>

      <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
        <div><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#4CAF50', marginRight: '4px' }}></span> Нота в мелодии и ладе</div>
        <div><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#F44336', marginRight: '4px' }}></span> Нота в мелодии, но не в ладе</div>
        <div><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#888', marginRight: '4px' }}></span> В ладе, но не в мелодии</div>
      </div>
    </div>
  );
};

export default CircleOfFifths;