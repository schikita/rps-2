import React, { useState } from "react";

interface AuthScreenProps {
  onLogin: (nickname: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();

    if (!trimmed) {
      setError("Введите игровой ник.");
      return;
    }
    if (trimmed.length > 20) {
      setError("Максимум 20 символов.");
      return;
    }

    setError("");
    onLogin(trimmed);
  };

  return (
    <div className="app-root auth-screen">
      <div className="app-gradient-bg" />
      <div className="app-content">
        <h1 className="logo-title">CYBER RPS</h1>
        <p className="logo-subtitle">КАМЕНЬ • НОЖНИЦЫ • БУМАГА</p>

        <div className="auth-card">
          <h2 className="auth-title">Вход в игру</h2>
          <p className="auth-description">
            Придумай ник, под которым тебя будут видеть в рейтинге.
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-label">
              Никнейм
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="auth-input"
                placeholder="Например, CyberNinja"
                maxLength={20}
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="primary-btn">
              Войти в игру
            </button>

            <p className="auth-hint">
              Позже здесь будет вход через Telegram-аккаунт.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
