import React, { useState, useEffect } from "react";
import type { User } from "../App";
import { GameScreen } from "./GameScreen";
import { API_URL } from "../config";

type Screen = "menu" | "game" | "shop" | "tournament" | "profile" | "wallet";
type NavContext = "menu" | "game"; 

interface Skin {
  id: string;
  name: string;
  price: number;
  color: string;
}

const SHOP_ITEMS: Skin[] = [
  { id: "default", name: "Стандарт", price: 0, color: "#38bdf8" },
  { id: "neon_green", name: "Кислота", price: 500, color: "#22c55e" },
  { id: "gold_rush", name: "Магнат", price: 2000, color: "#facc15" },
  { id: "cyber_punk", name: "Киберпанк", price: 5000, color: "#ec4899" },
];

interface GameNavigatorProps {
  user: User;
  onLogout: () => void;
  token: string;
  refreshUser: () => Promise<void>;
}

export const GameNavigator: React.FC<GameNavigatorProps> = ({ user, onLogout, token, refreshUser }) => {
  
  const userStorageKey = `rps_save_${user.nickname}`;
  const balance = user.points; 
  const inventory = JSON.parse(user.inventory || '["default"]');

  const [equippedSkinId, setEquippedSkinId] = useState<string>(() => {
    const saved = localStorage.getItem(userStorageKey);
    return saved ? JSON.parse(saved).equippedSkinId : "default";
  });

  const [screen, setScreen] = useState<Screen>("menu");
  const [returnScreen, setReturnScreen] = useState<Screen>("menu");
  const [navContext, setNavContext] = useState<NavContext>("menu");
  const [gameMode, setGameMode] = useState<"bot" | "pvp">("bot");

  const isBonusReady = !user.last_claim_date || (new Date().getTime() - new Date(user.last_claim_date).getTime() >= 24 * 60 * 60 * 1000);

  useEffect(() => {
    localStorage.setItem(userStorageKey, JSON.stringify({ equippedSkinId }));
  }, [equippedSkinId, userStorageKey]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (screen === "menu") return;
        if (screen === "game") {
            setNavContext("menu");
            setScreen("menu");
        } else if (screen === "wallet" || screen === "profile") {
            setScreen(returnScreen);
        } else {
            setScreen("menu");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [screen, returnScreen]);

  const handleBuy = async (item: Skin) => {
    try {
      const res = await fetch(`${API_URL}/api/shop/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ itemId: item.id, price: item.price }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Ошибка"); return; }
      await refreshUser();
      alert("Скин куплен!");
    } catch (error) { alert("Ошибка сети"); }
  };

  const startGame = (mode: "bot" | "pvp") => {
    setGameMode(mode);
    setNavContext("game");
    setScreen("game");
  };

  const exitGame = () => {
    setNavContext("menu");
    setScreen("menu");
  };

  const goToAuxiliaryScreen = (target: "wallet" | "profile") => {
      if (screen !== "wallet" && screen !== "profile") {
          setReturnScreen(screen); 
      }
      setScreen(target);
  };

  const handleBack = () => {
      setScreen(returnScreen);
  };

  const currentThemeColor = SHOP_ITEMS.find(i => i.id === equippedSkinId)?.color || "#38bdf8";

  return (
    <div className="app-root">
      <div className="app-gradient-bg" />
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
                onClick={() => goToAuxiliaryScreen("wallet")}
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
              <MenuButton title="Арена (PvP)" subtitle="Игра на ставки" icon="⚔️" onClick={() => startGame("pvp")} />
              <MenuButton title="ТУРНИР" subtitle="Скоро..." icon="🏆" isTournament={true} onClick={() => setScreen("tournament")} />
            </div>

            <div className="menu-footer">
                <button className="btn-action-shop" onClick={() => setScreen("shop")}><span>🛒</span> Магазин</button>
                <button className="btn-action-exit" onClick={onLogout}>Выход</button>
            </div>
          </div>
        )}

        {screen === "shop" && (
             <div className="animate-fade-in">
                <button onClick={() => setScreen("menu")} className="back-btn">← Назад</button>
                <h2>Магазин Скинов</h2>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                    {SHOP_ITEMS.map(item => {
                        const isOwned = inventory.includes(item.id);
                        const isEquipped = equippedSkinId === item.id;
                        return (
                          <div key={item.id} style={{background: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 12, textAlign:'center'}}>
                              <div style={{width:40, height:40, background:item.color, borderRadius:'50%', margin:'0 auto 10px', boxShadow: `0 0 15px ${item.color}80`}}></div>
                              <div style={{fontWeight:'bold'}}>{item.name}</div>
                              {!isOwned ? (
                                  <button className="shop-btn shop-btn-buy" onClick={() => handleBuy(item)}>{item.price} 💰</button>
                              ) : isEquipped ? (
                                  <div style={{marginTop:8, fontSize:'0.8rem', color: item.color}}>✓ ВЫБРАНО</div>
                              ) : (
                                  <button className="shop-btn shop-btn-equip" onClick={() => setEquippedSkinId(item.id)} style={{color: item.color}}>НАДЕТЬ</button>
                              )}
                          </div>
                        )
                    })}
                </div>
            </div>
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
                    onOpenWallet={() => goToAuxiliaryScreen("wallet")}
                    themeColor={currentThemeColor}
                />
            </div>
        )}
        
        {screen === "tournament" && <WipScreen title="Турнир" emoji="🚧" onBack={() => setScreen("menu")} />}
        {screen === "profile" && <WipScreen title="Профиль" emoji="👤" onBack={handleBack} />}
        
        {screen === "wallet" && (
            <WalletScreen 
                user={user}
                onBack={handleBack} 
                balance={balance} 
                token={token} 
                refreshUser={refreshUser} 
            />
        )}

      </div>
    </div>
  );
};

const WalletScreen = ({ onBack, balance, token, refreshUser, user }: any) => {
    const [loading, setLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState<string | null>(null);

    useEffect(() => {
        const checkTime = () => {
            if (!user.last_claim_date) {
                setTimeLeft(null); 
                return;
            }
            const lastClaim = new Date(user.last_claim_date).getTime();
            const now = new Date().getTime();
            const cooldown = 24 * 60 * 60 * 1000;
            const nextClaim = lastClaim + cooldown;
            const diff = nextClaim - now;

            if (diff <= 0) {
                setTimeLeft(null);
            } else {
                const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const m = Math.floor((diff / (1000 * 60)) % 60);
                const s = Math.floor((diff / 1000) % 60);
                setTimeLeft(`${h}ч ${m}м ${s}с`);
            }
        };
        checkTime();
        const interval = setInterval(checkTime, 1000);
        return () => clearInterval(interval);
    }, [user.last_claim_date]);

    const claimBonus = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/daily-bonus`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                await refreshUser();
                alert(data.message);
            } else {
                alert(data.error);
            }
        } catch (e) { alert("Ошибка сервера"); }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in" style={{textAlign:'center', paddingTop: 40}}>
            <button onClick={onBack} className="back-btn">← Назад</button>
            <div style={{fontSize: '4rem', marginTop: 20}}>💰</div>
            <h2 style={{fontFamily: 'Bounded', fontSize:'2rem', margin:'10px 0', color:'#facc15'}}>{balance}</h2>
            <p style={{color:'#9ca3af', marginBottom: 40}}>Ваш баланс</p>
            
            <div className="menu-card" style={{flexDirection:'column', gap:10, padding:20, border:'1px solid #facc15'}}>
                <div style={{fontSize:'1.2rem', fontWeight:'bold'}}>Ежедневный Бонус</div>
                <div style={{color:'#9ca3af', fontSize:'0.9rem'}}>Заходите каждый день за наградой!</div>
                <button 
                    className="primary-btn" 
                    onClick={!timeLeft ? claimBonus : undefined} 
                    disabled={loading || !!timeLeft}
                    style={{
                        width:'100%', marginTop:10, 
                        background: timeLeft ? '#334155' : 'linear-gradient(90deg, #facc15, #eab308)', 
                        color: timeLeft ? '#94a3b8' : '#000',
                        border: timeLeft ? '1px solid #475569' : 'none',
                        cursor: timeLeft ? 'default' : 'pointer'
                    }}
                >
                    {loading ? "Загрузка..." : timeLeft ? `Ждите: ${timeLeft}` : "ЗАБРАТЬ +50 💰"}
                </button>
            </div>
        </div>
    );
};

// CLEANED UP: Removed 'highlight' and 'color' props
const MenuButton = ({title, subtitle, icon, onClick, isTournament}: any) => {
    const containerClass = isTournament ? "menu-card tournament-card" : "menu-card";
    return (
        <div className={containerClass} onClick={onClick}>
            <span style={{fontSize: '1.8rem'}}>{icon}</span>
            <div style={{flex: 1}}>
                <div className={isTournament ? "tournament-text" : "menu-title"}>{title}</div>
                <div style={{fontSize: '0.8rem', color: isTournament ? '#facc15' : '#9ca3af', opacity: 0.9}}>{subtitle}</div>
            </div>
        </div>
    );
};

const WipScreen = ({ title, emoji, onBack }: any) => (
    <div className="animate-fade-in" style={{textAlign:'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height:'100%'}}>
        <div style={{fontSize: '4rem', marginBottom: 16}}>{emoji}</div>
        <h2 style={{fontFamily: 'Bounded', marginBottom: 8}}>{title}</h2>
        <p style={{color:'#9ca3af', fontSize:'0.9rem', marginBottom: 32}}>Раздел в разработке</p>
        <button className="secondary-btn" onClick={onBack}>НАЗАД</button>
    </div>
);