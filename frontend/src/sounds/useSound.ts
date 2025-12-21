// src/sounds/useSound.ts
import { useCallback } from 'react';

// Пути к файлам в папке public
const SOUND_PATHS = {
  click_soft: "/sounds/button-click-short-calm-gentle.mp3", // Мягкий клик (назад, закрыть)
  click_main: "/sounds/button-click-sharp-close-low.mp3",   // Основной клик (меню, старт)
  click_sharp: "/sounds/button-click-sharp-noisy-low.mp3",  // Резкий клик (купить, ставка)
  success: "/sounds/clip-title-applique-sound-effects.mp3", // Победа / Бонус
};

const STORAGE_KEY_SFX = "cyber-rps-sfx-volume";
const STORAGE_KEY_MUSIC = "cyber-rps-music-volume";

export const getSfxVolume = () => {
  const vol = localStorage.getItem(STORAGE_KEY_SFX);
  return vol !== null ? parseFloat(vol) : 0.5;
};

export const setSfxVolume = (vol: number) => {
  localStorage.setItem(STORAGE_KEY_SFX, vol.toString());
};

export const getMusicVolume = () => {
  const vol = localStorage.getItem(STORAGE_KEY_MUSIC);
  return vol !== null ? parseFloat(vol) : 0.3;
};

export const setMusicVolume = (vol: number) => {
  localStorage.setItem(STORAGE_KEY_MUSIC, vol.toString());
};

// Helper to check if music is playing - simpler approach for now
const isMusicPlaying = () => {
  return false; // Valid stub since we handle music via global audio usually or external components
};

export const useSound = () => {
  const playSound = useCallback((type: keyof typeof SOUND_PATHS) => {
    try {
      const volume = getSfxVolume();
      if (volume <= 0) return;

      const audio = new Audio(SOUND_PATHS[type]);
      audio.volume = volume * 0.1; // Scale down base volume
      audio.play().catch((e) => console.warn("Audio play error:", e));
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }, []);

  // Stub for playing background music if not implemented centrally
  const playMusic = useCallback((type: string) => {
    // Implement logic if music paths exist, or leave as placeholder
    console.log(`Playing music: ${type}`);
  }, []);

  return {
    playSound,
    getMusicVolume,
    isMusicPlaying,
    playMusic
  };
};