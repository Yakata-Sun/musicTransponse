import React from 'react';

export default function TextFileUpload({ onUpload }) {
  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onUpload(ev.target.result);
    reader.readAsText(file);
  };

  return (
    <input
      type="file"
      accept=".txt"
      onChange={handleChange}
      style={{ width: 'fit-content' }}
    />
  );
}