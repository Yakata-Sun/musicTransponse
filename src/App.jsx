import React, { useState, useRef, useEffect } from 'react';
import midiParser from 'midi-parser-js';
import './App.css';
import { NOTE_TO_NUM, NOTE_OPTIONS } from './constants/notes';
import { MODES, SCALES } from './constants/modes';
import { noteToMidiNumber, midiNumberToNote } from './utils/noteUtils';
import {transposeScaleAware} from "./utils/scaleUtils";
import {useAudioContext} from "./hooks/useAudioContext";

// === Component ===
function App() {
  const [inputMelody, setInputMelody] = useState('C4 E4 G4 Bb4');
  const [originalKey, setOriginalKey] = useState(['C', 'major']);
  const [newKey, setNewKey] = useState(['D', 'harmonicMinor']);
  const [result, setResult] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [midiFile, setMidiFile] = useState(null);
  const { playMelody } = useAudioContext();

  // ✅ Утилита: строка нот → массив валидных MIDI-номеров
const parseNotesToMidi = (noteString) => {
  return noteString
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(noteToMidiNumber)
    .filter(n => typeof n === 'number' && !isNaN(n)); // защита от NaN
};

// ✅ Утилита: проиграть строку нот
const playNoteString = (noteString) => {
  const midiNumbers = parseNotesToMidi(noteString);
  playMelody(midiNumbers);
};

const handlePlayOriginal = () => {
  playNoteString(inputMelody);
};

const handlePlayTransposed = () => {
  playNoteString(result);
};

 const handleTranspose = () => {
  try {
    const midiNumbers = parseNotesToMidi(inputMelody);

    // Если после парсинга ничего нет — не продолжать
    if (midiNumbers.length === 0) {
      setResult('');
      return;
    }

    const transposedMidi = transposeScaleAware(midiNumbers, originalKey, newKey);
    const transposedNotes = transposedMidi.map(midiNumberToNote);
    setResult(transposedNotes.join(' '));
  } catch (err) {
    console.error('Ошибка транспонирования:', err);
    alert('Ошибка транспонирования: ' + (err.message || err));
    setResult('');
  }
};
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