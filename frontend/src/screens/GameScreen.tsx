import React, { useRef, useState } from "react";
import type { User } from "../App";
import { HandFightAnimation } from "../components/HandFightAnimation";
import { getBotMove, detectWinner, type Move } from "../engine/rps";

// --- USE STRING PATH ---
const BOT_AVATAR = "/avatars/skin-6.jpg";

type Phase = "lobby" | "idle" | "countdown" | "reveal" | "matchOver";

interface GameScreenProps {
  user: User;
  mode: "bot" | "pvp";
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  onBack: () => void;
  themeColor: string;
}

const BOT = {
  name: "Кибер-бот",
  avatar: BOT_AVATAR, 
};

export const GameScreen: React.FC<GameScreenProps> = ({ mode, balance, setBalance, onBack, themeColor }) => {
  const [betAmount, setBetAmount] = useState<number>(mode === "bot" ? 0 : 50);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("lobby");
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const [playerMove, setPlayerMove] = useState<Move | null>(null);
  const playerMoveRef = useRef<Move | null>(null);
  const [botMove, setBotMove] = useState<Move | null>(null);

  const [playerWins, setPlayerWins] = useState(0);
  const [botWins, setBotWins] = useState(0);
  const timerRef = useRef<number | null>(null);

  // --- LOGIC ---
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
    clearTimer();
    setPhase("lobby");
    setCountdown(null);
    updatePlayerMove(null);
    setBotMove(null);
    setPlayerWins(0);
    setBotWins(0);
  };
  const handleBetChange = (amount: number) => {
    setBetAmount(amount);
    setErrorMsg(null);
  };
  const startArena = () => {
    if (mode === "bot") {
        setPhase("idle");
        setPlayerWins(0);
        setBotWins(0);
        return;
    }
    if (betAmount <= 0) { setErrorMsg("Ставка должна быть > 0"); return; }
    if (betAmount > balance) { setErrorMsg("Недостаточно средств!"); return; }

    setBalance((prev) => prev - betAmount);
    setPhase("idle");
    setPlayerWins(0);
    setBotWins(0);
  };
  const handleMoveClick = (move: Move) => {
    updatePlayerMove(move);
    if (phase === "countdown") return;
    if (phase === "idle" || phase === "reveal") startCountdown();
  };
  const startCountdown = () => {
    clearTimer();
    setPhase("countdown");
    setBotMove(null);
    setCountdown(5);
    let current = 5;
    const id = window.setInterval(() => {
      current -= 1;
      setCountdown(current);
      if (current <= 0) {
        clearTimer();
        finalizeRound();
      }
    }, 1000);
    timerRef.current = id;
  };
  const finalizeRound = () => {
    const finalPlayerMove = playerMoveRef.current || "rock";
    const finalBotMove = getBotMove();
    setBotMove(finalBotMove);
    const outcome = detectWinner(finalPlayerMove, finalBotMove);
    let newPlayerWins = playerWins;
    let newBotWins = botWins;
    if (outcome === "win") newPlayerWins += 1;
    if (outcome === "lose") newBotWins += 1;
    setPlayerWins(newPlayerWins);
    setBotWins(newBotWins);
    if (newPlayerWins >= 3 || newBotWins >= 3) {
      setPhase("matchOver");
      handleMatchEnd(newPlayerWins >= 3);
    } else {
      setPhase("reveal");
      setTimeout(() => {
         if(newPlayerWins < 3 && newBotWins < 3) {
             setPhase("idle");
             updatePlayerMove(null);
             setBotMove(null);
         }
      }, 3000); 
    }
  };
  const handleMatchEnd = (isPlayerWinner: boolean) => {
    if (mode === "bot") {
        if (isPlayerWinner) setBalance(prev => prev + 15);
    } else {
        if (isPlayerWinner) setBalance(prev => prev + betAmount * 2);
    }
  };
  const matchWinner = playerWins >= 3 ? "player" : botWins >= 3 ? "bot" : null;

  // --- RENDER ---
  return (
    <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
        {/* Header */}
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '0 4px'}}>
            <button onClick={onBack} style={{background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>←</button>
            <span style={{color: mode === 'pvp' ? '#f87171' : '#4ade80', fontWeight: '800', letterSpacing: '0.05em', fontSize: '0.9rem'}}>
                {mode === 'pvp' ? 'PvP АРЕНА' : 'ТРЕНИРОВКА'}
            </span>
            <div className="wallet-widget" style={{position: 'static', margin: 0, borderColor: themeColor}}>
                <span className="coin-icon">💰</span>
                <span style={{color: themeColor, fontWeight:'bold'}}>{balance}</span>
            </div>
        </div>

        {/* Lobby */}
        {phase === "lobby" && (
            <div className="lobby-panel" style={{marginTop: 40}}>
              {mode === "bot" ? (
                  <>
                    <p className="lobby-title">Тренировка с Ботом</p>
                    <p className="lobby-text">Награда за победу: 15 💰</p>
                    <button className="primary-btn" onClick={startArena} style={{background: themeColor, color: '#000'}}>Начать бой</button>
                  </>
              ) : (
                  <>
                    <p className="lobby-title">Ставка на матч</p>
                    <div className="bet-controls">
                        <input type="number" className="bet-input" value={betAmount} onChange={(e) => handleBetChange(Number(e.target.value))} style={{borderColor: themeColor}} />
                        {errorMsg && <p className="error-msg">{errorMsg}</p>}
                    </div>
                    <button className="primary-btn" onClick={startArena} style={{background: themeColor, color: '#000'}}>Играть на {betAmount} 💰</button>
                  </>
              )}
            </div>
        )}

        {/* Arena */}
        {phase !== "lobby" && (
            <>
              <div className="hud-top"> 
                <img src={BOT.avatar} className="hud-avatar" alt="Bot Avatar" />
                <div className="hud-info">
                    <div className="hud-name">{BOT.name}</div>
                    <div className="hud-score">Счет: {botWins}</div>
                </div>
              </div>

              <HandFightAnimation
                phase={phase === "idle" ? "idle" : phase === "matchOver" ? "reveal" : (phase as any)}
                countdown={countdown}
                playerMove={playerMove}
                botMove={botMove}
              />
              
              <div style={{textAlign:'center', margin: '10px 0', fontSize:'1.2rem', fontWeight:'bold'}}>
                  {playerWins} : {botWins}
              </div>

              {/* BUTTONS */}
              <div className="moves-row">
                {['rock', 'scissors', 'paper'].map((m) => {
                    const isSelected = playerMove === m;
                    return (
                        <button 
                            key={m}
                            className="pill-btn" 
                            onClick={() => handleMoveClick(m as Move)} 
                            disabled={phase==="matchOver"}
                            style={{
                                background: isSelected ? themeColor : 'rgba(255,255,255,0.05)',
                                borderColor: isSelected ? themeColor : 'rgba(56, 189, 248, 0.6)',
                                color: isSelected ? '#000' : '#fff',
                                boxShadow: isSelected ? `0 0 15px ${themeColor}` : 'none',
                                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                            }}
                        >
                            {m === 'rock' ? 'КАМЕНЬ' : m === 'scissors' ? 'НОЖНИЦЫ' : 'БУМАГА'}
                        </button>
                    )
                })}
              </div>

              {phase === "countdown" && <p className="auth-hint" style={{textAlign:'center', color: themeColor}}>Таймер: {countdown}с</p>}
            </>
        )}

        {/* Result */}
        {phase === "matchOver" && (
          <div className="match-overlay">
            <div className="match-card" style={{borderColor: themeColor}}>
              <h2 className="match-title">{matchWinner === "player" ? "ПОБЕДА!" : "ПОРАЖЕНИЕ"}</h2>
              <p className="match-score">
                 {matchWinner === "player" 
                    ? (mode === 'bot' ? "+15 💰" : `+${betAmount} 💰`) 
                    : "0 💰"}
              </p>
              <button className="primary-btn" onClick={resetToLobby} style={{background: themeColor, color: '#000'}}>В лобби</button>
              <button className="secondary-btn" style={{marginTop:10, width:'100%'}} onClick={onBack}>В меню</button>
            </div>
          </div>
        )}
    </div>
  );
};