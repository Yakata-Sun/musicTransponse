import { getScale } from '../constants/modes';
import { NOTE_TO_NUM, NUM_TO_NOTE } from '../constants/notes';
import { midiNumberToNote } from './noteUtils';

export function transposeScaleAware(midiNumbers, fromKey, toKey) {
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