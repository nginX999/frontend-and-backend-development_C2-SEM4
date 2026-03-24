import React, { useEffect } from 'react';

export default function Alert({ message, type, onClose, duration = 3000 }) {
  useEffect(() => {
    if (onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [onClose, duration]);

  return (
    <div className={`alert alert-${type}`}>
      {message}
      {onClose && (
        <button onClick={onClose} className="alert-close">×</button>
      )}
    </div>
  );
}