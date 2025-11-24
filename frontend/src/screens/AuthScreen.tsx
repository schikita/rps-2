import React, { useState } from "react";

interface AuthScreenProps {
  onLogin: (nickname: string, avatar: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [error, setError] = useState("");

  const presetAvatars = [
    "/src/assets/avatars/skin-1.jpg",
    "/src/assets/avatars/skin-2.jpg",
    "/src/assets/avatars/skin-3.jpg",
    "/src/assets/avatars/skin-4.jpg",
    "/src/assets/avatars/skin-5.jpg",
    "/src/assets/avatars/skin-6.jpg",
  ];

  // загрузка пользовательского аватара
  const handleCustomAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nickname.trim()) {
      setError("Введите никнейм.");
      return;
    }

    if (!selectedAvatar) {
      setError("Выберите аватар.");
      return;
    }

    onLogin(nickname.trim(), selectedAvatar);
  };

  return (
    <div className="app-root auth-screen">
      <div className="app-gradient-bg" />
      <div className="app-content">

        <h1 className="logo-title">CYBER RPS</h1>
        <p className="logo-subtitle">СОЗДАЙ СВОЙ ОБРАЗ</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Ник */}
          <label className="auth-label">
            Никнейм
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="auth-input"
              placeholder="Введите ваш ник"
              maxLength={20}
            />
          </label>

          {/* Аватары */}
          <p className="auth-subtitle">Выберите аватар:</p>

          <div className="avatar-grid">
            {presetAvatars.map((src, i) => (
              <img
                key={i}
                src={src}
                className={`avatar-option ${selectedAvatar === src ? "avatar-selected" : ""}`}
                onClick={() => setSelectedAvatar(src)}
              />
            ))}
          </div>

          {/* Свой аватар */}
          <div className="upload-block">
            <label className="upload-label">
              Загрузить свой аватар
              <input type="file" accept="image/*" hidden onChange={handleCustomAvatar} />
            </label>
          </div>

          {selectedAvatar && (
            <div className="selected-preview">
              <p>Вы выбрали:</p>
              <img src={selectedAvatar} className="selected-avatar-preview" />
            </div>
          )}

          {/* Ошибка */}
          {error && <p className="auth-error">{error}</p>}

          {/* Кнопка */}
          <button type="submit" className="primary-btn">
            Продолжить
          </button>
        </form>
      </div>
    </div>
  );
};
