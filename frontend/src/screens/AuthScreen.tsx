import React, { useState } from "react";
import { API_URL } from "../config";
import { CustomModal } from "../components/CustomModal";

// --- PUBLIC IMAGES ---
const PRESET_AVATARS = [
  "/avatars/skin-1.jpg",
  "/avatars/skin-2.jpg",
  "/avatars/skin-3.jpg",
  "/avatars/skin-4.jpg",
  "/avatars/skin-5.jpg",
  "/avatars/skin-6.jpg",
];

interface AuthScreenProps {
  onLoginSuccess: (userData: unknown, token: string) => void;
}

declare global {
  interface Window {
    Telegram: any;
  }
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoadingTelegram, setIsLoadingTelegram] = useState(false);

  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string>(PRESET_AVATARS[0]);

  // Modal State
  const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info"
  });

  // Telegram Auto Login
  React.useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg?.initData) {
      handleTelegramLogin(tg.initData);
    }
  }, []);

  const handleTelegramLogin = async (initData: string) => {
    setIsLoadingTelegram(true);
    try {
      const res = await fetch(`${API_URL}/auth/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Telegram Auth failed");

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      console.error("TG Login Error:", err);
      // Если авто-логин не удался, просто оставляем пользователя на обычном экране
    } finally {
      setIsLoadingTelegram(false);
    }
  };

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setModal({ isOpen: true, title, message, type });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const endpoint = isRegistering ? "/auth/register" : "/auth/login";

    // Frontend Validation
    if (isRegistering) {
      const nameRegex = /^[a-zA-Z0-9_а-яА-Я]+$/;
      if (!nameRegex.test(nickname)) {
        showModal("ОШИБКА ВАЛИДАЦИИ", "Никнейм может содержать только буквы и цифры", "error");
        return;
      }
      if (password.length < 6) {
        showModal("ОШИБКА ВАЛИДАЦИИ", "Пароль должен быть не менее 6 символов", "error");
        return;
      }
    }

    const payload = isRegistering
      ? { nickname, email, password, avatar: selectedAvatar }
      : { nickname, password };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Что-то пошло не так");

      if (isRegistering) {
        // Flag to trigger Privacy Policy screen after subsequent login
        localStorage.setItem("privacy_policy_needed", "true");

        setIsRegistering(false);
        // Success Modal
        showModal("АККАУНТ СОЗДАН", "Ваш аккаунт был успешно создан! Теперь вы можете войти.", "success");
      } else {
        onLoginSuccess(data.user, data.token);
      }
    } catch (err: unknown) {
      // Error Modal
      showModal("ОШИБКА АВТОРИЗАЦИИ", (err as Error).message || "Unknown error", "error");
    }
  };

  return (
    <div className="app-root auth-screen">
      <div className="app-gradient-bg" />

      {/* Modal Component */}
      <CustomModal
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onClose={closeModal}
      />

      <div className="app-content">
        <h1 className="logo-title">CYBER RPS</h1>

        {isLoadingTelegram ? (
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <div className="loader" style={{ margin: '0 auto 20px' }} />
            <p className="logo-subtitle" style={{ animation: 'pulse 1.5s infinite' }}>ВХОД ЧЕРЕЗ TELEGRAM...</p>
          </div>
        ) : (
          <>
            <p className="logo-subtitle">{isRegistering ? "РЕГИСТРАЦИЯ" : "ВХОД В СИСТЕМУ"}</p>

            <form onSubmit={handleSubmit} className="auth-form">
              <label className="auth-label">
                Никнейм
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  className="auth-input"
                  placeholder="Твой никнейм"
                  maxLength={12}
                  required
                />
              </label>

              {isRegistering && (
                <label className="auth-label">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="auth-input"
                    placeholder="Твой email"
                    required
                  />
                </label>
              )}

              <label className="auth-label">
                Пароль
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="auth-input" placeholder="Пароль" required />
              </label>

              {isRegistering && (
                <div className="avatar-section">
                  <p className="auth-subtitle" style={{ marginTop: 10 }}>Выберите аватар:</p>
                  <div className="avatar-grid">
                    {PRESET_AVATARS.map((src, i) => (
                      <img
                        key={i} src={src}
                        className={`avatar-option ${selectedAvatar === src ? "avatar-selected" : ""}`}
                        onClick={() => setSelectedAvatar(src)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" className="primary-btn">
                {isRegistering ? "Создать аккаунт" : "Войти"}
              </button>

              <p style={{ textAlign: 'center', marginTop: 15, color: '#aaa', cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => setIsRegistering(!isRegistering)}>
                {isRegistering ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Создать"}
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
};