import React, { useEffect } from 'react';

interface CustomModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const CustomModal: React.FC<CustomModalProps> = ({ isOpen, title, message, type = 'info', onClose }) => {
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Determine colors based on type
  let titleColor = '#facc15'; // Gold (Info)
  let glowColor = 'rgba(250, 204, 21, 0.3)';

  if (type === 'error') {
    titleColor = '#f87171'; // Red
    glowColor = 'rgba(248, 113, 113, 0.3)';
  } else if (type === 'success') {
    titleColor = '#4ade80'; // Green
    glowColor = 'rgba(74, 222, 128, 0.3)';
  }

  return (
    <div className="match-overlay" style={{ zIndex: 9999 }}>
      <div 
        className="match-card" 
        style={{ 
            maxWidth: '340px', 
            width: '90%',
            padding: '24px', 
            borderColor: titleColor,
            boxShadow: `0 0 40px ${glowColor}, 0 0 0 1px rgba(255,255,255,0.1)`
        }}
      >
        <h2 
            className="match-title" 
            style={{ 
                color: titleColor, 
                marginBottom: '16px',
                fontSize: '1.4rem',
                textShadow: `0 0 15px ${titleColor}`
            }}
        >
          {title}
        </h2>
        
        <p style={{ 
            color: '#cbd5e1', 
            marginBottom: '24px', 
            lineHeight: '1.5', 
            fontSize: '0.95rem' 
        }}>
          {message}
        </p>
        
        <button 
            className="primary-btn" 
            onClick={onClose}
            style={{ 
                width: '100%', 
                fontSize: '1rem', 
                padding: '12px',
                background: `linear-gradient(90deg, ${titleColor}20, transparent)`,
                borderColor: titleColor,
                color: '#fff'
            }}
        >
          OK
        </button>
      </div>
    </div>
  );
};