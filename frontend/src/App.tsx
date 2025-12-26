import React, { useEffect, useState, useCallback } from "react";
import { AuthScreen } from "./screens/AuthScreen";
import { GameNavigator } from "./screens/GameNavigator";
import { PrivacyPolicyScreen } from "./screens/PrivacyPolicyScreen";
import { API_URL, STORAGE_KEY_USER, STORAGE_KEY_TOKEN, STORAGE_KEY_PRIVACY } from "./config";
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

interface BackendUser {
  id: string;
  username?: string;
  nickname?: string;
  email: string;
  avatar?: string;
  coins?: number;
  Items?: { id: number }[];
  lastLoginDate?: string;
  last_claim_date?: string;
  loginStreak?: number;
  equippedBorderId?: number;
  wins?: number;
  losses?: number;
  total_earned?: number;
}

const getToken = () => localStorage.getItem(STORAGE_KEY_TOKEN);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    return raw ? JSON.parse(raw) : null;
  });
  const [showPreloader, setShowPreloader] = useState(true);

  // Initialize privacy state based on localStorage flag
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_PRIVACY) === "true";
  });

  const mapBackendUserToFrontend = (data: BackendUser): User => {
    const inv: number[] = data.Items ? data.Items.map((i) => i.id) : [];

    return {
      id: data.id,
      nickname: data.username || data.nickname || "Player",
      email: data.email,
      avatar: data.avatar || "/avatars/skin-1.jpg",
      points: data.coins !== undefined ? data.coins : 1000,
      inventory: inv,
      last_claim_date: data.lastLoginDate || data.last_claim_date,
      streak: data.loginStreak || 0,
      equippedBorderId: data.equippedBorderId || null,
      wins: data.wins || 0,
      losses: data.losses || 0,
      total_earned: data.total_earned || 0
    };
  };

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  }, []);

  const refreshUser = useCallback(async () => {
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
  }, [logout]);

  useEffect(() => {
    const token = getToken();
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refreshUser();
    }
  }, [refreshUser]);

  const handleLoginSuccess = useCallback((userData: unknown, token: string) => {
    const newUser = mapBackendUserToFrontend(userData as BackendUser);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    setUser(newUser);

    // Check if we need to show privacy policy (set during registration)
    if (localStorage.getItem(STORAGE_KEY_PRIVACY) === "true") {
      setShowPrivacyPolicy(true);
      // RE-ENABLE PRELOADER FOR NEW REGISTRATIONS
      // This ensures the intro video plays before showing the policy
      setShowPreloader(true);
    }
  }, []);

  const handlePrivacyAccept = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_PRIVACY);
    setShowPrivacyPolicy(false);
  }, []);



  if (showPreloader) {
    return <Preloader onFinish={() => setShowPreloader(false)} />;
  }

  if (!user) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Intercepting GameNavigator to show Privacy Policy if needed
  if (showPrivacyPolicy) {
    return <PrivacyPolicyScreen onAccept={handlePrivacyAccept} refreshUser={refreshUser} />;
  }

  return <GameNavigator
    user={user}
    onLogout={logout}
    token={getToken()!}
    refreshUser={refreshUser}
  />;
};

export default App;
