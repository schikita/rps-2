import React, { useEffect, useState } from "react";
import { AuthScreen } from "./screens/AuthScreen";
import { GameNavigator } from "./screens/GameNavigator";

// 1. UPDATE USER TYPE
export type User = {
  id: string;
  nickname: string;
  email: string; // Add this
  avatar: string;
  points: number; 
};

const STORAGE_KEY_USER = "cyber-rps-user";
const STORAGE_KEY_TOKEN = "cyber-rps-token";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const rawUser = localStorage.getItem(STORAGE_KEY_USER);
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    
    if (rawUser && token) {
      setUser(JSON.parse(rawUser));
    }
  }, []);

  const handleLoginSuccess = (userData: any, token: string) => {
    // 2. MAP BACKEND DATA TO USER TYPE
    const newUser: User = { 
        id: userData.id,
        nickname: userData.nickname,
        email: userData.email, // Add this
        avatar: userData.avatar, 
        points: userData.points 
    };

    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
    localStorage.setItem(STORAGE_KEY_TOKEN, token);

    setUser(newUser);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  };

  if (!user) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return <GameNavigator user={user} onLogout={logout} />;
};

export default App;