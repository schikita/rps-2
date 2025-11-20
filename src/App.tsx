import React, { useEffect, useState } from "react";
import { AuthScreen } from "./screens/AuthScreen";
import { GamePreview } from "./screens/GamePreview";

export type User = {
  nickname: string;
};

const STORAGE_KEY = "cyber-rps-user";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  // читаем "авторизацию" из localStorage
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as User;
      if (parsed?.nickname) setUser(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const handleLogin = (nickname: string) => {
    const u: User = { nickname };
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (!user) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return <GamePreview user={user} onLogout={handleLogout} />;
};

export default App;
