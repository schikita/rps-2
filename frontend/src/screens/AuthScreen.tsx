import React, { useState } from "react";

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
  onLoginSuccess: (userData: any, token: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [nickname, setNickname] = useState(""); 
  // 1. ADD EMAIL STATE
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string>(PRESET_AVATARS[0]);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const endpoint = isRegistering ? "/auth/register" : "/auth/login";
    
    // 2. INCLUDE EMAIL IN REGISTRATION PAYLOAD
    const payload = isRegistering 
      ? { nickname, email, password, avatar: selectedAvatar }
      : { nickname, password };

    try {
      const res = await fetch(`http://185.244.50.22:3000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Something went wrong");

      if (isRegistering) {
        setIsRegistering(false);
        alert("Account created! Please log in.");
      } else {
        onLoginSuccess(data.user, data.token);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="app-root auth-screen">
      <div className="app-gradient-bg" />
      <div className="app-content">
        <h1 className="logo-title">CYBER RPS</h1>
        <p className="logo-subtitle">{isRegistering ? "РЕГИСТРАЦИЯ" : "ВХОД В СИСТЕМУ"}</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label">
            Никнейм
            <input 
                type="text" 
                value={nickname} 
                onChange={e => setNickname(e.target.value)} 
                className="auth-input" 
                required 
            />
          </label>

          {/* 3. ADD EMAIL INPUT (Visible only during registration) */}
          {isRegistering && (
            <label className="auth-label">
              Email
              <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="auth-input" 
                  required 
              />
            </label>
          )}

          <label className="auth-label">
            Пароль
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="auth-input" required />
          </label>

          {isRegistering && (
            <div className="avatar-section">
              <p className="auth-subtitle">Выберите аватар:</p>
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

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="primary-btn">
            {isRegistering ? "Создать аккаунт" : "Войти"}
          </button>

          <p style={{textAlign:'center', marginTop: 15, color: '#aaa', cursor:'pointer'}} onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Создать"}
          </p>
        </form>
      </div>
    </div>
  );
};