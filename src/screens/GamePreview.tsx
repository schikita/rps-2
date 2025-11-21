import React, { useRef, useState } from "react";
import type { User } from "../App";
import { HandFightAnimation } from "../components/HandFightAnimation";
import { getBotMove, detectWinner, type Move } from "../engine/rps";

type Phase = "lobby" | "idle" | "countdown" | "reveal" | "matchOver";

interface GamePreviewProps {
  user: User;
  onLogout: () => void;
}

const BOT = {
  name: "Кибер-бот",
  avatar: "/src/assets/avatars/skin-6.jpg", // подставь нужный путь
};

export const GamePreview: React.FC<GamePreviewProps> = ({ user, onLogout }) => {
  const [phase, setPhase] = useState<Phase>("lobby");

  const [countdown, setCountdown] = useState<number | null>(null);
  const [playerMove, setPlayerMove] = useState<Move | null>(null);
  const [botMove, setBotMove] = useState<Move | null>(null);

  const [playerWins, setPlayerWins] = useState(0);
  const [botWins, setBotWins] = useState(0);

  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetMatch = () => {
    clearTimer();
    setPhase("lobby");
    setCountdown(null);
    setPlayerMove(null);
    setBotMove(null);
    setPlayerWins(0);
    setBotWins(0);
  };

  const startArena = () => {
    setPhase("idle");
    setPlayerWins(0);
    setBotWins(0);
    setPlayerMove(null);
    setBotMove(null);
    setCountdown(null);
  };

  const startRound = (move: Move) => {
    if (phase === "countdown" || phase === "lobby" || phase === "matchOver") {
      return;
    }

    clearTimer();
    setPlayerMove(move);
    const botChoice = getBotMove();
    setBotMove(botChoice);

    setPhase("countdown");
    setCountdown(5);

    let current = 5;

    const id = window.setInterval(() => {
      current -= 1;
      setCountdown(current);

      if (current <= 0) {
        clearTimer();

        const outcome = detectWinner(move, botChoice);

        // считаем победы до 3
        let newPlayerWins = playerWins;
        let newBotWins = botWins;

        if (outcome === "win") newPlayerWins += 1;
        if (outcome === "lose") newBotWins += 1;

        setPlayerWins(newPlayerWins);
        setBotWins(newBotWins);

        if (newPlayerWins >= 3 || newBotWins >= 3) {
          setPhase("matchOver");
        } else {
          setPhase("reveal");
        }

        setCountdown(null);
      }
    }, 1000);

    timerRef.current = id;
  };

  const matchWinner =
    playerWins >= 3 ? "player" : botWins >= 3 ? "bot" : null;

  return (
    <div className="app-root game-screen">
      <div className="app-gradient-bg" />
      <div className="app-content">
        {/* верх — бот */}
        <div className="hud-top">
          <img src={BOT.avatar} className="hud-avatar" />
          <div className="hud-info">
            <div className="hud-name">{BOT.name}</div>
            <div className="hud-score">Победы: {botWins} / 3</div>
          </div>
        </div>

        <h1 className="logo-title">CYBER RPS</h1>
        <p className="logo-subtitle">КАМЕНЬ • НОЖНИЦЫ • БУМАГА</p>

        {/* центр — арена рук */}
        <section className="preview-section">
          {phase === "lobby" && (
            <div className="lobby-panel">
              <p className="lobby-title">Матч до трёх побед</p>
              <p className="lobby-text">
                Выберите стратегию и приготовьтесь к бою с кибер-ботом.
              </p>
              <button className="primary-btn" onClick={startArena}>
                Войти в арену
              </button>
            </div>
          )}

          {phase !== "lobby" && (
            <>
              <HandFightAnimation
                phase={phase === "idle" ? "idle" : phase === "matchOver" ? "reveal" : (phase as any)}
                countdown={countdown}
                playerMove={playerMove}
                botMove={botMove}
              />

              <div className="round-score">
                Раундовый счёт: {playerWins} : {botWins}
              </div>

              <div className="moves-row">
                <button
                  className="pill-btn"
                  onClick={() => startRound("rock")}
                  disabled={phase === "countdown" || phase === "matchOver"}
                >
                  КАМЕНЬ
                </button>
                <button
                  className="pill-btn"
                  onClick={() => startRound("scissors")}
                  disabled={phase === "countdown" || phase === "matchOver"}
                >
                  НОЖНИЦЫ
                </button>
                <button
                  className="pill-btn"
                  onClick={() => startRound("paper")}
                  disabled={phase === "countdown" || phase === "matchOver"}
                >
                  БУМАГА
                </button>
              </div>
            </>
          )}
        </section>

        {/* низ — игрок */}
        <div className="hud-bottom">
          <img src={user.avatar} className="hud-avatar" />
          <div className="hud-info">
            <div className="hud-name">{user.nickname}</div>
            <div className="hud-score">Победы: {playerWins} / 3</div>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            Выйти
          </button>
        </div>

        {/* меню после матча */}
        {phase === "matchOver" && (
          <div className="match-overlay">
            <div className="match-card">
              <h2 className="match-title">
                {matchWinner === "player" ? "Ты выиграл матч!" : "Бот победил"}
              </h2>
              <p className="match-score">
                Итоговый счёт: {playerWins} : {botWins}
              </p>
              <button className="primary-btn" onClick={resetMatch}>
                Сыграть ещё раз
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
