// detailed check to see if we are running locally
const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

// If local, use localhost:3000. If remote, use the remote IP.
// If local, use localhost:3000.
// Otherwise, detect if we are on the domain or IP.
const getRemoteApiUrl = () => {
  if (window.location.hostname === "rps-game.ru") {
    return "http://rps-game.ru:3000";
  }
  return "http://185.244.50.22:3000";
};

export const API_URL = isLocal ? "http://localhost:3000" : getRemoteApiUrl();

export const STORAGE_KEY_USER = "cyber-rps-user";
export const STORAGE_KEY_TOKEN = "cyber-rps-token";
export const STORAGE_KEY_PRIVACY = "privacy_policy_needed";