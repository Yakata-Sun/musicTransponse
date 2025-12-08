import React, { useState, useRef, useEffect } from 'react';
import midiParser from 'midi-parser-js';
import './App.css';

const NOTE_TO_NUM = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'F': 5,
  'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11
};

const NUM_TO_NOTE = [
  'C', 'C#', 'D', 'D#', 'E', 'F',
  'F#', 'G', 'G#', 'A', 'A#', 'B'
];

const NOTE_OPTIONS = [...NUM_TO_NOTE];

const MODES = [
  { value: 'major', label: 'мажор' },
  { value: 'naturalMinor', label: 'натуральный минор' },
  { value: 'harmonicMinor', label: 'гармонический минор' },
];

// === Сcales ===
const majorScale = [0, 2, 4, 5, 7, 9, 11];
const naturalMinorScale = [0, 2, 3, 5, 7, 8, 10];
const harmonicMinorScale = [0, 2, 3, 5, 7, 8, 11];

function getScale(mode) {
  switch (mode) {
    case 'major': return majorScale;
    case 'naturalMinor': return naturalMinorScale;
    case 'harmonicMinor': return harmonicMinorScale;
    default: throw new Error(`Неизвестный лад: ${mode}`);
  }
}

// === Utils ===
function noteToMidiNumber(noteStr) {
  noteStr = noteStr.trim();
  const match = noteStr.match(/^([A-G][#b]?)(-?\d+)?$/i);
  if (!match) throw new Error(`Неверный формат: ${noteStr}`);
  const [, noteName, octaveStr] = match;
  const noteNum = NOTE_TO_NUM[noteName];
  if (noteNum === undefined) throw new Error(`Неизвестная нота: ${noteName}`);
  const octave = octaveStr ? parseInt(octaveStr, 10) : 4;
  return noteNum + 12 * (octave + 1);
}

function midiNumberToNote(midiNum) {
  if (midiNum < 0 || midiNum > 127) throw new Error(`MIDI вне диапазона: ${midiNum}`);
  const octave = Math.floor(midiNum / 12) - 1;
  const noteIndex = midiNum % 12;
  return `${NUM_TO_NOTE[noteIndex]}${octave}`;
}



// ✅ Diatonic transposition with 3 modes
function transposeScaleAware(midiNumbers, fromKey, toKey) {
  const [fromTonic, fromMode] = fromKey;
  const [toTonic, toMode] = toKey;

  const fromTonicPC = NOTE_TO_NUM[fromTonic]; // pitch class, 0–11
  const toTonicPC = NOTE_TO_NUM[toTonic];
  const semitoneShift = (toTonicPC - fromTonicPC + 12) % 12;

  const fromScale = getScale(fromMode);
  const toScale = getScale(toMode);

  // Определяем октаву тоники: будем считать, что тоника "живёт" в той же октаве, где и нота (округление по ближайшему)
  // Но лучше — вычислить offset в октавах: сколько полутонов от абсолютной тоники
  // Пример: C4 = 60, fromTonicPC=0 → октава тоники = (60 - 0)/12 = 5 → но обычно C4 — 4-я октава
  // В MIDI: C-1 = 0, C0 = 12, C1 = 24, ..., C4 = 60 → октава = Math.floor(midi/12) - 1
  // Поэтому: тоника X в октаве k имеет MIDI = X + 12*(k+1)

  return midiNumbers.map(midiNum => {
    if (midiNum < 0 || midiNum > 127) return midiNum;

    const noteName = midiNumberToNote(midiNum);
    const pitchClass = midiNum % 12;

    // === 1. Определяем, на какой ступени (в исходном ладу) находится нота
    const intervalFromTonic = (pitchClass - fromTonicPC + 12) % 12; // 0–11
    const degreeIndex = fromScale.indexOf(intervalFromTonic);

    let resultMidi;
    let logEntry = {
      original: noteName,
      pitchClass,
      fromKey: `${fromTonic} ${fromMode}`,
      toKey: `${toTonic} ${toMode}`,
      intervalFromTonic,
      isDiatonic: degreeIndex !== -1,
    };

    if (degreeIndex === -1) {
      // ❗ Хроматическая нота — делаем чистый хроматический сдвиг
      resultMidi = Math.min(127, Math.max(0, midiNum + semitoneShift));
      logEntry.action = 'chromatic shift';
      logEntry.shift = semitoneShift;
      logEntry.result = midiNumberToNote(resultMidi);
    } else {
      // ✅ Диатоническая нота: сохраняем номер ступени
      const toInterval = toScale[degreeIndex]; // интервал от новой тоники
    
      const idealTonicMidi = midiNum - intervalFromTonic;
      const tonicOctave = Math.round((idealTonicMidi - fromTonicPC) / 12);

      // Теперь — новая тоника в той же относительной октаве:
      const actualToTonicMidi = toTonicPC + 12 * tonicOctave;
      resultMidi = actualToTonicMidi + toInterval;

      // Коррекция на границы MIDI
      resultMidi = Math.min(127, Math.max(0, resultMidi));

      logEntry.action = 'diatonic transpose';
      logEntry.degree = degreeIndex + 1; // 1-based
      logEntry.fromInterval = intervalFromTonic;
      logEntry.toInterval = toInterval;
      logEntry.tonicOctave = tonicOctave;
      logEntry.result = midiNumberToNote(resultMidi);
    }

    // 📝 Логгируем (в консоль)
    console.log('[transposeScaleAware] Note:', logEntry);

    return resultMidi;
  });
}

// === Component ===
function App() {
  const [inputMelody, setInputMelody] = useState('C4 E4 G4 Bb4');
  const [originalKey, setOriginalKey] = useState(['C', 'major']);
  const [newKey, setNewKey] = useState(['D', 'harmonicMinor']);
  const [result, setResult] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [midiFile, setMidiFile] = useState(null);

  const audioContextRef = useRef(null);
  const scheduledNotesRef = useRef([]);

  const getAudioContext = () => {
    if (audioContextRef.current) return audioContextRef.current;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = ctx;
    return ctx;
  };

  const playMelody = (melodyStr) => {
    if (!melodyStr?.trim()) return;

    const audioContext = getAudioContext();

    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {
        alert('Пожалуйста, кликните по странице — браузер требует взаимодействия для воспроизведения звука.');
      });
    }

    scheduledNotesRef.current.forEach(({ oscillator }) => {
      try { if (oscillator?.stop) {oscillator.stop(); } } catch {console.log('error')}
    });
    scheduledNotesRef.current = [];

    const notes = melodyStr.trim().split(/\s+/).filter(Boolean);
    const midiNumbers = notes.map(noteToMidiNumber);

    const now = audioContext.currentTime;
    const interval = 0.5;

    midiNumbers.forEach((midiNum, i) => {
      if (midiNum < 21 || midiNum > 108) return;

      const time = now + i * interval;
      const freq = 440 * Math.pow(2, (midiNum - 69) / 12);

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start(time);
      oscillator.stop(time + 0.4);

      scheduledNotesRef.current.push({ oscillator });
    });

    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), notes.length * interval * 1000 + 600);
  };

  const handleTranspose = () => {
    try {
      const notes = inputMelody.trim().split(/\s+/).filter(Boolean);
      const midiNumbers = notes.map(noteToMidiNumber);
      const transposedMidi = transposeScaleAware(midiNumbers, originalKey, newKey);
      const transposedNotes = transposedMidi.map(midiNumberToNote);
      setResult(transposedNotes.join(' '));
    } catch (err) {
      alert('Ошибка транспонирования: ' + err.message);
      setResult('');
    }
  };

  const handlePlayOriginal = () => playMelody(inputMelody);
  const handlePlayTransposed = () => playMelody(result);

  const handleTextFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      let content = e.target.result.trim();
      content = content.replace(/[^A-Ga-g#b0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
      setInputMelody(content);
      setResult('');
    };
    reader.readAsText(file);
  };

  const handleMidiFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const uint8Array = new Uint8Array(e.target.result);
        const midi = midiParser.parse(uint8Array);
        setMidiFile(midi);

        const allNotes = [];
        midi.tracks.forEach(track => {
          track.forEach(event => {
            if (event.subtype === 'noteOn' && event.velocity > 0 && typeof event.noteNumber === 'number') {
              try {
                allNotes.push(midiNumberToNote(event.noteNumber));
              } catch { console.log('error')}
            }
          });
        });

        setInputMelody(allNotes.slice(0, 32).join(' '));
        setResult('');
      } catch (err) {
        alert('Ошибка разбора MIDI: ' + (err.message || err));
        setMidiFile(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="App">
      <h1>🎵 Транспонирование мелодии</h1>

      <div className="input-group">
        <label>Загрузить мелодию:</label>
        <input type="file" accept=".txt" onChange={handleTextFileUpload} />
        <input type="file" accept=".mid,.midi" onChange={handleMidiFileUpload} style={{ marginLeft: '8px' }} />
        {midiFile && (
          <span style={{ marginLeft: '12px', color: 'green' }}>
            ✓ {midiFile.header.format}, {midiFile.tracks.length} трек(ов)
          </span>
        )}
      </div>

      <div className="input-group">
        <label>Мелодия (ноты через пробел, напр. C4 E4 G4):</label>
        <input
          type="text"
          value={inputMelody}
          onChange={(e) => setInputMelody(e.target.value)}
          placeholder="C4 D4 E4 F4 G4..."
        />
        <button onClick={handlePlayOriginal} disabled={isPlaying || !inputMelody.trim()}>
          ▶️ Воспроизвести оригинал
        </button>
      </div>

      <div className="input-group">
        <label>Исходная тональность:</label>
        <select value={originalKey[0]} onChange={e => setOriginalKey([e.target.value, originalKey[1]])}>
          {NOTE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={originalKey[1]} onChange={e => setOriginalKey([originalKey[0], e.target.value])}>
          {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      <div className="input-group">
        <label>Целевая тональность:</label>
        <select value={newKey[0]} onChange={e => setNewKey([e.target.value, newKey[1]])}>
          {NOTE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={newKey[1]} onChange={e => setNewKey([newKey[0], e.target.value])}>
          {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      <button onClick={handleTranspose} disabled={!inputMelody.trim()}>
        ➕ Транспонировать
      </button>

      <div className="result">
        <h3>Результат:</h3>
        <p style={{ fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
          {result || '—'}
        </p>
        <button onClick={handlePlayTransposed} disabled={isPlaying || !result.trim()}>
          ▶️ Воспроизвести транспонированную
        </button>
      </div>

      <div className="info">
        <p>
          Поддержка: <strong>мажор</strong>, <strong>натуральный минор</strong>, <strong>гармонический минор</strong>.<br />
          Пример: транспонирование из C мажор в A гармонический минор превратит G в G♯ (VII ступень повышена).
        </p>
      </div>
    </div>
  );
}

export default App;