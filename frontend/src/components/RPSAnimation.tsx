import React from "react";

export const RPSAnimation: React.FC = () => {
  return (
    <div className="rps-wrapper">
      <div className="rps-orbit rps-orbit-outer" />
      <div className="rps-orbit rps-orbit-inner" />

      <div className="rps-item rps-item-rock">✊</div>
      <div className="rps-item rps-item-scissors">✌️</div>
      <div className="rps-item rps-item-paper">✋</div>

      <div className="rps-center">
        <span>R P S</span>
      </div>
    </div>
  );
};
