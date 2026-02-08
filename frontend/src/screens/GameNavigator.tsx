import React, { useState, useEffect, useCallback } from "react";
import { getSfxVolume, setSfxVolume, setMusicVolume } from "../sounds/useSound";
// type import removed since unsused in this file now
import { GameScreen } from "./GameScreen";
import { DailyBonusScreen } from "./DailyBonusScreen";
import { API_URL } from "../config";
import { CustomModal } from "../components/CustomModal";
import { useSound } from "../sounds/useSound";
import { useUser } from "../context/UserContext";

type Screen = "menu" | "game" | "shop" | "tournament" | "profile" | "wallet" | "daily" | "leaders";
type NavContext = "menu" | "game";

interface Skin {
  id: number;
  name: string;
  price: number;
  color: string;
  imageId: string;
  type?: 'avatar' | 'border' | 'background' | 'hands' | 'effect';
}

interface LeaderboardEntry {
  id: string | number;
  username: string;
  nickname?: string;
  avatar: string;
  wins: number;
  points?: number;
  coins?: number;
}

interface AchievementData {
  title: string;
  description: string;
  unlocked: boolean;
  icon: string;
}

interface MenuButtonProps {
  title: string;
  subtitle: string;
  icon: string;
  onClick: () => void;
  isTournament?: boolean;
}

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  color: string;
  isFullWidth?: boolean;
  icon: string;
}

interface AchievementProps {
  icon: string;
  unlocked: boolean;
  title: string;
  description?: string;
  onClick: () => void;
}

const PRESET_AVATARS = [
  "/avatars/boy.jpg",
  "/avatars/cyber.jpg",
  "/avatars/princessDune.jpg",
  "/avatars/roboCop.jpg",
  "/avatars/skin-1.jpg",
  "/avatars/skin-2.jpg",
  "/avatars/skin-3.jpg",
  "/avatars/skin-4.jpg",
  "/avatars/skin-5.jpg",
  "/avatars/skin-6.jpg",
];

const DEFAULT_SKIN: Skin = { id: -1, name: "Стандарт", price: 0, color: "#38bdf8", imageId: "default" };

