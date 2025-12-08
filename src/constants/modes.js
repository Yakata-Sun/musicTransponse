export const MODES = [
  { value: 'major', label: 'мажор' },
  { value: 'naturalMinor', label: 'натуральный минор' },
  { value: 'harmonicMinor', label: 'гармонический минор' },
];

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
};

export const getScale = (mode) => {
  const scale = SCALES[mode];
  if (!scale) throw new Error(`Неизвестный лад: ${mode}`);
  return scale;
};