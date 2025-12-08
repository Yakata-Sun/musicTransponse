import { useRef, useEffect } from 'react';

export function useAudioContext() {
  const audioContextRef = useRef(null);
  const scheduledNotesRef = useRef([]);

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  const playMelody = (midiNumbers, { interval = 0.5, volume = 0.08 } = {}) => {
    if (!midiNumbers?.length) return;

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        alert('Пожалуйста, кликните по странице — браузер требует взаимодействия для звука.');
      });
    }

    scheduledNotesRef.current.forEach(({ oscillator }) => {
      try { oscillator?.stop?.(); } catch {console.log('error useAudioContext')}
    });
    scheduledNotesRef.current = [];

    const now = ctx.currentTime;
    midiNumbers.forEach((midiNum, i) => {
      if (midiNum < 21 || midiNum > 108) return;

      const time = now + i * interval;
      const freq = 440 * Math.pow(2, (midiNum - 69) / 12);

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = freq;
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(time);
      oscillator.stop(time + 0.4);
      scheduledNotesRef.current.push({ oscillator });
    });
  };

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return { playMelody };
}