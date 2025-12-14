// src/utils/keyDetection.js
import { NOTE_TO_NUM } from '../constants/notes';
import { SCALES } from '../constants/modes';
import { noteToMidiNumber } from './noteUtils';

// Утилита: нормализовать ноты к одному октавному пространству (0–11)
const normalizeNotes = (midiNotes) => {
  return Array.from(new Set(midiNotes.map(n => n % 12)));
};

// Утилита: посчитать, сколько нот мелодии совпадает со ступенями лада
const matchScore = (notes, scaleRoot, mode) => {
  const scaleNotes = SCALES[mode].map(interval => (NOTE_TO_NUM[scaleRoot] + interval) % 12);
  return notes.filter(note => scaleNotes.includes(note)).length / notes.length;
};

// Утилита: частота встречаемости (для весов)
const getNoteFrequency = (midiNotes) => {
  const freq = {};
  midiNotes.forEach(n => {
    const note = n % 12;
    freq[note] = (freq[note] || 0) + 1;
  });
  return freq;
};

// Утилита: веса по важности ступеней (тоника, доминанта — важнее)
const getWeightedScore = (notes, scaleRoot, mode, freq) => {
  const tonic = NOTE_TO_NUM[scaleRoot] % 12;
  const dominant = (tonic + 7) % 12;
  const subdominant = (tonic + 5) % 12;
  const leadingTone = mode === 'harmonicMinor' ? (tonic + 11) % 12 : null;

  const scaleNotes = SCALES[mode].map(interval => (tonic + interval) % 12);
  let score = 0;
  let maxPossible = 0;

  notes.forEach(note => {
    const weight = note === tonic ? 2
                : note === dominant ? 1.5
                : note === subdominant ? 1.2
                : note === leadingTone ? 1.3
                : 1;
    maxPossible += weight;
    if (scaleNotes.includes(note)) {
      score += weight * (freq[note] || 1);
    }
  });

  return score / (maxPossible * Math.max(...Object.values(freq)));
};

// === Основная функция ===
export const detectKey = (midiNumbers) => {
  if (midiNumbers.length === 0) return null;

  const normalized = normalizeNotes(midiNumbers);
  const freq = getNoteFrequency(midiNumbers);

  const candidates = [];
  const roots = Object.keys(NOTE_TO_NUM); // ['C', 'C#', ..., 'B']
  const modes = ['major', 'naturalMinor', 'harmonicMinor'];

  for (const root of roots) {
    for (const mode of modes) {
      const simpleScore = matchScore(normalized, root, mode);
      const weightedScore = getWeightedScore(normalized, root, mode, freq);
      const totalScore = 0.4 * simpleScore + 0.6 * weightedScore;
      candidates.push({ root, mode, score: totalScore });
    }
  }

  // Сортируем по убыванию
  candidates.sort((a, b) => b.score - a.score);

  const best = candidates[0];

  // 🧠 Пояснение:
  let explanation = `Наиболее вероятная тональность — ${best.root} ${best.mode}. `;
  const tonicNote = best.root;
  const tonicNum = NOTE_TO_NUM[tonicNote];
  const scaleNotes = SCALES[best.mode].map(i => (tonicNum + i) % 12);
  const noteNames = Object.entries(NOTE_TO_NUM).reduce((acc, [name, num]) => {
    acc[num % 12] = name;
    return acc;
  }, {});

  const missing = scaleNotes.filter(n => !normalized.includes(n)).map(n => noteNames[n]);
  const extra = normalized.filter(n => !scaleNotes.includes(n)).map(n => noteNames[n]);

  if (missing.length > 0) {
    explanation += `Не хватает в мелодии: ${missing.join(', ')}. `;
  }
  if (extra.length > 0) {
    explanation += `Встречаются «чужие» ноты: ${extra.join(', ')}. Возможно, это модуляция или хроматика. `;
  }

  const tonicCount = freq[tonicNum % 12] || 0;
  const dominantCount = freq[(tonicNum + 7) % 12] || 0;
  if (tonicCount > 0 || dominantCount > 0) {
    explanation += `Тоника (${tonicNote}) встречается ${tonicCount} раз, доминанта (${noteNames[(tonicNum + 7) % 12]}) — ${dominantCount} раз — это характерно для устойчивой тональности.`;
  }

return {
  best: { key: [best.root, best.mode], confidence: Math.min(1, best.score * 1.3), explanation },
  alternatives: candidates.slice(1, 5).map(c => ({
    key: [c.root, c.mode],
    confidence: Math.min(1, c.score * 1.3),
    score: c.score,
  })),
  noteDistribution: freq, // для круга квинт
  melodyNotes: normalized,
};
};