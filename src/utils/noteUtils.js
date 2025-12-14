import { NOTE_TO_NUM, NUM_TO_NOTE } from '../constants/notes';

export function noteToMidiNumber(noteStr) {
  noteStr = noteStr.trim();
  const match = noteStr.match(/^([A-G][#b]?)(-?\d+)?$/i);
  if (!match) throw new Error(`Неверный формат: ${noteStr}`);
  const [, noteName, octaveStr] = match;
  const noteNum = NOTE_TO_NUM[noteName];
  if (noteNum === undefined) throw new Error(`Неизвестная нота: ${noteName}`);
  const octave = octaveStr ? parseInt(octaveStr, 10) : 4;
  return noteNum + 12 * (octave + 1);
}

export function midiNumberToNote(midiNum) {
  if (midiNum < 0 || midiNum > 127) throw new Error(`MIDI вне диапазона: ${midiNum}`);
  const octave = Math.floor(midiNum / 12) - 1;
  const noteIndex = midiNum % 12;
  return `${NUM_TO_NOTE[noteIndex]}${octave}`;
}

export function parseNotesToMidi (noteString) {
  return noteString
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(noteToMidiNumber)
    .filter(n => typeof n === 'number' && !isNaN(n)); // защита от NaN
};