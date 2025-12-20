import React, { useState, useEffect } from "react";
import type { User } from "../App";
import { GameScreen } from "./GameScreen";
import { DailyBonusScreen } from "./DailyBonusScreen";
import { API_URL } from "../config";
import { CustomModal } from "../components/CustomModal";
import { useSound } from "../sounds/useSound";

type Screen = "menu" | "game" | "shop" | "tournament" | "profile" | "wallet" | "daily" | "leaders";
type NavContext = "menu" | "game";

interface Skin {
  id: number;
  name: string;
  price: number;
  color: string;
  imageId: string;
}

const PRESET_AVATARS = [
  "/avatars/skin-1.jpg",
  "/avatars/skin-2.jpg",
  "/avatars/skin-3.jpg",
  "/avatars/skin-4.jpg",
  "/avatars/skin-5.jpg",
  "/avatars/skin-6.jpg",
];

const DEFAULT_SKIN: Skin = { id: -1, name: "Стандарт", price: 0, color: "#38bdf8", imageId: "default" };

interface GameNavigatorProps {
  user: User;
  onLogout: () => void;
  token: string;
  refreshUser: () => Promise<void>;
}

export const GameNavigator: React.FC<GameNavigatorProps> = ({ user, onLogout, token, refreshUser }) => {
  const playSound = useSound();

  const userStorageKey = `rps_save_${user.nickname}`;
  const balance = user.points;
  const inventory = user.inventory || [];

  const [shopItems, setShopItems] = useState<Skin[]>([]);

  const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({
    isOpen: false, title: "", message: "", type: "info"
  });

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setModal({ isOpen: true, title, message, type });
  };

  const closeModal = () => {
    playSound('click_soft');
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  const [equippedSkinId, setEquippedSkinId] = useState<number>(() => {
    if (user.equippedBorderId) return user.equippedBorderId;
    const saved = localStorage.getItem(userStorageKey);
    return saved ? JSON.parse(saved).equippedSkinId : DEFAULT_SKIN.id;
  });

  const [screen, setScreen] = useState<Screen>("menu");
  const [returnScreen, setReturnScreen] = useState<Screen>("menu");
  const [navContext, setNavContext] = useState<NavContext>("menu");
  const [gameMode, setGameMode] = useState<"bot" | "pvp">("bot");
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isChangingAvatar, setIsChangingAvatar] = useState(false);

  const isBonusReady = !user.last_claim_date || (new Date().toISOString().split('T')[0] !== user.last_claim_date);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (modal.isOpen) {
          closeModal();
          return;
        }

        playSound('click_soft');

        if (screen === "menu") return;

        if (screen === "game") {
          setNavContext("menu");
          setScreen("menu");
        } else {
          setScreen(returnScreen);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [screen, returnScreen, modal.isOpen]);

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
    } catch (error) {
      showModal("Ошибка сети", "Проверьте соединение", "error");
    }
  };

  const startGame = (mode: "bot" | "pvp") => {
    playSound('click_main');
    setGameMode(mode);
    setNavContext("game");
    setScreen("game");
  };

  const exitGame = () => {
    playSound('click_soft');
    setNavContext("menu");
    setScreen("menu");
  };

  const goToAuxiliaryScreen = (target: Screen) => {
    playSound('click_soft');
    if (screen === "menu" || screen === "game") {
      setReturnScreen(screen);
    }
    setScreen(target);
  };

  const goToLeaderboard = async () => {
    playSound('click_soft');
    if (screen === "menu" || screen === "game") {
      setReturnScreen(screen);
    }
    setScreen("leaders");
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
    playSound('click_soft');
    if (screen === "menu" || screen === "game") {
      setReturnScreen(screen);
    }
    setScreen("tournament");
  };

  const handleBack = () => {
    playSound('click_soft');
    setScreen(returnScreen);
  };

  const handleEquip = async (id: number) => {
    playSound('click_sharp');
    try {
      await fetch(`${API_URL}/api/equip`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ itemId: id }),
      });
      setEquippedSkinId(id);
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
        const data = await res.json();
        showModal("Ошибка", data.error || "Не удалось сменить аватар", "error");
        return;
      }
      playSound('success');
      await refreshUser();
      setIsChangingAvatar(false);
      showModal("Успех!", "Аватар успешно изменен!", "success");
    } catch (error) {
      showModal("Ошибка сети", "Проверьте соединение", "error");
    }
  };

  const handleLogout = () => {
    playSound('click_soft');
    onLogout();
  };

  const currentSkin = shopItems.find(i => i.id === equippedSkinId) || DEFAULT_SKIN;
  const currentThemeColor = currentSkin.color || "#38bdf8";

  const shopCardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    padding: 10,
    borderRadius: 12,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: 160
  };

  const actionContainerStyle: React.CSSProperties = {
    marginTop: 'auto',
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  };

  return (
    <div className="app-root">
      <div className="app-gradient-bg" />

      <CustomModal
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onClose={closeModal}
      />

      <div className="app-content" style={{ maxWidth: 448, margin: "0 auto", display: 'flex', flexDirection: 'column', height: '100vh' }}>

        {screen !== "game" && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, marginTop: 10, padding: "0 4px" }}>
            <div
              className="user-pill menu-card"
              onClick={() => goToAuxiliaryScreen("profile")}
              style={{ padding: '8px 12px', borderRadius: '999px', gap: 8, cursor: 'pointer', border: '1px solid rgba(148, 163, 255, 0.4)' }}
            >
              <img src={user.avatar} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} alt="User" />
              <span style={{ fontWeight: 600 }}>{user.nickname}</span>
            </div>

            <div
              className="wallet-widget menu-card"
              onClick={() => goToAuxiliaryScreen("daily")}
              style={{ borderColor: currentThemeColor, cursor: 'pointer', padding: '8px 12px', borderRadius: '999px', gap: 8, position: 'relative' }}
            >
              <span className="coin-icon">💰</span>
              <span style={{ color: currentThemeColor }}>{balance}</span>
              {isBonusReady && <div className="notification-dot" />}
            </div>
          </div>
        )}

        {screen === "menu" && (
          <div className="animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h1 className="logo-title" style={{ fontSize: '2.5rem', fontWeight: 900 }}>CYBER RPS</h1>
            <p className="logo-subtitle" style={{ marginBottom: 40 }}>HUB SYSTEM</p>

            <div style={{ display: 'grid', gap: 14 }}>
              <MenuButton title="Тренировка" subtitle="Фарм монет" icon="🤖" onClick={() => startGame("bot")} />
              <MenuButton title="Арена PvP" subtitle="Ставки" icon="⚔️" onClick={() => startGame("pvp")} />
              <MenuButton
                title="ТОП ИГРОКОВ"
                subtitle="Зал славы"
                icon="📊"
                onClick={goToLeaderboard}
              />
              <MenuButton
                title="ТУРНИР"
                subtitle="Стань абсолютным чемпионом"
                icon="🏆"
                onClick={goToTournament}
                isTournament={true}
              />
            </div>

            <div className="menu-footer">
              <button className="btn-action-shop" onClick={() => goToAuxiliaryScreen("shop")}><span>🛒</span> Магазин</button>
              <button className="btn-action-exit" onClick={handleLogout}>Выход</button>
            </div>
          </div>
        )}

        {screen === "shop" && (
          <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <button onClick={handleBack} className="back-btn">← Назад</button>
            <h2>Магазин Скинов</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, overflowY: 'auto', paddingBottom: 20 }}>

              {/* Item Default */}
              <div style={shopCardStyle}>
                <div>
                  <div style={{ width: 40, height: 40, background: DEFAULT_SKIN.color, borderRadius: '50%', margin: '0 auto 10px' }}></div>
                  <div style={{ fontWeight: 'bold' }}>Стандарт</div>
                </div>

                <div style={actionContainerStyle}>
                  {equippedSkinId === DEFAULT_SKIN.id ? (
                    <div style={{ fontSize: '0.8rem', color: DEFAULT_SKIN.color, fontWeight: 'bold' }}>ВЫБРАНО</div>
                  ) : (
                    <button className="shop-btn shop-btn-equip" onClick={() => handleEquip(DEFAULT_SKIN.id)} style={{ color: DEFAULT_SKIN.color }}>НАДЕТЬ</button>
                  )}
                </div>
              </div>

              {/* Items from Server */}
              {shopItems.map(item => {
                const isOwned = inventory.includes(item.id);
                const isEquipped = equippedSkinId === item.id;
                return (
                  <div key={item.id} style={shopCardStyle}>
                    <div>
                      <div style={{ width: 40, height: 40, background: item.color || '#fff', borderRadius: '50%', margin: '0 auto 10px', boxShadow: `0 0 15px ${item.color}80` }}></div>
                      <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                    </div>

                    <div style={actionContainerStyle}>
                      {!isOwned ? (
                        <button className="shop-btn shop-btn-buy" onClick={() => handleBuy(item)}>{item.price} 💰</button>
                      ) : isEquipped ? (
                        <div style={{ fontSize: '0.8rem', color: item.color, fontWeight: 'bold' }}>ВЫБРАНО</div>
                      ) : (
                        <button className="shop-btn shop-btn-equip" onClick={() => handleEquip(item.id)} style={{ color: item.color }}>НАДЕТЬ</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {screen === "daily" && (
          <DailyBonusScreen
            user={user}
            token={token}
            onBack={handleBack}
            refreshUser={refreshUser}
            themeColor={currentThemeColor}
            showAlert={showModal}
          />
        )}

        {navContext === "game" && (
          <div className="animate-fade-in" style={{ height: '100%', display: screen === "game" ? 'block' : 'none' }}>
            <GameScreen
              user={user}
              mode={gameMode}
              balance={balance}
              token={token}
              refreshUser={refreshUser}
              onBack={exitGame}
              onOpenWallet={() => goToAuxiliaryScreen("daily")}
              themeColor={currentThemeColor}
            />
          </div>
        )}

        {screen === "leaders" && (
          <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              <button onClick={handleBack} className="back-btn">← Назад</button>
              <div style={{ flex: 1, textAlign: 'center', fontFamily: 'Bounded', fontSize: '1.2rem', letterSpacing: '0.1em' }}>ТОП ИГРОКОВ</div>
              <div style={{ width: 60 }}></div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {leaderboard.map((player, idx) => (
                <div key={player.id} className="menu-card" style={{
                  padding: '12px 16px',
                  background: player.id === user.id ? `${currentThemeColor}15` : 'rgba(255,255,255,0.03)',
                  borderColor: player.id === user.id ? currentThemeColor : 'rgba(255,255,255,0.1)',
                  animationDelay: `${idx * 0.05}s`
                }}>
                  <div style={{ width: 30, fontWeight: '900', color: idx < 3 ? '#facc15' : '#64748b', fontSize: '1.1rem' }}>
                    #{idx + 1}
                  </div>
                  <img src={player.avatar} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${idx < 3 ? '#facc15' : 'transparent'}` }} alt="avatar" />
                  <div style={{ flex: 1, fontWeight: '700' }}>
                    {player.username}
                    {player.id === user.id && <span style={{ marginLeft: 8, fontSize: '0.6rem', background: currentThemeColor, color: '#000', padding: '2px 6px', borderRadius: 4 }}>ВЫ</span>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#4ade80', fontWeight: '900', fontSize: '0.9rem' }}>{player.wins} 🏆</div>
                    <div style={{ color: '#9ca3af', fontSize: '0.7rem' }}>{player.points || player.coins || 0}💰</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {screen === "tournament" && (
          <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 25, position: 'relative' }}>
              <button onClick={handleBack} className="back-btn" style={{ position: 'absolute', left: 0 }}>← Назад</button>
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
                    <div style={{ fontSize: '2.2rem', fontWeight: 900, lineHeight: 1, fontFamily: 'Bounded' }}>25</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 6, fontWeight: 600 }}>ДЕКАБРЯ</div>
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
                  <span style={{ fontSize: '1.5rem' }}>💰</span>
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
              <button onClick={handleBack} className="back-btn">← Назад</button>
              <div style={{ flex: 1, textAlign: 'center', fontFamily: 'Bounded', fontSize: '1.2rem', letterSpacing: '0.1em' }}>ПРОФИЛЬ</div>
              <div style={{ width: 60 }}></div> {/* Spacer */}
            </div>

            <div className="profile-container" style={{ flex: 1, overflowY: 'auto', paddingBottom: 20 }}>
              {/* Аватар и Основная инфо */}
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
                  {/* Кнопка уровня */}
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
                    {Math.floor(user.wins / 10) + 1}
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
                <div style={{ color: currentThemeColor, fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 800 }}>
                  {user.wins > 50 ? 'ЛЕГЕНДА КИБЕРСПОРТА' : user.wins > 20 ? 'ПРОФЕССИОНАЛ' : 'НОВИЧОК'}
                </div>
              </div>

              {/* Основная стата */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <StatCard label="ПОБЕДЫ" value={user.wins} color="#4ade80" icon="🏆" />
                <StatCard label="ПОРАЖЕНИЯ" value={user.losses} color="#f87171" icon="💀" />
              </div>

              {/* Дополнительная инфо */}
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
                  value={`${user.total_earned} 💰`}
                  color="#facc15"
                  isFullWidth={true}
                  icon="💎"
                />
              </div>

              {/* Достижения (Placeholders) */}
              <div style={{ marginTop: 30 }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 15, textAlign: 'center', letterSpacing: '0.1em' }}>ДОСТИЖЕНИЯ</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 15 }}>
                  <Achievement icon="🎯" unlocked={user.wins > 0} title="Первая кровь" />
                  <Achievement icon="🔥" unlocked={user.wins >= 5} title="В огне" />
                  <Achievement icon="👑" unlocked={user.total_earned >= 1000} title="Богач" />
                  <Achievement icon="⚡" unlocked={user.streak >= 3} title="Марафонец" />
                </div>
              </div>
            </div>

            <div style={{ padding: '20px 0' }}>
              <button
                className="secondary-btn"
                style={{ width: '100%', padding: '15px', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.2)' }}
                onClick={handleLogout}
              >
                ВЫЙТИ ИЗ АККАУНТА
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MenuButton = ({ title, subtitle, icon, onClick, isTournament }: any) => {
  const containerClass = isTournament ? "menu-card tournament-card" : "menu-card";
  const playSound = useSound();

  const handleClick = () => {
    playSound('click_main');
    onClick();
  };

  return (
    <div className={containerClass} onClick={handleClick}>
      <span style={{ fontSize: '1.8rem' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div className={isTournament ? "tournament-text" : "menu-title"}>{title}</div>
        <div style={{ fontSize: '0.8rem', color: isTournament ? '#facc15' : '#9ca3af', opacity: 0.9 }}>{subtitle}</div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color, isFullWidth, icon }: any) => (
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

const Achievement = ({ icon, unlocked, title }: any) => (
  <div style={{
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
    cursor: 'help'
  }} title={title}>
    {icon}
  </div>
);
