import React from 'react';

export default function TransposeButton({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ padding: '10px 20px', fontSize: '16px' }}
    >
      ➕ Транспонировать
    </button>
  );
}