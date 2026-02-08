import React from "react";
import { createPortal } from "react-dom";
import type { Move } from "../engine/rps";

import playerReady from "../assets/hands/player/player_ready.png";
import playerRock from "../assets/hands/player/player_rock.png";
import playerScissors from "../assets/hands/player/player_scissors.png";
import playerPaper from "../assets/hands/player/player_paper.png";

import botReady from "../assets/hands/bot/ready.png";
import botRock from "../assets/hands/bot/rock.png";
import botScissors from "../assets/hands/bot/bot_scissors.png";
import botPaper from "../assets/hands/bot/bot_paper.png";

type Phase = "idle" | "countdown" | "reveal";

interface HandFightAnimationProps {
  phase: Phase;
  countdown: number | null;
  playerMove: Move | null;
  botMove: Move | null;
  lastRoundResult: "win" | "lose" | "draw" | null;
  showResultOverlay?: boolean;
  playerHandImageId?: string | null;
  opponentHandImageId?: string | null; // Added for synced skins
}

const getPlayerSprite = (phase: Phase, move: Move | null, skinId?: string | null) => {
  if (skinId === 'default' || !skinId) {
    if (phase !== "reveal" || !move) return playerReady;
    switch (move) {
      case "rock": return playerRock;
      case "scissors": return playerScissors;
      case "paper": return playerPaper;
      default: return playerReady;
    }
  }

  // Handle premium skins (tanos, robocop)
  const gestures: Record<string, string> = {
    'tanos': 'tanos-',
    'robocop': 'robocop-',
    'hands_skeleton': 'hands_skeleton_',
    'hands_gold': 'hands_gold_'
  };

  const prefix = gestures[skinId] || `${skinId}_`;

  if (phase !== "reveal" || !move) {
    if (skinId === 'tanos' || skinId === 'robocop') return `/images/${prefix}rock.png`;
    return `/images/${prefix}rock.png`;
  }

  let moveSuffix = move;
  if (skinId === 'tanos') {
    if (move === 'scissors') moveSuffix = 'nojn' as any;
  } else if (skinId === 'robocop') {
    if (move === 'scissors') moveSuffix = 'sci' as any;
  }

  return `/images/${prefix}${moveSuffix}.png`;
};

const getBotSprite = (phase: Phase, move: Move | null, skinId?: string | null) => {
  if (skinId === 'default' || !skinId) {
    if (phase !== "reveal" || !move) return botReady;
    switch (move) {
      case "rock": return botRock;
      case "scissors": return botScissors;
      case "paper": return botPaper;
      default: return botReady;
    }
  }

  // Handle premium skins
  const gestures: Record<string, string> = {
    'tanos': 'tanos-',
    'robocop': 'robocop-',
    'hands_skeleton': 'hands_skeleton_',
    'hands_gold': 'hands_gold_'
  };

  const prefix = gestures[skinId] || `${skinId}_`;

  if (phase !== "reveal" || !move) {
    if (skinId === 'tanos' || skinId === 'robocop') return `/images/${prefix}rock.png`;
    return `/images/${prefix}rock.png`;
  }

  let moveSuffix = move;
  if (skinId === 'tanos') {
    if (move === 'scissors') moveSuffix = 'nojn' as any;
  } else if (skinId === 'robocop') {
    if (move === 'scissors') moveSuffix = 'sci' as any;
  }

  return `/images/${prefix}${moveSuffix}.png`;
};

export const HandFightAnimation: React.FC<HandFightAnimationProps> = ({
  phase,
  countdown,
  playerMove,
  botMove,
  lastRoundResult,
  showResultOverlay = true,
  playerHandImageId = null,
  opponentHandImageId = null,
}) => {
  const playerSprite = getPlayerSprite(phase, playerMove, playerHandImageId);
  const botSprite = getBotSprite(phase, botMove, opponentHandImageId);

  const isShaking = phase === "countdown";

  return (
    <div className="hands-arena">
      {/* рука бота сверху */}
      <div
        className={`hand hand--bot ${isShaking ? "hand--shake" : ""}`}
      >
        <img src={botSprite} alt="Рука бота" className="hand-image hand-image--bot" />
      </div>

      {/* обратный отсчёт (PORTAL TO SCREEN CENTER) */}
      {countdown !== null && phase === "countdown" && createPortal(
        <div className="hands-countdown">
          <span className="animate-pulse" style={{ display: 'inline-block' }}>{countdown}</span>
        </div>,
        document.body
      )}

      {/* результат по центру (внутри контейнера) */}
      <div className="hands-center-info">
        {/* Local content removed, moved to Portal */}
      </div>

      {/* GLOBAL RESULT OVERLAY */}
      {phase === "reveal" && lastRoundResult && showResultOverlay && createPortal(
        <div className="result-overlay">
          <div className={`round-result-text ${lastRoundResult} animate-bounce-in`}>
            {lastRoundResult === "win" ? "ПОБЕДА" : lastRoundResult === "lose" ? "ПРОИГРЫШ" : "НИЧЬЯ"}
          </div>
        </div>,
        document.body
      )}

      {/* рука игрока снизу */}
      <div
        className={`hand hand--player ${isShaking ? "hand--shake" : ""}`}
      >
        <img
          src={playerSprite}
          alt="Рука игрока"
          className="hand-image hand-image--player"
        />
      </div>
    </div>
  );
};
