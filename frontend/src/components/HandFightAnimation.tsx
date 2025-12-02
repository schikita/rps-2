import React from "react";
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
}

const getPlayerSprite = (phase: Phase, move: Move | null) => {
  if (phase !== "reveal" || !move) return playerReady;
  switch (move) {
    case "rock":
      return playerRock;
    case "scissors":
      return playerScissors;
    case "paper":
      return playerPaper;
    default:
      return playerReady;
  }
};

const getBotSprite = (phase: Phase, move: Move | null) => {
  if (phase !== "reveal" || !move) return botReady;
  switch (move) {
    case "rock":
      return botRock;
    case "scissors":
      return botScissors;
    case "paper":
      return botPaper;
    default:
      return botReady;
  }
};

export const HandFightAnimation: React.FC<HandFightAnimationProps> = ({
  phase,
  countdown,
  playerMove,
  botMove,
}) => {
  const playerSprite = getPlayerSprite(phase, playerMove);
  const botSprite = getBotSprite(phase, botMove);

  const isShaking = phase === "countdown";

  return (
    <div className="hands-arena">
      {/* рука бота сверху */}
      <div
        className={`hand hand--bot ${isShaking ? "hand--shake" : ""}`}
      >
        <img src={botSprite} alt="Рука бота" className="hand-image hand-image--bot" />
      </div>

      {/* обратный отсчёт по центру */}
      {countdown !== null && phase === "countdown" && (
        <div className="hands-countdown">{countdown}</div>
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
