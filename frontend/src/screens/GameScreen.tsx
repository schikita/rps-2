import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { User } from "../App";
import { HandFightAnimation } from "../components/HandFightAnimation";
import { type Move } from "../engine/rps";
import { API_URL } from "../config";
import { useSound } from "../sounds/useSound";

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
    const { playSound, getMusicVolume, isMusicPlaying, playMusic } = useSound();

    const [betAmount, setBetAmount] = useState<number>(mode === "bot" ? 0 : 50);
    const [isBetListOpen, setIsBetListOpen] = useState(false);
    const [localBalance, setLocalBalance] = useState(balance);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Game State
    const [playerMove, setPlayerMove] = useState<Move | null>(null);
    const [botMove, setBotMove] = useState<Move | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Match logic & Stats
    const [finalProfit, setFinalProfit] = useState(0);
    const [phase, setPhase] = useState<Phase>("lobby");
    const [countdown, setCountdown] = useState<number | null>(null);
    const playerMoveRef = useRef<Move | null>(null);

    const [playerWins, setPlayerWins] = useState(0);
    const [botWins, setBotWins] = useState(0);

    const [matchResult, setMatchResult] = useState<"win" | "lose" | "draw" | null>(null);
    const [lastRoundResult, setLastRoundResult] = useState<"win" | "lose" | "draw" | null>(null);
    const [showResultReport, setShowResultReport] = useState(false);

    const timerRef = useRef<number | null>(null);

    // Initial load
    useEffect(() => {
        const vol = getMusicVolume();
        if (vol > 0 && !isMusicPlaying()) {
            playMusic('bg_music');
        }
    }, []);

    // Effect to handle delay for result report
    useEffect(() => {
        if (phase === "matchOver") {
            const timer = setTimeout(() => {
                setShowResultReport(true);
            }, 2000); // 2 seconds delay
            return () => clearTimeout(timer);
        } else {
            setShowResultReport(false);
        }
    }, [phase]);

    const isBonusReady = !user.last_claim_date || (new Date().toISOString().split('T')[0] !== user.last_claim_date);

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
        playSound('click_main');
        clearTimer();
        setPhase("lobby");
        setCountdown(null);
        updatePlayerMove(null);
        setBotMove(null);
        setPlayerWins(0);
        setBotWins(0);
        setMatchResult(null);
        setFinalProfit(0);
        setLastRoundResult(null);
    };

    const selectBet = (amount: number) => {
        playSound('click_sharp');
        setBetAmount(amount);
        setErrorMsg(null);
        setIsBetListOpen(false);
    };

    const startArena = async () => {
        playSound('click_main');
        if (mode === "bot") {
            setIsLoading(true);
            try {
                const res = await fetch(`${API_URL}/api/match/start-training`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                });
                if (res.ok) {
                    setPhase("idle");
                    setPlayerWins(0);
                    setBotWins(0);
                }
            } catch (e) { setErrorMsg("Ошибка старта"); }
            setIsLoading(false);
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
        playSound('click_sharp');
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
            if (!res.ok) throw new Error("Ошибка раунда");

            setBotMove(data.botMove);

            setPlayerWins(data.playerWins);
            setBotWins(data.botWins);
            setLastRoundResult(data.result);
            setPhase("reveal");

            if (data.playerWins >= 3 || data.botWins >= 3) {
                setTimeout(() => finishMatch(), 1000);
            } else {
                setTimeout(() => {
                    setPhase("idle");
                    updatePlayerMove(null);
                    setBotMove(null);
                    setLastRoundResult(null);
                }, 1000);
            }

        } catch (e) {
            console.error(e);
            resetToLobby();
        }
    };

    const finishMatch = async () => {
        try {
            const res = await fetch(`${API_URL}/api/match/end`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();

            if (!res.ok) {
                console.error("Ошибка завершения:", data.error);
                return;
            }

            if (data.points_change > 0) playSound('success');

            setFinalProfit(data.points_change);
            setMatchResult(data.points_change > 0 ? "win" : "lose");
            setPhase("matchOver");
            await refreshUser();

        } catch (e) { console.error(e); }
    };

    const isGameActive = phase !== "lobby";

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Шапка */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '0 4px' }}>
                <button onClick={onBack} className="back-btn">← Назад</button>
                <span className="game-header-title" style={{ color: mode === 'pvp' ? '#f87171' : '#4ade80' }}>
                    {mode === 'pvp' ? 'АРЕНА PvP' : 'ТРЕНИРОВКА'}
                </span>
                {!isGameActive && (
                    <div className="wallet-widget menu-card" onClick={onOpenWallet} style={{ borderColor: themeColor, padding: '8px 12px', borderRadius: '999px', gap: 8, margin: 0, position: 'relative' }}>
                        <span className="coin-icon">💰</span>
                        <span style={{ color: themeColor, fontWeight: 'bold' }}>{balance}</span>
                        {isBonusReady && <div className="notification-dot" />}
                    </div>
                )}
                {isGameActive && <div style={{ width: 60 }}></div>}
            </div>

            {/* Лобби */}
            {phase === "lobby" && (
                <div className="lobby-panel">
                    <div style={{ fontSize: '3rem', marginBottom: 10, textAlign: 'center' }}>{mode === 'bot' ? '🤖' : '⚔️'}</div>
                    {mode === "bot" ? (
                        <>
                            <p className="lobby-title">Тренировка</p>
                            <p className="lobby-text">Победа: +15 💰</p>
                            <button className="primary-btn" onClick={startArena} style={{ '--theme-color': themeColor } as React.CSSProperties}>Начать бой</button>
                        </>
                    ) : (
                        <>
                            <p className="lobby-title">Ставка</p>
                            <div className="bet-dropdown-container">
                                <div className="bet-dropdown-trigger" onClick={() => !isLoading && setIsBetListOpen(!isBetListOpen)} style={{ borderColor: themeColor, opacity: isLoading ? 0.5 : 1 }}>
                                    <span>{betAmount} 💰</span>
                                    <span style={{ transform: isBetListOpen ? 'rotate(180deg)' : '0', transition: '0.2s' }}>▼</span>
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
                            <button className="primary-btn" onClick={startArena} disabled={isLoading} style={{ '--theme-color': themeColor, marginTop: 10 } as React.CSSProperties}>
                                {isLoading ? "Загрузка..." : "Играть"}
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Арена */}
            {phase !== "lobby" && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                    {/* 1. ПРОФИЛЬ ПРОТИВНИКА */}
                    <div className="game-profile-card" style={{ border: '1px solid #f87171', marginBottom: '10px', boxShadow: '0 4px 20px rgba(248, 113, 113, 0.2)' }}>
                        <img src={BOT.avatar} className="game-profile-avatar" style={{ border: '2px solid #f87171' }} alt="Bot" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="game-profile-name">{BOT.name}</div>
                            <div className="game-profile-info" style={{ color: '#f87171', opacity: 0.8 }}>Уровень 1</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div className="game-profile-score">{botWins}</div>
                        </div>
                    </div>

                    {/* 2. ПОЛЕ БОЯ */}
                    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <HandFightAnimation
                            phase={phase === "idle" ? "idle" : phase === "matchOver" ? "reveal" : phase}
                            countdown={countdown}
                            playerMove={playerMove}
                            botMove={botMove}
                            lastRoundResult={lastRoundResult}
                            showResultOverlay={!showResultReport}
                        />

                        {/* СЧЕТ ПО ЦЕНТРУ (PORTAL TO SCREEN) */}
                        {createPortal(
                            <div className="score-panel">
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                    <div style={{ color: themeColor, fontSize: '0.7rem', lineHeight: 1 }}>ВЫ</div>
                                    <div style={{ fontWeight: '800', fontSize: '1.5rem', lineHeight: 1, display: 'flex', alignItems: 'center' }}>
                                        <span style={{ color: themeColor }}>{playerWins}</span>
                                        <span style={{ color: '#9ca3af', margin: '0 4px', fontSize: '1rem' }}>:</span>
                                        <span style={{ color: '#f87171' }}>{botWins}</span>
                                    </div>
                                    <div style={{ color: '#f87171', fontSize: '0.7rem', lineHeight: 1 }}>СОПЕРНИК</div>
                                </div>
                            </div>,
                            document.body
                        )}
                    </div>

                    {/* 3. УПРАВЛЕНИЕ */}
                    <div className="moves-row" style={{ marginBottom: 12 }}>
                        {['rock', 'scissors', 'paper'].map((m) => {
                            const isSelected = playerMove === m;
                            const isDisabled = phase === "reveal" || phase === "matchOver";
                            return (
                                <button
                                    key={m}
                                    className={`game-btn ${isSelected ? 'selected' : ''} ${isDisabled && !isSelected ? 'dimmed' : ''}`}
                                    onClick={() => handleMoveClick(m as Move)}
                                    disabled={isDisabled}
                                    style={{ '--theme-color': themeColor } as React.CSSProperties}
                                >
                                    {m === 'rock' ? 'КАМЕНЬ' : m === 'scissors' ? 'НОЖНИЦЫ' : 'БУМАГА'}
                                </button>
                            )
                        })}
                    </div>

                    {/* 4. ВАШ ПРОФИЛЬ (Снизу) */}
                    <div className="game-profile-card" style={{ border: `1px solid ${themeColor}`, boxShadow: `0 4px 20px ${themeColor}20` }}>
                        <img src={user.avatar} className="game-profile-avatar" style={{ border: `2px solid ${themeColor}` }} alt="Me" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="game-profile-name">{user.nickname}</div>
                            <div
                                onClick={onOpenWallet}
                                className="game-profile-info"
                                style={{
                                    color: '#facc15',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    cursor: 'pointer',
                                    width: 'fit-content',
                                    position: 'relative'
                                }}
                                title="Нажмите, чтобы открыть кошелек"
                            >
                                <span>💰</span> {balance}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div className="game-profile-score">{playerWins}</div>
                        </div>
                    </div>

                </div>
            )}

            {/* Результат */}
            {phase === "matchOver" && showResultReport && (
                <div className="match-overlay">
                    <div className="match-card" style={{ borderColor: themeColor }}>
                        <div style={{ fontSize: '4rem', marginBottom: '10px' }}>
                            {matchResult === "win" ? "🏆" : "💀"}
                        </div>
                        <h2 className="match-title">{matchResult === "win" ? "ПОБЕДА!" : "ПОРАЖЕНИЕ"}</h2>

                        <div className="match-score" style={{ fontSize: '1.5rem', margin: '15px 0', color: finalProfit >= 0 ? '#4ade80' : '#f87171' }}>
                            {finalProfit > 0 ? `+ ${finalProfit} 💰` : `${finalProfit} 💰`}
                        </div>

                        <button className="primary-btn" onClick={resetToLobby} style={{ '--theme-color': themeColor } as React.CSSProperties}>В лобби</button>
                        <button className="secondary-btn" style={{ marginTop: 10, width: '100%' }} onClick={onBack}>В меню</button>
                    </div>
                </div>
            )}
        </div>
    );
};