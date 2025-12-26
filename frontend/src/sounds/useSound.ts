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

// Module-level global to keep track of the music instance across hook calls
let musicAudio: HTMLAudioElement | null = null;

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

  const stopMusic = useCallback(() => {
    if (musicAudio) {
      musicAudio.pause();
      musicAudio.currentTime = 0;
      musicAudio = null;
    }
  }, []);

  const playMusic = useCallback((_type: string) => {
    try {
      const volume = getMusicVolume();
      if (volume <= 0) {
        stopMusic();
        return;
      }

      // If already playing, just update volume
      if (musicAudio) {
        musicAudio.volume = volume * 0.8;
        if (musicAudio.paused) {
          musicAudio.play().catch(e => console.warn("Music play error:", e));
        }
        return;
      }

      // We only have one game music for now
      musicAudio = new Audio("/sounds/Game-Music.mp3");
      musicAudio.volume = volume * 0.8;
      musicAudio.loop = true;
      musicAudio.play().catch((e) => {
        console.warn("Music play error:", e);
        musicAudio = null;
      });
    } catch (e) {
      console.warn("Music error:", e);
    }
  }, [stopMusic]);

  const isMusicPlayingStatus = useCallback(() => {
    return musicAudio !== null && !musicAudio.paused;
  }, []);

  const updateMusicVolume = useCallback((vol: number) => {
    if (musicAudio) {
      musicAudio.volume = vol * 0.8;
    }
  }, []);

  return {
    playSound,
    getMusicVolume,
    isMusicPlaying: isMusicPlayingStatus,
    playMusic,
    stopMusic,
    updateMusicVolume
  };
};