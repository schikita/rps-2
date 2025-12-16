import React, { useRef, useState } from "react";
import type { User } from "../App";
import { HandFightAnimation } from "../components/HandFightAnimation";
import { type Move } from "../engine/rps";
import { API_URL } from "../config";
import { useSound } from "../sounds/useSound"; // Import sounds

const BOT_AVATAR = "/avatars/skin-6.jpg";
type Phase = "lobby" | "idle" | "countdown" | "reveal" | "matchOver";
const BET_OPTIONS = [50, 100, 200, 300, 500, 1000, 2000, 5000];

interface GameScreenProps {
  user: User;
  mode: "bot" | "pvp";
  balance: number;
  token: string;
  refreshUser: () => Promise<void>;
  onBack: () => void;
  onOpenWallet: () => void;
  themeColor: string;
}

const BOT = { name: "Кибер-бот", avatar: BOT_AVATAR };

export const GameScreen: React.FC<GameScreenProps> = ({ user, mode, balance, token, refreshUser, onBack, onOpenWallet, themeColor }) => {
  const [betAmount, setBetAmount] = useState<number>(mode === "bot" ? 0 : 50);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBetListOpen, setIsBetListOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [phase, setPhase] = useState<Phase>("lobby");
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const [playerMove, setPlayerMove] = useState<Move | null>(null);
  const playerMoveRef = useRef<Move | null>(null);
  const [botMove, setBotMove] = useState<Move | null>(null);

  const [playerWins, setPlayerWins] = useState(0);
  const [botWins, setBotWins] = useState(0);
  
  const [matchResult, setMatchResult] = useState<"win"|"lose"|null>(null);
  const [finalProfit, setFinalProfit] = useState(0);

  const timerRef = useRef<number | null>(null);

  const playSound = useSound(); // Initialize sound

  const updatePlayerMove = (move: Move | null) => {
    setPlayerMove(move);
    playerMoveRef.current = move;
  };

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetToLobby = () => {
    playSound('click_main'); // Sound for Lobby button
    clearTimer();
    setPhase("lobby");
    setCountdown(null);
    updatePlayerMove(null);
    setBotMove(null);
    setPlayerWins(0);
    setBotWins(0);
    setMatchResult(null);
    setFinalProfit(0);
  };

  const selectBet = (amount: number) => {
      playSound('click_sharp'); // Sound for bet selection
      setBetAmount(amount);
      setErrorMsg(null);
      setIsBetListOpen(false);
  };

  const startArena = async () => {
    playSound('click_main'); // Sound for Start button
    if (mode === "bot") {
        setPhase("idle");
        setPlayerWins(0);
        setBotWins(0);
        return;
    }
    if (betAmount <= 0) { setErrorMsg("Ставка > 0"); return; }
    if (betAmount > balance) { setErrorMsg("Недостаточно средств!"); return; }

    setIsLoading(true);
    try {
        const res = await fetch(`${API_URL}/api/bet/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ betAmount }),
        });
        const data = await res.json();
        if (!res.ok) {
            setErrorMsg(data.error || "Ошибка");
            setIsLoading(false);
            return;
        }
        await refreshUser();
        setPhase("idle");
        setPlayerWins(0);
        setBotWins(0);
    } catch (e) { setErrorMsg("Ошибка сети"); }
    setIsLoading(false);
  };

  const handleMoveClick = (move: Move) => {
    if (phase === "reveal" || phase === "matchOver") return;
    playSound('click_sharp'); // Sound for move selection
    updatePlayerMove(move);
    if (phase === "idle") startCountdown();
  };

  const startCountdown = () => {
    clearTimer();
    setPhase("countdown");
    setBotMove(null);
    setCountdown(3);
    let current = 3;
    const id = window.setInterval(() => {
      current -= 1;
      setCountdown(current);
      if (current <= 0) {
        clearTimer();
        playRoundOnServer();
      }
    }, 1000);
    timerRef.current = id;
  };

  const playRoundOnServer = async () => {
    const finalPlayerMove = playerMoveRef.current || "rock";

    try {
        const res = await fetch(`${API_URL}/api/match/round`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ playerMove: finalPlayerMove }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error("Round Error");

        setBotMove(data.botMove);
        
        let newP = playerWins;
        let newB = botWins;
        if (data.result === 'win') newP++;
        if (data.result === 'lose') newB++;
        
        setPlayerWins(newP);
        setBotWins(newB);
        setPhase("reveal");

        if (newP >= 3 || newB >= 3) {
            setTimeout(() => finishMatch(newP >= 3), 1000);
        } else {
            setTimeout(() => {
                setPhase("idle");
                updatePlayerMove(null);
                setBotMove(null);
            }, 1000);
        }

    } catch (e) {
        console.error(e);
        resetToLobby();
    }
  };

  const finishMatch = async (isWinner: boolean) => {
      try {
        const res = await fetch(`${API_URL}/api/match/end`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ mode, isWinner, betAmount }),
        });
        const data = await res.json();
        
        if (!res.ok) {
            console.error("Finish Error:", data.error);
            return;
        }
        
        if (isWinner) playSound('success'); // Victory sound
        
        setFinalProfit(isWinner ? (mode === 'bot' ? 15 : betAmount) : -betAmount);
        setMatchResult(isWinner ? "win" : "lose");
        setPhase("matchOver");
        await refreshUser();
        
      } catch (e) { console.error(e); }
  };

  const isGameActive = phase !== "lobby";

  return (
    <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
        {/* Header */}
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '0 4px'}}>
            <button onClick={onBack} className="back-btn">← Назад</button>
            <span className="game-header-title" style={{color: mode === 'pvp' ? '#f87171' : '#4ade80'}}>
                {mode === 'pvp' ? 'ТУРНИР' : 'ТРЕНИРОВКА'}
            </span>
            {/* Show wallet widget here only in Lobby */}
            {!isGameActive && (
                <div className="wallet-widget menu-card" onClick={onOpenWallet} style={{borderColor: themeColor, padding: '8px 12px', borderRadius: '999px', gap: 8, margin: 0}}>
                    <span className="coin-icon">💰</span>
                    <span style={{color: themeColor, fontWeight:'bold'}}>{balance}</span>
                </div>
            )}
            {isGameActive && <div style={{width: 60}}></div>} {/* Placeholder for centering */}
        </div>

        {/* Lobby */}
        {phase === "lobby" && (
            <div className="lobby-panel" style={{marginTop: 40}}>
              <div style={{fontSize: '3rem', marginBottom: 10, textAlign:'center'}}>{mode === 'bot' ? '🤖' : '⚔️'}</div>
              {mode === "bot" ? (
                  <>
                    <p className="lobby-title">Тренировка</p>
                    <p className="lobby-text">Победа: +15 💰</p>
                    <button className="primary-btn" onClick={startArena} style={{'--theme-color': themeColor} as React.CSSProperties}>Начать бой</button>
                  </>
              ) : (
                  <>
                    <p className="lobby-title">Ставка</p>
                    <div className="bet-dropdown-container">
                        <div className="bet-dropdown-trigger" onClick={() => !isLoading && setIsBetListOpen(!isBetListOpen)} style={{borderColor: themeColor, opacity: isLoading ? 0.5 : 1}}>
                            <span>{betAmount} 💰</span>
                            <span style={{transform: isBetListOpen ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s'}}>▼</span>
                        </div>
                        {isBetListOpen && !isLoading && (
                            <div className="bet-dropdown-menu">
                                {BET_OPTIONS.map(amount => (
                                    <div key={amount} className={`bet-option ${betAmount === amount ? "active" : ""}`} onClick={() => selectBet(amount)}>{amount} 💰</div>
                                ))}
                            </div>
                        )}
                    </div>
                    {errorMsg && <p className="error-msg">{errorMsg}</p>}
                    <button className="primary-btn" onClick={startArena} disabled={isLoading} style={{'--theme-color': themeColor, marginTop: 10} as React.CSSProperties}>
                        {isLoading ? "Загрузка..." : "Играть"}
                    </button>
                  </>
              )}
            </div>
        )}

        {/* Arena */}
        {phase !== "lobby" && (
            <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
              
              {/* 1. OPPONENT HUD (Top) */}
              <div className="hud-top"> 
                <img src={BOT.avatar} className="hud-avatar" alt="Bot Avatar" />
                <div className="hud-info">
                    <div className="hud-name">{BOT.name}</div>
                    <div className="hud-score">Счет: {botWins}</div>
                </div>
              </div>

              {/* 2. BATTLEFIELD (Center) */}
              <div style={{flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                  <HandFightAnimation phase={phase === "idle" ? "idle" : phase === "matchOver" ? "reveal" : phase} countdown={countdown} playerMove={playerMove} botMove={botMove} />
                  
                  {/* Score big display */}
                  <div style={{textAlign:'center', marginTop: -10, marginBottom: 10, fontSize:'1.5rem', fontWeight:'800', letterSpacing:'2px', zIndex: 10, textShadow: '0 0 10px rgba(0,0,0,0.5)'}}>
                      <span style={{color: themeColor}}>{playerWins}</span> : <span style={{color: '#f87171'}}>{botWins}</span>
                  </div>
              </div>

              {/* 3. CONTROLS (Buttons) */}
              <div className="moves-row" style={{marginBottom: 12}}>
                {['rock', 'scissors', 'paper'].map((m) => {
                    const isSelected = playerMove === m;
                    const isDisabled = phase === "reveal" || phase === "matchOver"; 
                    return (
                        <button 
                            key={m}
                            className={`game-btn ${isSelected ? 'selected' : ''} ${isDisabled && !isSelected ? 'dimmed' : ''}`}
                            onClick={() => handleMoveClick(m as Move)} 
                            disabled={isDisabled}
                            style={{'--theme-color': themeColor} as React.CSSProperties}
                        >
                            {m === 'rock' ? 'КАМЕНЬ' : m === 'scissors' ? 'НОЖНИЦЫ' : 'БУМАГА'}
                        </button>
                    )
                })}
              </div>

              {/* 4. PLAYER PROFILE (Bottom) */}
              <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: `1px solid ${themeColor}`,
                  borderRadius: '16px',
                  boxShadow: `0 4px 20px ${themeColor}20`
              }}>
                  <img src={user.avatar} style={{width: 44, height: 44, borderRadius: '50%', border: `2px solid ${themeColor}`, objectFit: 'cover'}} alt="Me" />
                  <div style={{flex: 1}}>
                      <div style={{fontWeight: 'bold', fontSize: '0.95rem'}}>{user.nickname}</div>
                      <div style={{fontSize: '0.85rem', color: '#facc15', display:'flex', alignItems:'center', gap:4}}>
                          <span>💰</span> {balance}
                      </div>
                  </div>
                  <div style={{textAlign: 'right'}}>
                      <div style={{fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing:'0.05em'}}>Победы</div>
                      <div style={{fontWeight: '800', fontSize: '1.2rem', color: '#fff'}}>{playerWins}</div>
                  </div>
              </div>

              {phase === "countdown" && <p className="auth-hint" style={{textAlign:'center', color: themeColor, position:'absolute', top:'45%', left:0, right:0, fontSize: '1.2rem', fontWeight:'bold', textShadow:'0 0 10px rgba(0,0,0,0.8)'}}>Таймер: {countdown}с</p>}
            </div>
        )}

        {/* Result Overlay */}
        {phase === "matchOver" && (
          <div className="match-overlay">
            <div className="match-card" style={{borderColor: themeColor}}>
              <div style={{fontSize: '4rem', marginBottom: '10px'}}>
                  {matchResult === "win" ? "🏆" : "💀"}
              </div>
              <h2 className="match-title">{matchResult === "win" ? "ПОБЕДА!" : "ПОРАЖЕНИЕ"}</h2>
              
              <div className="match-score" style={{fontSize: '1.5rem', margin: '15px 0', color: finalProfit >= 0 ? '#4ade80' : '#f87171'}}>
                 {finalProfit > 0 ? `+${finalProfit} 💰` : `${finalProfit} 💰`}
              </div>
              
              <button className="primary-btn" onClick={resetToLobby} style={{'--theme-color': themeColor} as React.CSSProperties}>В лобби</button>
              <button className="secondary-btn" style={{marginTop:10, width:'100%'}} onClick={onBack}>В меню</button>
            </div>
          </div>
        )}
    </div>
  );
};