// src/sounds/useSound.ts
import { useCallback } from 'react';

// Пути к файлам в папке public
const SOUND_PATHS = {
  click_soft: "/sounds/button-click-short-calm-gentle.mp3", // Мягкий клик (назад, закрыть)
  click_main: "/sounds/button-click-sharp-close-low.mp3",   // Основной клик (меню, старт)
  click_sharp: "/sounds/button-click-sharp-noisy-low.mp3",  // Резкий клик (купить, ставка)
  success: "/sounds/clip-title-applique-sound-effects.mp3", // Победа / Бонус
};

export const useSound = () => {
  const play = useCallback((type: keyof typeof SOUND_PATHS) => {
    try {
      const audio = new Audio(SOUND_PATHS[type]);
      audio.volume = 0.03; // Громкость 50%
      audio.play().catch((e) => console.warn("Audio play error:", e));
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }, []);

  return play;
};