export const GameNavigator: React.FC = () => {
  const { user, token, logout, refreshUser } = useUser();
  const { playSound, playMusic, getMusicVolume, isMusicPlaying, updateMusicVolume } = useSound();

  // Handle global background music (with interaction lock bypass)
  useEffect(() => {
    const startAudio = () => {
      const vol = getMusicVolume();
      if (vol > 0 && !isMusicPlaying()) {
        playMusic('bg_music');
      }
    };

    // Try immediate (might fail if not first navigation)
    startAudio();

    // Also listen for first interaction
    const handleInteraction = () => {
      startAudio();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [getMusicVolume, isMusicPlaying, playMusic]);

  const [shopItems, setShopItems] = useState<Skin[]>([]);
  const [shopCategory, setShopCategory] = useState<'border' | 'background' | 'hands'>('hands');
  const [sfxVolume, setSfxVolState] = useState(getSfxVolume());
  const [musicVolume, setMusicVolState] = useState(getMusicVolume());

  if (!user) return null; // Safety check

  const userStorageKey = `rps_save_${user.nickname}`;
  const balance = user.points;
  const inventory = user.inventory || [];

  const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({
    isOpen: false, title: "", message: "", type: "info"
  });

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setModal({ isOpen: true, title, message, type });
  };

  const closeModal = useCallback(() => {
    playSound('click_soft');
    setModal(prev => ({ ...prev, isOpen: false }));
  }, [playSound]);

  const [equippedSkinId, setEquippedSkinId] = useState<number>(() => {
    if (user.equippedBorderId) return user.equippedBorderId;
    const saved = localStorage.getItem(userStorageKey);
    return saved ? JSON.parse(saved).equippedSkinId : DEFAULT_SKIN.id;
  });

  const [screen, setScreen] = useState<Screen>("menu");
  const [navHistory, setNavHistory] = useState<Screen[]>([]);
  const [navContext, setNavContext] = useState<NavContext>("menu");
  const [gameMode, setGameMode] = useState<"bot" | "pvp">("bot");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isChangingAvatar, setIsChangingAvatar] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementData | null>(null);

  const isBonusReady = !user.last_claim_date || (new Date().toISOString().split('T')[0] !== user.last_claim_date);

  // Helper for stack navigation
  const navigateTo = useCallback((target: Screen) => {
    playSound('click_soft');
    setNavHistory(prev => [...prev, screen]);
    setScreen(target);
  }, [playSound, screen]);

  useEffect(() => {
    if (user.equippedBorderId !== undefined) {
      setEquippedSkinId(user.equippedBorderId || DEFAULT_SKIN.id);
    }
  }, [user.equippedBorderId]);

  useEffect(() => {
    fetch(`${API_URL}/api/shop`)
      .then(res => res.json())
      .then(data => setShopItems(data))
      .catch(err => console.error("Ошибка загрузки магазина", err));
  }, []);

  useEffect(() => {
    localStorage.setItem(userStorageKey, JSON.stringify({ equippedSkinId }));
  }, [equippedSkinId, userStorageKey]);

  const handleBack = useCallback(() => {
    playSound('click_soft');
    if (isChangingAvatar) {
      setIsChangingAvatar(false);
      return;
    }

    if (selectedAchievement) {
      setSelectedAchievement(null);
      return;
    }

    if (modal.isOpen) {
      setModal(prev => ({ ...prev, isOpen: false }));
      return;
    }

    // Special case for leaving the game arena
    if (screen === "game") {
      // Cancel any active match session on the server
      const token = localStorage.getItem("token");
      if (token) {
        fetch(`${API_URL}/api/match/cancel`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => { }); // Ignore errors
      }
      setNavContext("menu");
      setScreen("menu");
      setNavHistory([]);
      return;
    }

    if (navHistory.length > 0) {
      const lastScreen = navHistory[navHistory.length - 1];
      setNavHistory(prev => prev.slice(0, -1));
      setScreen(lastScreen);
    } else {
      if (screen !== "menu") {
        setScreen("menu");
      }
    }
  }, [isChangingAvatar, navHistory, screen, playSound, modal.isOpen, selectedAchievement]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleBack();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleBack]);

  // Telegram BackButton Integration
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg || !tg.BackButton) return;

    const canGoBack = screen !== "menu" || isChangingAvatar || !!selectedAchievement || modal.isOpen;

    if (canGoBack) {
      tg.BackButton.show();
      tg.BackButton.onClick(handleBack);
    } else {
      tg.BackButton.hide();
    }

    return () => {
      tg.BackButton.offClick(handleBack);
    };
  }, [screen, isChangingAvatar, selectedAchievement, modal.isOpen, handleBack]);



  const handleBuy = async (item: Skin) => {
    playSound('click_sharp');
    try {
      const res = await fetch(`${API_URL}/api/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        showModal("Ошибка", data.error || "Не удалось купить", "error");
        return;
      }
      playSound('success');
      await refreshUser();
      showModal("Успех!", `Вы купили ${item.name}!`, "success");
    } catch {
      showModal("Ошибка сети", "Проверьте соединение", "error");
    }
  };

  const startGame = (mode: "bot" | "pvp") => {
    playSound('click_main');
    setGameMode(mode);
    setNavContext("game");
    setNavHistory(prev => [...prev, "menu"]);
    setScreen("game");
  };

  const goToAuxiliaryScreen = (target: Screen) => {
    navigateTo(target);
  };

  const goToLeaderboard = async () => {
    navigateTo("leaders");
    try {
      const res = await fetch(`${API_URL}/api/leaderboard`);
      const data = await res.json();
      setLeaderboard(data);
    } catch (error) {
      console.error("Ошибка загрузки таблицы лидеров", error);
      showModal("Ошибка", "Не удалось загрузить таблицу лидеров", "error");
    }
  };

  const goToTournament = () => {
    navigateTo("tournament");
  };

  const handleEquip = async (id: number, itemType?: 'border' | 'background' | 'hands') => {
    playSound('click_sharp');
    const type = itemType || shopCategory;
    try {
      await fetch(`${API_URL}/api/equip`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ itemId: id, itemType: type }),
      });
      if (type === 'border') {
        setEquippedSkinId(id);
      }
      await refreshUser();
      playSound('success');
    } catch (e) {
      console.error("Ошибка экипировки", e);
    }
  };

  const handleAvatarChange = async (newAvatarUrl: string) => {
    playSound('click_sharp');
    try {
      const res = await fetch(`${API_URL}/api/user/avatar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ avatar: newAvatarUrl }),
      });
      if (!res.ok) {
        return;
      }
      playSound('success');
      await refreshUser();
      setIsChangingAvatar(false);
    } catch (e) {
      console.error("Avatar change error:", e);
    }
  };

  const handleLogout = () => {
    playSound('click_soft');
    logout();
  };

  const currentSkin = shopItems.find(i => i.id === equippedSkinId) || DEFAULT_SKIN;
  const currentThemeColor = currentSkin.color || "#38bdf8";

  // Level calculation helper - XP from wins and games played
  const calculateLevel = (wins: number, losses: number) => {
    const xp = wins * 100 + (wins + losses) * 10; // 100 XP per win, 10 XP per game
    let level = 1;
    let xpForNextLevel = 200;
    let totalXpRequired = 0;

    while (xp >= totalXpRequired + xpForNextLevel) {
      totalXpRequired += xpForNextLevel;
      level++;
      xpForNextLevel = Math.floor(200 * Math.pow(1.2, level - 1));
    }

    const currentLevelXp = xp - totalXpRequired;
    const progress = (currentLevelXp / xpForNextLevel) * 100;

    return { level, xp, currentLevelXp, xpForNextLevel, progress };
  };

  const getRankTitle = (level: number) => {
    if (level >= 50) return 'ЛЕГЕНДА КИБЕРСПОРТА';
    if (level >= 30) return 'ГРАНД-МАСТЕР';
    if (level >= 20) return 'МАСТЕР';
    if (level >= 15) return 'ЭКСПЕРТ';
    if (level >= 10) return 'ПРОФЕССИОНАЛ';
    if (level >= 5) return 'ОПЫТНЫЙ';
    return 'НОВИЧОК';
  };

  const userLevel = calculateLevel(user.wins, user.losses);

  // Map imageId to actual CSS background styles
  const getBackgroundStyle = () => {
    const bgItem = (user as any).Items?.find((i: any) => i.id === user.equippedBackgroundId);
    const bgId = bgItem?.imageId;
    const bgColor = bgItem?.color;

    if (bgId && bgId !== 'default') {
      // Photo backgrounds
      if (bgId === 'zakat' || bgId === 'cosmos') {
        return `url('/images/${bgId}.jpg') center/cover no-repeat`;
      }
      // Color-based backgrounds (Neon)
      if (bgId === 'bg_neon') {
        return `radial-gradient(circle at 15% 0%, ${bgColor}80, transparent 55%), radial-gradient(circle at 85% 80%, ${bgColor}80, transparent 55%), linear-gradient(135deg, #0f172a 0%, #020617 100%)`;
      }
      // Fallback to image
      return `url('/images/${bgId}.png') center/cover no-repeat`;
    }

    // Original dynamic theme color background for 'default' or null
    return `radial-gradient(circle at 15% 0%, ${currentThemeColor}60, transparent 55%), radial-gradient(circle at 85% 80%, ${currentThemeColor}60, transparent 55%)`;
  };

  const shopCardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    padding: 10,
    borderRadius: 12,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    aspectRatio: '1 / 1.1' // Slightly taller than square, matches column width proportion
  };

  const actionContainerStyle: React.CSSProperties = {
    marginTop: 'auto',
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  };

  const borderSkin = (user as any).Items?.find((i: any) => i.id === user.equippedBorderId);
  const borderClass = borderSkin?.imageId ? `border-${borderSkin.imageId}` : '';

  return (
    <div className={`app-root ${borderClass}`}>
      <div className="app-gradient-bg" style={{ background: getBackgroundStyle() }} />



      <CustomModal
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onClose={closeModal}
      />

      <div className="app-content">


        {screen !== "game" && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, marginTop: 10, padding: "0 4px" }}>
            <div
              className="user-pill menu-card"
              onClick={() => goToAuxiliaryScreen("profile")}
              style={{
                padding: '8px 12px',
                borderRadius: '999px',
                gap: 8,
                cursor: 'pointer',
                border: '1px solid rgba(148, 163, 255, 0.4)',
                maxWidth: '160px',
                overflow: 'hidden'
              }}
            >
              <img src={user.avatar} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="User" />
              <span style={{
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {user.nickname}
              </span>
            </div>

            <div
              className="wallet-widget menu-card"
              onClick={() => goToAuxiliaryScreen("daily")}
              style={{ borderColor: currentThemeColor, cursor: 'pointer', padding: '8px 12px', borderRadius: '999px', gap: 8, position: 'relative' }}
            >
              <img src="/images/coin.png" alt="coin" className="coin-icon" />
              <span style={{ color: currentThemeColor }}>{balance}</span>
              {isBonusReady && <div className="notification-dot" />}
            </div>
          </div>
        )}

        {screen === "menu" && (
          <div className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h1 className="logo-title" style={{ fontSize: '2.5rem', fontWeight: 900 }}>CYBER RPS</h1>
            <p className="logo-subtitle" style={{ marginBottom: 40 }}>ЦЕНТРАЛЬНАЯ СИСТЕМА</p>

            <div style={{ display: 'grid', gap: 14 }}>
              <MenuButton title="Тренировка" subtitle="Фарм монет" icon="/images/Training.png" onClick={() => startGame("bot")} />
              <MenuButton title="Арена PvP" subtitle="Ставки" icon="/images/pvp.png" onClick={() => startGame("pvp")} />
              <MenuButton
                title="ТОП ИГРОКОВ"
                subtitle="Зал славы"
                icon="/images/top.png"
                onClick={goToLeaderboard}
              />
              <MenuButton
                title="ТУРНИР"
                subtitle="Стань абсолютным чемпионом"
                icon="/images/turnir.png"
                onClick={goToTournament}
                isTournament={true}
              />
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 15, marginBottom: 15 }}>
              <MenuButton
                title="КАСТОМИЗАЦИЯ"
                subtitle="Скины для рук"
                icon="/images/shop.png"
                onClick={() => goToAuxiliaryScreen("shop")}
              />
            </div>
          </div>
        )}

        {screen === "shop" && (
          <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <button onClick={handleBack} className="back-btn-new" style={{ marginBottom: 15 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <button
                onClick={() => setShopCategory('hands')}
                className={`shop-tab ${shopCategory === 'hands' ? 'active' : ''}`}
                style={{ flex: 1, marginTop: '10px', padding: '10px', borderRadius: '12px', background: shopCategory === 'hands' ? `${currentThemeColor}20` : 'rgba(255,255,255,0.05)', border: `1px solid ${shopCategory === 'hands' ? currentThemeColor : 'rgba(255,255,255,0.1)'}`, color: shopCategory === 'hands' ? currentThemeColor : '#9ca3af', fontWeight: 'bold', fontSize: '0.8rem' }}
              >
                РУКИ
              </button>
              <button
                onClick={() => setShopCategory('background')}
                className={`shop-tab ${shopCategory === 'background' ? 'active' : ''}`}
                style={{ flex: 1, marginTop: '10px', padding: '10px', borderRadius: '12px', background: shopCategory === 'background' ? `${currentThemeColor}20` : 'rgba(255,255,255,0.05)', border: `1px solid ${shopCategory === 'background' ? currentThemeColor : 'rgba(255,255,255,0.1)'}`, color: shopCategory === 'background' ? currentThemeColor : '#9ca3af', fontWeight: 'bold', fontSize: '0.8rem' }}
              >
                ФОНЫ
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, overflowY: 'auto', paddingBottom: 20, flex: 1, alignContent: 'start' }}>



              {/* Items filtered by category - sort defaults first */}
              {[...shopItems.filter(item => item.type === shopCategory)].sort((a, b) => {
                if (a.price === 0 && b.price !== 0) return -1;
                if (a.price !== 0 && b.price === 0) return 1;
                return 0;
              }).map(item => {
                const isOwned = inventory.includes(item.id) || item.price === 0;
                const isEquipped = shopCategory === 'border'
                  ? equippedSkinId === item.id
                  : shopCategory === 'background'
                    ? user.equippedBackgroundId === item.id
                    : user.equippedHandsId === item.id;
                return (
                  <div key={item.id} style={shopCardStyle}>
                    <div>
                      <div style={{
                        width: '100%',
                        height: 60,
                        background: (item.type === 'hands' || item.type === 'background') ? 'transparent' : (item.color || '#fff'),
                        borderRadius: (item.type === 'hands' || item.type === 'background') ? '0' : '50%',
                        margin: '0 auto 10px',
                        boxShadow: (item.type === 'hands' || item.type === 'background') ? 'none' : `0 0 15px ${item.color}80`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.2rem',
                        overflow: 'hidden'
                      }}>
                        {item.type === 'hands' ? (
                          <img
                            src={
                              item.imageId === 'default' ? "/images/default-rock.png" :
                                item.imageId === 'tanos' ? "/images/tanos-rock.png" :
                                  item.imageId === 'robocop' ? "/images/robocop-rock.png" :
                                    `/images/${item.imageId}_rock.png`
                            }
                            alt={item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onError={(e) => { e.currentTarget.src = "/images/coin.png"; }}
                          />
                        ) : item.type === 'background' ? (
                          (item.imageId === 'default' || item.imageId === 'bg_neon') ? (
                            <div style={{
                              width: '100%',
                              height: '100%',
                              background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}99 50%, ${item.color}66 100%)`,
                              borderRadius: 8,
                              boxShadow: `0 0 15px ${item.color}60, inset 0 0 20px ${item.color}40`
                            }} />
                          ) : (
                            <img
                              src={
                                (item.imageId === 'zakat' || item.imageId === 'cosmos') ? `/images/${item.imageId}.jpg` :
                                  `/images/${item.imageId}.png`
                              }
                              alt={item.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                              onError={(e) => { e.currentTarget.src = "/images/coin.png"; }}
                            />
                          )
                        ) : (
                          /* Border type - CSS visual instead of emoji for cross-platform consistency */
                          <div style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: 8,
                            border: `3px solid ${item.color || '#38bdf8'}`,
                            background: 'rgba(255,255,255,0.05)',
                            boxShadow: `0 0 10px ${item.color}40, inset 0 0 15px ${item.color}20`
                          }} />
                        )}
                      </div>
                      <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                    </div>

                    <div style={actionContainerStyle}>
                      {!isOwned ? (
                        <button className="shop-btn shop-btn-buy" onClick={() => handleBuy(item)}>{item.price} <img src="/images/coin.png" alt="coin" className="coin-icon" /></button>
                      ) : isEquipped ? (
                        <div style={{ fontSize: '0.8rem', color: item.color, fontWeight: 'bold' }}>ВЫБРАНО</div>
                      ) : (
                        <button className="shop-btn shop-btn-equip" onClick={() => handleEquip(item.id)} style={{ color: item.color }}>НАДЕТЬ</button>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Empty state */}
              {shopItems.filter(item => item.type === shopCategory).length === 0 && shopCategory !== 'border' && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#6b7280' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔒</div>
                  <div>Скоро появятся новые предметы!</div>
                </div>
              )}
            </div>
          </div>
        )}

        {screen === "daily" && (
          <DailyBonusScreen
            onBack={handleBack}
            themeColor={currentThemeColor}
            showAlert={showModal}
          />
        )}

        {navContext === "game" && (
          <div className="animate-fade-in" style={{ height: '100%', display: screen === "game" ? 'block' : 'none' }}>
            <GameScreen
              mode={gameMode}
              onBack={handleBack}
              onOpenWallet={() => goToAuxiliaryScreen("daily")}
              themeColor={currentThemeColor}
              isVisible={screen === "game"}
            />
          </div>
        )}

        {screen === "leaders" && (
          <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <button onClick={handleBack} className="back-btn-new">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <div style={{ flex: 1, textAlign: 'center', fontFamily: 'Bounded', fontSize: '1.2rem', letterSpacing: '0.1em' }}>ТОП ИГРОКОВ</div>
              <div style={{ width: 42 }}></div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {leaderboard.map((player, idx) => (
                <div key={player.id} className="menu-card" style={{
                  padding: '12px 16px',
                  background: String(player.id) === String(user.id) ? `${currentThemeColor}15` : 'rgba(255,255,255,0.03)',
                  borderColor: String(player.id) === String(user.id) ? currentThemeColor : 'rgba(255,255,255,0.1)',
                  animationDelay: `${idx * 0.05}s`
                }}>
                  <div style={{ width: 30, fontWeight: '900', color: idx < 3 ? '#facc15' : '#64748b', fontSize: '1.1rem' }}>
                    #{idx + 1}
                  </div>
                  <img src={player.avatar} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${idx < 3 ? '#facc15' : 'transparent'}` }} alt="avatar" />
                  <div style={{ flex: 1, fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                    {player.nickname || player.username}
                    {String(player.id) === String(user.id) && <span style={{ marginLeft: 8, fontSize: '0.6rem', background: currentThemeColor, color: '#000', padding: '2px 6px', borderRadius: 4, verticalAlign: 'middle' }}>ВЫ</span>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#4ade80', fontWeight: '900', fontSize: '0.9rem' }}>{player.wins} 🏆</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {screen === "tournament" && (
          <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 25, position: 'relative' }}>
              <button onClick={handleBack} className="back-btn-new" style={{ position: 'absolute', left: 0 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <div style={{ flex: 1, textAlign: 'center', fontFamily: 'Bounded', fontSize: '1.4rem', letterSpacing: '0.15em' }}>ТУРНИР</div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Main Card */}
              <div className="menu-card" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '40px 20px',
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.03)',
                borderStyle: 'dashed',
                borderColor: `${currentThemeColor}40`
              }}>
                <div style={{ fontSize: '4rem', marginBottom: 15, filter: 'drop-shadow(0 0 10px rgba(255,255,0,0.3))' }}>🏆</div>
                <div style={{
                  fontFamily: 'Bounded',
                  fontSize: '1.8rem',
                  marginBottom: 15,
                  color: currentThemeColor,
                  textShadow: `0 0 15px ${currentThemeColor}80`
                }}>СКОРО В ИГРЕ</div>
                <div style={{
                  color: '#9ca3af',
                  fontSize: '1rem',
                  lineHeight: '1.5',
                  maxWidth: '85%'
                }}>
                  Глобальное соревнование Cyber RPS Championship <br />
                  Готовьте свои навыки к первой лиге сезона.
                </div>
              </div>

              {/* Next Tournament Date Card */}
              <div className="menu-card" style={{
                padding: '30px 20px',
                textAlign: 'center',
                background: `linear-gradient(180deg, ${currentThemeColor}10 0%, rgba(255,255,255,0.02) 100%)`,
                border: `1px solid ${currentThemeColor}30`,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '4rem', opacity: 0.05, transform: 'rotate(15deg)' }}>📅</div>
                <div style={{ fontSize: '0.8rem', color: currentThemeColor, fontWeight: 800, marginBottom: 15, letterSpacing: '0.2em' }}>НАЧАЛО СЛЕДУЮЩЕГО ТУРНИРА</div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 25, alignItems: 'center', marginBottom: 5 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.2rem', fontWeight: 900, lineHeight: 1, fontFamily: 'Bounded' }}>17</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 6, fontWeight: 600 }}>ИЮЛЯ</div>
                  </div>
                  <div style={{ width: 2, height: 45, background: `linear-gradient(to bottom, transparent, ${currentThemeColor}40, transparent)` }}></div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.2rem', fontWeight: 900, lineHeight: 1, fontFamily: 'Bounded' }}>19:00</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 6, fontWeight: 600 }}>МСК (UTC+3)</div>
                  </div>
                </div>
              </div>

              {/* Prize Pool Row */}
              <div className="menu-card" style={{ padding: '20px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderColor: 'rgba(250, 204, 21, 0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: '#facc15', fontWeight: 700, marginBottom: 10, letterSpacing: '0.1em' }}>ОБЩИЙ ПРИЗОВОЙ ФОНД</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <img src="/images/coin.png" alt="coin" className="coin-icon" style={{ width: '1.5rem', height: '1.5rem' }} />
                  <span style={{ fontWeight: 900, fontSize: '1.8rem', color: '#facc15', fontFamily: 'Bounded' }}>5,000</span>
                  <span style={{ color: '#facc15', fontSize: '0.9rem', fontWeight: 700 }}>МОНЕТ</span>
                </div>
              </div>

            </div>
          </div>
        )}
        {screen === "profile" && (
          <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <button onClick={handleBack} className="back-btn-new">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <div style={{ flex: 1, textAlign: 'center', fontFamily: 'Bounded', fontSize: '1.2rem', letterSpacing: '0.1em' }}>ПРОФИЛЬ</div>
              <div style={{ width: 42 }}></div>
            </div>

            <div className="profile-container" style={{ flex: 1, overflowY: 'auto', paddingBottom: 20 }}>
              <div style={{ textAlign: 'center', marginBottom: 30, position: 'relative' }}>
                <div
                  onClick={() => setIsChangingAvatar(!isChangingAvatar)}
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    padding: 8,
                    borderRadius: '50%',
                    background: `conic-gradient(${currentThemeColor} ${Math.round((user.wins / (user.wins + user.losses || 1)) * 100)}%, rgba(255,255,255,0.1) 0%)`,
                    cursor: 'pointer'
                  }}
                >
                  <img
                    src={user.avatar}
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      border: `4px solid #0f172a`,
                      objectFit: 'cover',
                      display: 'block'
                    }}
                    alt="Avatar"
                  />
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: '#38bdf8',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '3px solid #0f172a',
                    fontSize: '0.8rem'
                  }}>
                    ✏️
                  </div>
                  <div style={{
                    position: 'absolute',
                    bottom: 5,
                    right: 5,
                    background: currentThemeColor,
                    color: '#000',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '900',
                    fontSize: '0.8rem',
                    border: '3px solid #0f172a',
                    boxShadow: `0 0 10px ${currentThemeColor}`
                  }}>
                    {userLevel.level}
                  </div>
                </div>

                {isChangingAvatar && (
                  <div className="animate-scale-in" style={{
                    marginTop: 15,
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                    background: 'rgba(0,0,0,0.3)',
                    padding: 15,
                    borderRadius: 20,
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    {PRESET_AVATARS.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        onClick={() => handleAvatarChange(url)}
                        style={{
                          width: 45,
                          height: 45,
                          borderRadius: '50%',
                          cursor: 'pointer',
                          border: user.avatar === url ? `2px solid ${currentThemeColor}` : '2px solid transparent'
                        }}
                        alt="preset"
                      />
                    ))}
                  </div>
                )}

                <h2 style={{ fontFamily: 'Bounded', marginTop: 15, fontSize: '1.8rem', marginBottom: 4 }}>{user.nickname}</h2>

                {/* Level Badge and Rank */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    background: `linear-gradient(135deg, ${currentThemeColor}, ${currentThemeColor}99)`,
                    padding: '4px 12px',
                    borderRadius: 20,
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    letterSpacing: '0.1em',
                    boxShadow: `0 0 10px ${currentThemeColor}40`
                  }}>
                    LVL {userLevel.level}
                  </div>
                  <div style={{ color: currentThemeColor, fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 800 }}>
                    {getRankTitle(userLevel.level)}
                  </div>
                </div>

                {/* XP Progress Bar */}
                <div style={{ width: '100%', maxWidth: 280, margin: '0 auto' }}>
                  <div style={{
                    width: '100%',
                    height: 8,
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 4,
                    overflow: 'hidden',
                    marginBottom: 4
                  }}>
                    <div style={{
                      width: `${userLevel.progress}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${currentThemeColor}, ${currentThemeColor}cc)`,
                      borderRadius: 4,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#64748b', textAlign: 'center' }}>
                    {userLevel.currentLevelXp} / {userLevel.xpForNextLevel} XP
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <StatCard label="ПОБЕДЫ" value={user.wins} color="#4ade80" icon="🏆" />
                <StatCard label="ПОРАЖЕНИЯ" value={user.losses} color="#f87171" icon="💀" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <StatCard
                  label="ВИНРЕЙТ"
                  value={`${Math.round((user.wins / (user.wins + user.losses || 1)) * 100)}%`}
                  color="#38bdf8"
                  isFullWidth={true}
                  icon="📈"
                />
                <StatCard
                  label="ВСЕГО ЗАРАБОТАНО"
                  value={<>{user.total_earned} <img src="/images/coin.png" alt="coin" className="coin-icon" /></>}
                  color="#facc15"
                  isFullWidth={true}
                  icon="💎"
                />
              </div>

              <div style={{ marginTop: 30 }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 15, textAlign: 'center', letterSpacing: '0.1em' }}>ДОСТИЖЕНИЯ</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 15 }}>
                  <Achievement
                    icon="🎯"
                    unlocked={user.wins > 0}
                    title="Первая кровь"
                    description="Одержите свою первую победу в любом режиме."
                    onClick={() => setSelectedAchievement({ title: "Первая кровь", description: "Одержите свою первую победу в любом режиме.", unlocked: user.wins > 0, icon: "🎯" })}
                  />
                  <Achievement
                    icon="🔥"
                    unlocked={user.wins >= 5}
                    title="В огне"
                    description="Одержите 5 побед над противниками."
                    onClick={() => setSelectedAchievement({ title: "В огне", description: "Одержите 5 побед над противниками.", unlocked: user.wins >= 5, icon: "🔥" })}
                  />
                  <Achievement
                    icon="👑"
                    unlocked={user.total_earned >= 1000}
                    title="Богач"
                    description="Заработайте суммарно 1000 монет."
                    onClick={() => setSelectedAchievement({ title: "Богач", description: "Заработайте суммарно 1000 монет за все время игры.", unlocked: user.total_earned >= 1000, icon: "👑" })}
                  />
                  <Achievement
                    icon="⚡"
                    unlocked={user.streak >= 3}
                    title="Марафонец"
                    description="Одержите 3 победы подряд."
                    onClick={() => setSelectedAchievement({ title: "Марафонец", description: "Наберите серию из 3 побед подряд в PvP или против бота.", unlocked: user.streak >= 3, icon: "⚡" })}
                  />
                </div>
              </div>

              <div style={{ marginTop: 30, padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 20, textAlign: 'center', letterSpacing: '0.1em' }}>НАСТРОЙКИ ЗВУКА</div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem' }}>
                    <span>Музыка</span>
                    <span style={{ color: currentThemeColor }}>{Math.round(musicVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0" max="1" step="0.01"
                    value={musicVolume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setMusicVolState(val);
                      setMusicVolume(val);
                      updateMusicVolume(val);
                    }}
                    onInput={(e) => {
                      // iOS: Also handle onInput for real-time updates during drag
                      const val = parseFloat((e.target as HTMLInputElement).value);
                      updateMusicVolume(val);
                    }}
                    onTouchEnd={(e) => {
                      // iOS: Ensure audio is triggered on touch end (direct user interaction)
                      const val = parseFloat((e.target as HTMLInputElement).value);
                      setMusicVolume(val);
                      updateMusicVolume(val);
                    }}
                    onMouseUp={(e) => {
                      // Desktop: Apply on mouse up as well
                      const val = parseFloat((e.target as HTMLInputElement).value);
                      updateMusicVolume(val);
                    }}
                    style={{ width: '100%', accentColor: currentThemeColor }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem' }}>
                    <span>Эффекты</span>
                    <span style={{ color: currentThemeColor }}>{Math.round(sfxVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0" max="1" step="0.01"
                    value={sfxVolume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setSfxVolState(val);
                      setSfxVolume(val);
                      const audio = new Audio("/sounds/button-click-short-calm-gentle.mp3");
                      audio.volume = val * 0.1;
                      audio.play().catch(() => { });
                    }}
                    style={{ width: '100%', accentColor: currentThemeColor }}
                  />
                </div>
              </div>
            </div>

            <div style={{ padding: '20px 0', marginTop: 'auto' }}>
              <button
                className="btn-action-exit"
                style={{ width: '100%' }}
                onClick={handleLogout}
              >
                ВЫЙТИ ИЗ АККАУНТА
              </button>
            </div>
          </div>
        )}

        {selectedAchievement && (
          <div
            className="animate-fade-in"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(10px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}
            onClick={() => setSelectedAchievement(null)}
          >
            <div
              className="animate-scale-in menu-card"
              style={{
                flexDirection: 'column',
                padding: '40px 30px',
                textAlign: 'center',
                maxWidth: 320,
                borderColor: selectedAchievement.unlocked ? `${currentThemeColor}60` : 'rgba(255,255,255,0.1)',
                background: 'rgba(15, 23, 42, 0.95)',
                boxShadow: selectedAchievement.unlocked ? `0 0 40px ${currentThemeColor}20` : 'none'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{
                fontSize: '4rem',
                marginBottom: 20,
                filter: selectedAchievement.unlocked ? 'none' : 'grayscale(1) opacity(0.3)'
              }}>
                {selectedAchievement.icon}
              </div>
              <h3 style={{ fontFamily: 'Bounded', fontSize: '1.2rem', marginBottom: 10, color: '#fff' }}>
                {selectedAchievement.title.toUpperCase()}
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: 25 }}>
                {selectedAchievement.description}
              </p>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: selectedAchievement.unlocked ? '#4ade80' : '#f87171',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                background: selectedAchievement.unlocked ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                padding: '8px 16px',
                borderRadius: '99px',
                border: `1px solid ${selectedAchievement.unlocked ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`
              }}>
                {selectedAchievement.unlocked ? 'ДОСТИГНУТО ✓' : 'ЕЩЕ НЕ ПОЛУЧЕНО'}
              </div>

              <button
                onClick={() => setSelectedAchievement(null)}
                className="secondary-btn"
                style={{
                  marginTop: 30,
                  width: '100%',
                  padding: '12px',
                  borderRadius: '14px',
                  fontSize: '0.9rem',
                  fontWeight: 800
                }}
              >
                ЗАКРЫТЬ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MenuButton: React.FC<MenuButtonProps> = ({ title, subtitle, icon, onClick, isTournament }) => {
  const containerClass = isTournament ? "menu-card tournament-card" : "menu-card";
  const { playSound } = useSound();

  const handleClick = () => {
    playSound('click_main');
    onClick();
  };

  return (
    <div className={containerClass} onClick={handleClick}>
      <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: '4px' }}>
        {icon.startsWith("/") ? (
          <img src={icon} alt={title} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        ) : (
          <span style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={isTournament ? "tournament-text" : "menu-title"} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ fontSize: '0.8rem', color: isTournament ? '#facc15' : '#9ca3af', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>
      </div>
    </div>
  );
};

