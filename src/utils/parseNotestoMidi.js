export function parseNotesToMidi(noteString) => {
  return noteString
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(noteToMidiNumber)
    .filter(n => typeof n === 'number' && !isNaN(n)); // защита от NaN
};