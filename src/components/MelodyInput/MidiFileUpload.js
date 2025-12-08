import React from 'react';

export default function MidiFileUpload({ onUpload }) {
  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onUpload(ev.target.result);
    reader.readAsArrayBuffer(file);
  };

  return (
    <input
      type="file"
      accept=".mid,.midi"
      onChange={handleChange}
      style={{ width: 'fit-content', marginLeft: '8px' }}
    />
  );
}