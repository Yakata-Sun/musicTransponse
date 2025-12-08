import midiParser from 'midi-parser-js';
import { midiNumberToNote } from './noteUtils';

export function parseMidiFile(arrayBuffer) {
  const midi = midiParser.parse(new Uint8Array(arrayBuffer));
  const notes = [];
  midi.tracks.forEach(track => {
    track.forEach(event => {
      if (event.subtype === 'noteOn' && event.velocity > 0 && typeof event.noteNumber === 'number') {
        try {
          notes.push(midiNumberToNote(event.noteNumber));
        } catch (e) {
          console.warn('Invalid MIDI note:', e.noteNumber);
        }
      }
    });
  });
  return { midi, notes };
}