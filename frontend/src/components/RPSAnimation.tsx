import React from "react";

export const RPSAnimation: React.FC = () => {
  return (
    <div className="rps-wrapper">
      <div className="rps-orbit rps-orbit-outer" />
      <div className="rps-orbit rps-orbit-inner" />

      <div className="rps-item rps-item-rock">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C9 2 7 4 7 7c0 .6.1 1.2.3 1.8L3 13.1c-.4.4-.4 1 0 1.4l2.6 2.6c.4.4 1 .4 1.4 0l4.3-4.3c.6.2 1.2.3 1.8.3 3 0 5-2 5-5s-2-5-5-5z" />
          <path d="M11 11l4 4" />
        </svg>
      </div>
      <div className="rps-item rps-item-scissors">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="20" y1="4" x2="8.12" y2="15.88" />
          <line x1="14.47" y1="14.48" x2="20" y2="20" />
          <line x1="8.12" y1="8.12" x2="12" y2="12" />
        </svg>
      </div>
      <div className="rps-item rps-item-paper">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      </div>

      <div className="rps-center">
        <span>R P S</span>
      </div>
    </div>
  );
};
