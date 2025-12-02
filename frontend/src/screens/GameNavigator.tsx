import React, { useState, useEffect } from "react";
import type { User } from "../App";
import { GameScreen } from "./GameScreen";

type Screen = "menu" | "game" | "shop" | "tournament";

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
}

export const GameNavigator: React.FC<GameNavigatorProps> = ({ user, onLogout }) => {
  
  // --- DYNAMIC STORAGE KEY ---
  const userStorageKey = `rps_save_${user.nickname}`;

  // --- LOAD DATA ---
  const [balance, setBalance] = useState<number>(() => {
    const saved = localStorage.getItem(userStorageKey);
    return saved ? JSON.parse(saved).balance : 1000;
  });

  const [inventory, setInventory] = useState<string[]>(() => {
    const saved = localStorage.getItem(userStorageKey);
    return saved ? JSON.parse(saved).inventory : ["default"];
  });

  const [equippedSkinId, setEquippedSkinId] = useState<string>(() => {
    const saved = localStorage.getItem(userStorageKey);
    return saved ? JSON.parse(saved).equippedSkinId : "default";
  });

  const [screen, setScreen] = useState<Screen>("menu");
  const [gameMode, setGameMode] = useState<"bot" | "pvp">("bot");

  // --- SAVE DATA ---
  useEffect(() => {
    const dataToSave = {
      balance,
      inventory,
      equippedSkinId
    };
    localStorage.setItem(userStorageKey, JSON.stringify(dataToSave));
  }, [balance, inventory, equippedSkinId, userStorageKey]);

  // --- LOGIC ---

  const startGame = (mode: "bot" | "pvp") => {
    setGameMode(mode);
    setScreen("game");
  };

  const handleBuy = (item: Skin) => {
    if (balance >= item.price) {
      setBalance(b => b - item.price);
      setInventory(prev => [...prev, item.id]);
    } else {
      alert("Недостаточно средств!");
    }
  };

  const currentThemeColor = SHOP_ITEMS.find(i => i.id === equippedSkinId)?.color || "#38bdf8";

  return (
    <div className="app-root">
      <div className="app-gradient-bg" />
      <div className="app-content" style={{ maxWidth: 480, margin: "0 auto", display: 'flex', flexDirection: 'column', height: '100vh' }}>
        
        {/* HEADER */}
        {screen !== "game" && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, marginTop: 10, padding: "0 4px" }}>
              <div className="user-pill" style={{display:'flex', alignItems:'center', gap:8}}>
                 <img src={user.avatar} style={{width:28, height:28, borderRadius:'50%', objectFit:'cover'}} alt="User" />
                 <span style={{fontWeight: 600}}>{user.nickname}</span>
              </div>
              
              <div className="wallet-widget" style={{borderColor: currentThemeColor}}>
                  <span className="coin-icon">💰</span> 
                  <span style={{color: currentThemeColor}}>{balance}</span>
              </div>
            </div>
        )}

        {/* --- MAIN MENU --- */}
        {screen === "menu" && (
          <div className="animate-fade-in" style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            <h1 className="logo-title" style={{fontSize:'2.2rem'}}>CYBER RPS</h1>
            <p className="logo-subtitle" style={{marginBottom: 40}}>HUB SYSTEM</p>

            <div style={{display:'grid', gap: 14}}>
              <MenuButton 
                  title="Тренировка" 
                  subtitle="Фарм монет" 
                  icon="🤖" 
                  onClick={() => startGame("bot")} 
              />
              <MenuButton 
                  title="Арена (PvP)" 
                  subtitle="Игра на ставки" 
                  icon="⚔️" 
                  color={currentThemeColor} 
                  highlight
                  onClick={() => startGame("pvp")} 
              />
              <MenuButton 
                  title="Турнир" 
                  subtitle="Скоро..." 
                  icon="🏆" 
                  onClick={() => setScreen("tournament")} 
              />
            </div>

            <div className="menu-footer">
                <button className="btn-action-shop" onClick={() => setScreen("shop")}>
                    <span>🛒</span>
                    <span>Магазин</span>
                </button>
                <button className="btn-action-exit" onClick={onLogout}>
                    Выход
                </button>
            </div>
          </div>
        )}

        {/* --- SHOP --- */}
        {screen === "shop" && (
            <div className="animate-fade-in">
                <button onClick={() => setScreen("menu")} style={{background:'none', border:'none', color:'#fff', marginBottom:10}}>← Назад</button>
                <h2>Магазин Скинов</h2>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                    {SHOP_ITEMS.map(item => {
                        const isOwned = inventory.includes(item.id);
                        const isEquipped = equippedSkinId === item.id;

                        return (
                          <div key={item.id} style={{
                              background: 'rgba(255,255,255,0.05)', 
                              border: isEquipped ? `1px solid ${item.color}` : '1px solid transparent',
                              padding: 10, borderRadius: 12, textAlign:'center'
                          }}>
                              <div style={{width:40, height:40, background:item.color, borderRadius:'50%', margin:'0 auto 10px', boxShadow: `0 0 15px ${item.color}80`}}></div>
                              <div style={{fontWeight:'bold'}}>{item.name}</div>
                              
                              {!isOwned ? (
                                  <button onClick={() => handleBuy(item)} style={{marginTop:8, width:'100%', padding:6, borderRadius:8, border:'none', cursor:'pointer', background:'#333', color:'#fff'}}>
                                      {item.price} 💰
                                  </button>
                              ) : isEquipped ? (
                                  <div style={{marginTop:8, fontSize:'0.8rem', color: item.color}}>✓ ВЫБРАНО</div>
                              ) : (
                                  <button onClick={() => setEquippedSkinId(item.id)} style={{marginTop:8, width:'100%', padding:6, borderRadius:8, border:'none', cursor:'pointer', background: item.color, color:'#000', fontWeight:'bold'}}>
                                      НАДЕТЬ
                                  </button>
                              )}
                          </div>
                        )
                    })}
                </div>
            </div>
        )}

        {/* --- GAME SCREEN --- */}
        {screen === "game" && (
            <div className="animate-fade-in" style={{height:'100%'}}>
                <GameScreen 
                    user={user} 
                    mode={gameMode} 
                    balance={balance} 
                    setBalance={setBalance}
                    onBack={() => setScreen("menu")}
                    themeColor={currentThemeColor}
                />
            </div>
        )}
        
        {/* Tournament */}
        {screen === "tournament" && <div style={{textAlign:'center', marginTop:100}}><button onClick={()=>setScreen("menu")}>Назад</button><br/>В разработке...</div>}

      </div>
    </div>
  );
};

// Helper component
const MenuButton = ({title, subtitle, icon, onClick, highlight, color}: any) => (
    <div onClick={onClick} style={{
            background: highlight ? `linear-gradient(45deg, ${color}20, transparent)` : 'rgba(255,255,255,0.05)',
            border: highlight ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.1)',
            padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer'
        }}>
        <span style={{fontSize: '1.8rem'}}>{icon}</span>
        <div>
            <div style={{fontWeight: 700}}>{title}</div>
            <div style={{fontSize: '0.8rem', color: '#9ca3af'}}>{subtitle}</div>
        </div>
    </div>
);