import React, { useState } from "react";
import type { User } from "../App";
import { RPSAnimation } from "../components/RPSAnimation";

import { getBotMove, detectWinner, type Move } from "../engine/rps";

interface GamePreviewProps {
  user: User;
  onLogout: () => void;
}

export const GamePreview: React.FC<GamePreviewProps> = ({ user, onLogout }) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [playerMove, setPlayerMove] = useState<Move | null>(null);
  const [botMove, setBotMove] = useState<Move | null>(null);
  const [result, setResult] = useState<null | "win" | "lose" | "draw">(null);

  const startRound = (move: Move) => {
    setPlayerMove(move);
    setResult(null);
    setBotMove(null);
    setCountdown(5);

    const botChoice = getBotMove();

    let timer = 5;
    const interval = setInterval(() => {
      timer--;
      setCountdown(timer);

      if (timer === 0) {
        clearInterval(interval);

        setBotMove(botChoice);
        const outcome = detectWinner(move, botChoice);
        setResult(outcome);
      }
    }, 1000);
  };

  return (
    <div className="app-root game-screen">
      <div className="app-gradient-bg" />
      <div className="app-content">
        <header className="game-header">
          <div>
            <h1 className="logo-title">CYBER RPS</h1>
            <p className="logo-subtitle">КАМЕНЬ • НОЖНИЦЫ • БУМАГА</p>
          </div>

          <div className="user-pill">
            <span className="user-name">{user.nickname}</span>
            <button className="user-logout" onClick={onLogout}>
              Выйти
            </button>
          </div>
        </header>

        <section className="cards-row">
          <article className="player-card">
            <div className="card-gradient card-gradient-human" />
            <div className="card-body">
              <h3>Человек</h3>
              <p className="card-tag">УЛИЧНЫЙ ИГРОК</p>
              <p className="card-text">Ставит на интуицию и удачу.</p>
            </div>
          </article>

          <article className="player-card">
            <div className="card-gradient card-gradient-robot" />
            <div className="card-body">
              <h3>Робот-девушка</h3>
              <p className="card-tag">НЕЙРОННЫЙ ОРАКУЛ</p>
              <p className="card-text">Просчитывает тысячи исходов.</p>
            </div>
          </article>

          <article className="player-card">
            <div className="card-gradient card-gradient-cyborg" />
            <div className="card-body">
              <h3>Киборг</h3>
              <p className="card-tag">БОЕВОЙ ТАКТИК</p>
              <p className="card-text">Комбинирует мясо и металл.</p>
            </div>
          </article>
        </section>

        <section className="preview-section">
          <h2 className="preview-title">ПРЕВЬЮ ИГРЫ</h2>
          <p className="preview-subtitle">
            Сейчас — демонстрация анимации. Позже здесь будет сама игра и сетевой
            режим.
          </p>

          <RPSAnimation />

          {/* ОБРАТНЫЙ ОТСЧЁТ */}
          {countdown !== null && result === null && (
            <div className="countdown-label">
              {countdown > 0 ? countdown : ""}
            </div>
          )}

          {/* РЕЗУЛЬТАТ */}
          {result && (
            <div className={`result-label result-${result}`}>
              {result === "win" && "Победа!"}
              {result === "lose" && "Поражение!"}
              {result === "draw" && "Ничья!"}

              <p className="move-info">
                Вы: {playerMove} — Бот: {botMove}
              </p>
            </div>
          )}

          <div className="moves-row">
            <button className="pill-btn" onClick={() => startRound("rock")}>
              КАМЕНЬ
            </button>

            <button className="pill-btn" onClick={() => startRound("scissors")}>
              НОЖНИЦЫ
            </button>

            <button className="pill-btn" onClick={() => startRound("paper")}>
              БУМАГА
            </button>
          </div>

          <p className="preview-footnote">
            Далее можно добавить сетевую игру, рейтинг, Telegram-авторизацию и
            анимацию рук персонажей.
          </p>
        </section>
      </div>
    </div>
  );
};
