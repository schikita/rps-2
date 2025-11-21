import React, { useEffect, useState } from "react";
import { AuthScreen } from "./screens/AuthScreen";
import { GamePreview } from "./screens/GamePreview";

export type User = {
  nickname: string;
  avatar: string;
  points: number;
};

const STORAGE_KEY = "cyber-rps-user";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) setUser(JSON.parse(raw));
  }, []);

  const handleLogin = (nickname: string, avatar: string) => {
    const newUser: User = { nickname, avatar, points: 0 };
    setUser(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  return <GamePreview user={user} onLogout={logout} />;
};

export default App;
