import React from "react";
import "./Preloader.css";

export const Preloader: React.FC = () => {
  return (
    <div className="preloader-container">
      <img src="/logo.jpg" className="preloader-logo" />
      <div className="preloader-spinner"></div>
    </div>
  );
};
