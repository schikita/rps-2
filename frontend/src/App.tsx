import React, { useEffect, useState } from "react";
import { AuthScreen } from "./screens/AuthScreen";
import { GameNavigator } from "./screens/GameNavigator";
import { API_URL } from "./config";
import Preloader from "./components/Preloader";

export type User = {
  // ... existing types
  id: string;
  nickname: string;
  email: string;
  avatar: string;
  points: number;
  inventory: number[];
  last_claim_date?: string;
  streak: number;
  equippedBorderId: number | null;
  wins: number;
  losses: number;
  total_earned: number;
};

const STORAGE_KEY_USER = "cyber-rps-user";
const STORAGE_KEY_TOKEN = "cyber-rps-token";

const getToken = () => localStorage.getItem(STORAGE_KEY_TOKEN);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [showPreloader, setShowPreloader] = useState(true);

  const mapBackendUserToFrontend = (data: any): User => {
    // ... existing mapping
    const inv: number[] = data.Items ? data.Items.map((i: any) => i.id) : [];

    return {
      id: data.id,
      nickname: data.username || data.nickname,
      email: data.email,
      avatar: data.avatar || "/avatars/skin-1.jpg",
      points: data.coins !== undefined ? data.coins : 1000,
      inventory: inv,
      last_claim_date: data.lastLoginDate || data.last_claim_date,
      streak: data.loginStreak || 0, // Mappiamo lo streak dal DB
      equippedBorderId: data.equippedBorderId || null,
      wins: data.wins || 0,
      losses: data.losses || 0,
      total_earned: data.total_earned || 0
    };
  };

  const refreshUser = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/user`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 403 || res.status === 401) logout();
        return;
      }

      const data = await res.json();
      const updatedUser = mapBackendUserToFrontend(data.user);

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
    const newUser = mapBackendUserToFrontend(userData);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    setUser(newUser);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  };

  if (showPreloader) {
    return <Preloader onFinish={() => setShowPreloader(false)} />;
  }

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
