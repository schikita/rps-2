import React, { useEffect, useState } from "react";
import { AuthScreen } from "./screens/AuthScreen";
import { GamePreview } from "./screens/GamePreview";
import { Preloader } from "./components/Preloader";

export type User = {
  nickname: string;
  avatar: string;
  points: number;
};

const STORAGE_KEY = "cyber-rps-user";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);


  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Показываем прелоадер 1.5 секунды
    setTimeout(() => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
      setLoading(false);
    }, 1500);
  }, []);

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

  if (loading) return <Preloader />;

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  return <GamePreview user={user} onLogout={logout} />;
};

export default App;
