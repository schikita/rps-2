import React, { useEffect, useState, useCallback } from "react";
import { AuthScreen } from "./screens/AuthScreen";
import { GameNavigator } from "./screens/GameNavigator";
import { PrivacyPolicyScreen } from "./screens/PrivacyPolicyScreen";
import { STORAGE_KEY_PRIVACY } from "./config";
import Preloader from "./components/Preloader";
import { useUser } from "./context/UserContext";

const App: React.FC = () => {
  const { user, token, login, refreshUser } = useUser();
  const [showPreloader, setShowPreloader] = useState(true);

  // Initialize privacy state based on localStorage flag
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_PRIVACY) === "true";
  });

  useEffect(() => {
    if (token) {
      refreshUser();
    }
  }, [token, refreshUser]);

  const handleLoginSuccess = useCallback((userData: any, userToken: string) => {
    login(userData, userToken);

    // Check if we need to show privacy policy (set during registration)
    if (localStorage.getItem(STORAGE_KEY_PRIVACY) === "true") {
      setShowPrivacyPolicy(true);
      setShowPreloader(true);
    }
  }, [login]);

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

  return <GameNavigator />;
};

export default App;
