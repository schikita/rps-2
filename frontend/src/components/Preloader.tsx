import React, { useEffect, useRef, useState } from "react";

interface PreloaderProps {
  onFinish: () => void;
}

const Preloader: React.FC<PreloaderProps> = ({ onFinish }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      // Start muted to ensure autoplay works reliably across all browsers
      video.muted = true;
      video.play().catch(error => {
        console.warn("Autoplay failed:", error);
      });
    }
  }, []);

  const toggleMute = () => {
    const video = videoRef.current;
    if (video) {
      const newMuted = !isMuted;
      video.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "black",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999
      }}
    >
      {/* Видео на весь экран (без обрезки) */}
      <video
        ref={videoRef}
        src="/videos/Rps_preloader.mp4"
        autoPlay
        playsInline
        onEnded={onFinish}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: "contain"
        }}
      />

      {/* Прозрачный слой для кнопки в мобильной зоне */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '448px',
        height: '100%',
        pointerEvents: 'none', // Пропускаем клики сквозь контейнер
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000
      }}>
        <button
          onClick={toggleMute}
          style={{
            position: "absolute",
            bottom: "30px",
            right: "20px",
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            background: "transparent",
            backdropFilter: "blur(2px)",
            color: "white",
            fontSize: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.3s ease",
            padding: 0,
            outline: 'none',
            pointerEvents: 'auto' // Возвращаем клики только кнопке
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
          }}
        >
          {isMuted ? (
            <span style={{ opacity: 0.4 }}>🔇</span>
          ) : (
            <span style={{ opacity: 0.4 }}>🔊</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Preloader;
