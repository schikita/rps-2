import React, { useState, useEffect } from "react";
import type { User } from "../App";
import { GameScreen } from "./GameScreen";
import { DailyBonusScreen } from "./DailyBonusScreen";
import { API_URL } from "../config";
import { CustomModal } from "../components/CustomModal";
import { useSound } from "../sounds/useSound"; // Import sounds

type Screen = "menu" | "game" | "shop" | "tournament" | "profile" | "wallet" | "daily";
type NavContext = "menu" | "game"; 

interface Skin {
  id: number;
  name: string;
  price: number;
  color: string;
  imageId: string;
}

const DEFAULT_SKIN: Skin = { id: -1, name: "Стандарт", price: 0, color: "#38bdf8", imageId: "default" };

interface GameNavigatorProps {
  user: User;
  onLogout: () => void;
  token: string;
  refreshUser: () => Promise<void>;
}

export const GameNavigator: React.FC<GameNavigatorProps> = ({ user, onLogout, token, refreshUser }) => {
  const playSound = useSound(); // Initialize sound hook
  
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
    playSound('click_soft'); // Sound on close
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  const [equippedSkinId, setEquippedSkinId] = useState<number>(() => {
    const saved = localStorage.getItem(userStorageKey);
    return saved ? JSON.parse(saved).equippedSkinId : DEFAULT_SKIN.id;
  });

  const [screen, setScreen] = useState<Screen>("menu");
  const [returnScreen, setReturnScreen] = useState<Screen>("menu");
  const [navContext, setNavContext] = useState<NavContext>("menu");
  const [gameMode, setGameMode] = useState<"bot" | "pvp">("bot");

  const isBonusReady = !user.last_claim_date || (new Date().toISOString().split('T')[0] !== user.last_claim_date);

  useEffect(() => {
    fetch(`${API_URL}/api/shop`)
        .then(res => res.json())
        .then(data => setShopItems(data))
        .catch(err => console.error("Shop load error", err));
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
        
        playSound('click_soft'); // Sound on back/escape

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
    playSound('click_sharp'); // Click sound
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
      playSound('success'); // Success sound
      await refreshUser();
      showModal("Успех!", `Вы купили ${item.name}!`, "success");
    } catch (error) { 
        showModal("Ошибка сети", "Проверьте соединение", "error"); 
    }
  };

  const startGame = (mode: "bot" | "pvp") => {
    playSound('click_main'); // Start game sound
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
      playSound('click_soft'); // Navigation sound
      if (screen === "menu" || screen === "game") {
          setReturnScreen(screen);
      }
      setScreen(target);
  };

  const handleBack = () => {
      playSound('click_soft'); // Back sound
      setScreen(returnScreen);
  };

  const handleEquip = (id: number) => {
      playSound('click_sharp'); // Equip sound
      setEquippedSkinId(id);
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
                style={{padding: '8px 12px', borderRadius: '999px', gap: 8, cursor: 'pointer', border: '1px solid rgba(148, 163, 255, 0.4)'}}
              >
                 <img src={user.avatar} style={{width:28, height:28, borderRadius:'50%', objectFit:'cover'}} alt="User" />
                 <span style={{fontWeight: 600}}>{user.nickname}</span>
              </div>
              
              <div 
                className="wallet-widget menu-card" 
                onClick={() => goToAuxiliaryScreen("daily")}
                style={{borderColor: currentThemeColor, cursor: 'pointer', padding: '8px 12px', borderRadius: '999px', gap: 8, position: 'relative'}}
              >
                  <span className="coin-icon">💰</span> 
                  <span style={{color: currentThemeColor}}>{balance}</span>
                  {isBonusReady && (
                      <div style={{
                          position: 'absolute', top: 0, right: 0, 
                          width: 10, height: 10, background: '#ef4444', 
                          borderRadius: '50%', border: '2px solid #0f172a'
                      }} />
                  )}
              </div>
            </div>
        )}

        {screen === "menu" && (
          <div className="animate-fade-in" style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            <h1 className="logo-title" style={{fontSize:'2.2rem'}}>CYBER RPS</h1>
            <p className="logo-subtitle" style={{marginBottom: 40}}>HUB SYSTEM</p>

            <div style={{display:'grid', gap: 14}}>
              <MenuButton title="Тренировка" subtitle="Фарм монет" icon="🤖" onClick={() => startGame("bot")} />
              <MenuButton title="Арена PvP" subtitle="Ставки" icon="⚔️" onClick={() => startGame("pvp")} />
              <MenuButton title="ТУРНИР" subtitle="Скоро..." icon="🏆" isTournament={true} onClick={() => goToAuxiliaryScreen("tournament")} />
            </div>

            <div className="menu-footer">
                <button className="btn-action-shop" onClick={() => goToAuxiliaryScreen("shop")}><span>🛒</span> Магазин</button>
                <button className="btn-action-exit" onClick={handleLogout}>Выход</button>
            </div>
          </div>
        )}

        {screen === "shop" && (
             <div className="animate-fade-in" style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
                <button onClick={handleBack} className="back-btn">← Назад</button>
                <h2>Магазин Скинов</h2>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, overflowY: 'auto', paddingBottom: 20}}>
                    
                    {/* Item Default */}
                    <div style={shopCardStyle}>
                         <div>
                            <div style={{width:40, height:40, background: DEFAULT_SKIN.color, borderRadius:'50%', margin:'0 auto 10px'}}></div>
                            <div style={{fontWeight:'bold'}}>Стандарт</div>
                         </div>
                         
                         <div style={actionContainerStyle}>
                             {equippedSkinId === DEFAULT_SKIN.id ? (
                                 <div style={{fontSize:'0.8rem', color: DEFAULT_SKIN.color, fontWeight:'bold'}}>ВЫБРАНО</div>
                             ) : (
                                 <button className="shop-btn shop-btn-equip" onClick={() => handleEquip(DEFAULT_SKIN.id)} style={{color: DEFAULT_SKIN.color}}>НАДЕТЬ</button>
                             )}
                         </div>
                    </div>

                    {/* Items dal Server */}
                    {shopItems.map(item => {
                        const isOwned = inventory.includes(item.id);
                        const isEquipped = equippedSkinId === item.id;
                        return (
                          <div key={item.id} style={shopCardStyle}>
                              <div>
                                <div style={{width:40, height:40, background:item.color || '#fff', borderRadius:'50%', margin:'0 auto 10px', boxShadow: `0 0 15px ${item.color}80`}}></div>
                                <div style={{fontWeight:'bold'}}>{item.name}</div>
                              </div>
                              
                              <div style={actionContainerStyle}>
                                {!isOwned ? (
                                    <button className="shop-btn shop-btn-buy" onClick={() => handleBuy(item)}>{item.price} 💰</button>
                                ) : isEquipped ? (
                                    <div style={{fontSize:'0.8rem', color: item.color, fontWeight:'bold'}}>ВЫБРАНО</div>
                                ) : (
                                    <button className="shop-btn shop-btn-equip" onClick={() => handleEquip(item.id)} style={{color: item.color}}>НАДЕТЬ</button>
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
            <div className="animate-fade-in" style={{height:'100%', display: screen === "game" ? 'block' : 'none'}}>
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
        
        {screen === "tournament" && <WipScreen title="Турнир" emoji="🚧" onBack={handleBack} />}
        {screen === "profile" && <WipScreen title="Профиль" emoji="👤" onBack={handleBack} />}
      </div>
    </div>
  );
};

const MenuButton = ({title, subtitle, icon, onClick, isTournament}: any) => {
    const containerClass = isTournament ? "menu-card tournament-card" : "menu-card";
    const playSound = useSound();
    
    const handleClick = () => {
        playSound('click_main');
        onClick();
    };

    return (
        <div className={containerClass} onClick={handleClick}>
            <span style={{fontSize: '1.8rem'}}>{icon}</span>
            <div style={{flex: 1}}>
                <div className={isTournament ? "tournament-text" : "menu-title"}>{title}</div>
                <div style={{fontSize: '0.8rem', color: isTournament ? '#facc15' : '#9ca3af', opacity: 0.9}}>{subtitle}</div>
            </div>
        </div>
    );
};

const WipScreen = ({ title, emoji, onBack }: any) => {
    const playSound = useSound();
    return (
        <div className="animate-fade-in" style={{textAlign:'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height:'100%'}}>
            <div style={{fontSize: '4rem', marginBottom: 16}}>{emoji}</div>
            <h2 style={{fontFamily: 'Bounded', marginBottom: 8}}>{title}</h2>
            <p style={{color:'#9ca3af', fontSize:'0.9rem', marginBottom: 32}}>Раздел в разработке</p>
            <button className="secondary-btn" onClick={() => { playSound('click_soft'); onBack(); }}>НАЗАД</button>
        </div>
    );
};