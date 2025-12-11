import React, { useEffect, useState } from "react";
import { AuthScreen } from "./screens/AuthScreen";
import { GameNavigator } from "./screens/GameNavigator";
import { API_URL } from "./config";

export type User = {
  id: string;
  nickname: string;
  email: string;
  avatar: string;
  points: number;
  inventory: string;
  last_claim_date?: string; // NEW: Track daily bonus
};

const STORAGE_KEY_USER = "cyber-rps-user";
const STORAGE_KEY_TOKEN = "cyber-rps-token";

const getToken = () => localStorage.getItem(STORAGE_KEY_TOKEN);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  const refreshUser = async () => {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/api/user`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!res.ok) {
            if (res.status === 403 || res.status === 401) logout();
            throw new Error("Failed to fetch user data");
        }

        const data = await res.json();
        const updatedUser: User = data.user;
        
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updatedUser));
        setUser(updatedUser);

    } catch (error) {
        console.error("Error refreshing user:", error);
    }
  };

  useEffect(() => {
    const rawUser = localStorage.getItem(STORAGE_KEY_USER);
    const token = getToken();
    
    if (rawUser && token) {
      setUser(JSON.parse(rawUser));
      refreshUser();
    }
  }, []);

  const handleLoginSuccess = (userData: any, token: string) => {
    const newUser: User = { 
        id: userData.id,
        nickname: userData.nickname,
        email: userData.email, 
        avatar: userData.avatar, 
        points: userData.points,
        inventory: userData.inventory || '["default"]',
        last_claim_date: userData.last_claim_date // Save date
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

  return <GameNavigator 
    user={user} 
    onLogout={logout} 
    token={getToken()!} 
    refreshUser={refreshUser}
  />;
};

export default App;