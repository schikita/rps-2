// detailed check to see if we are running locally
const isLocal = 
  window.location.hostname === "localhost" || 
  window.location.hostname === "127.0.0.1";

// If local, use localhost:3000. If remote, use the remote IP.
export const API_URL = isLocal 
  ? "http://localhost:3000" 
  : "http://185.244.50.22:3000";