const StatCard: React.FC<StatCardProps> = ({ label, value, color, isFullWidth, icon }) => (
  <div className="menu-card" style={{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    gridColumn: isFullWidth ? 'span 2' : 'span 1',
    borderColor: `${color}40`,
    background: `linear-gradient(135deg, ${color}15 0%, transparent 100%)`,
    padding: '12px 16px',
    minHeight: '70px'
  }}>
    <div style={{
      width: 36,
      height: 36,
      borderRadius: '10px',
      background: `${color}20`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.1rem',
      flexShrink: 0
    }}>
      {icon}
    </div>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ fontSize: '0.6rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#fff', lineHeight: 1 }}>{value}</div>
    </div>
  </div>
);

const Achievement: React.FC<AchievementProps> = ({ icon, unlocked, title, onClick }) => {
  const { playSound } = useSound();
  return (
    <div
      onClick={() => {
        playSound('click_main');
        onClick();
      }}
      style={{
        width: 50,
        height: 50,
        borderRadius: '14px',
        background: unlocked ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
        filter: unlocked ? 'none' : 'grayscale(1)',
        opacity: unlocked ? 1 : 0.4,
        border: unlocked ? '1px solid rgba(255,255,255,0.1)' : '1px dashed rgba(255,255,255,0.1)',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
      title={title}
    >
      {icon}
    </div>
  );
};
