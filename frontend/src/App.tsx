import React, { useEffect, useState } from "react";
import { AuthScreen } from "./screens/AuthScreen";
import { GameNavigator } from "./screens/GameNavigator";

// Define the User type to match what the Backend sends (id, nickname, avatar, points)
export type User = {
  id: string;
  nickname: string;
  avatar: string;
  points: number; 
};

const STORAGE_KEY_USER = "cyber-rps-user";
const STORAGE_KEY_TOKEN = "cyber-rps-token";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  // 1. Check for Login on Startup
  useEffect(() => {
    const rawUser = localStorage.getItem(STORAGE_KEY_USER);
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    
    // We need both the user data AND the token to be logged in
    if (rawUser && token) {
      setUser(JSON.parse(rawUser));
    }
  }, []);

  // 2. Handle Successful Login (Data comes from AuthScreen)
  const handleLoginSuccess = (userData: any, token: string) => {
    // Map backend data to our User type
    const newUser: User = { 
        id: userData.id,
        nickname: userData.nickname, 
        avatar: userData.avatar, 
        points: userData.points 
    };

    // Save to LocalStorage
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
    localStorage.setItem(STORAGE_KEY_TOKEN, token);

    // Update State
    setUser(newUser);
  };

  // 3. Handle Logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  };

  // 4. Render
  if (!user) {
    // FIX: Use 'onLoginSuccess' to match the new AuthScreen
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return <GameNavigator user={user} onLogout={logout} />;
};

export default App;