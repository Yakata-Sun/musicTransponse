import React from 'react';
import TextFileUpload from './TextFileUpload';
import MidiFileUpload from './MidiFileUpload';

export default function MelodyInput({ value, onChange, onTextUpload, onMidiUpload, midiFile }) {
  return (
    <>
      <div className="input-group">
        <label>Загрузить мелодию:</label>
        <TextFileUpload onUpload={onTextUpload} />
        <MidiFileUpload onUpload={onMidiUpload} />
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="C4 D4 E4 F4 G4..."
        />
      </div>
    </>
  );
}