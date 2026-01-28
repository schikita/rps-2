
import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { HandFightAnimation } from "../components/HandFightAnimation";
import { type Move } from "../engine/rps";
import { API_URL } from "../config";
import { useSound } from "../sounds/useSound";
import { useUser } from "../context/UserContext";
import { socket } from "../socket";

const BOT_AVATAR = "/avatars/skin-6.jpg";
type Phase = "lobby" | "matching" | "idle" | "countdown" | "reveal" | "matchOver";

interface GameScreenProps {
    mode: "bot" | "pvp";
    onBack: () => void;
    onOpenWallet: () => void;
    themeColor: string;
    isVisible?: boolean;
}

const BOT = { name: "Кибер-бот", avatar: BOT_AVATAR };

export const GameScreen: React.FC<GameScreenProps> = ({ mode, onBack, onOpenWallet, themeColor, isVisible }) => {
    const { user, token, refreshUser } = useUser();
    const { playSound } = useSound();

    if (!user || !token) return null;

    const balance = user.points;
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Swipe Back (mobile)
    const rootRef = useRef<HTMLDivElement | null>(null);
    const swipeRef = useRef({
        startX: 0,
        startY: 0,
        startTs: 0,
        active: false,
    });

    // Game State
    const [playerMove, setPlayerMove] = useState<Move | null>(null);
    const [opponentMove, setOpponentMove] = useState<Move | null>(null);
    const [opponent, setOpponent] = useState<{ nickname: string, avatar: string, id: any } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [phase, setPhase] = useState<Phase>("lobby");
    const [countdown, setCountdown] = useState<number | null>(null);
    const playerMoveRef = useRef<Move | null>(null);
    const [playerWins, setPlayerWins] = useState(0);
    const [opponentWins, setOpponentWins] = useState(0);
    const [matchResult, setMatchResult] = useState<"win" | "lose" | "draw" | null>(null);
    const [lastRoundResult, setLastRoundResult] = useState<"win" | "lose" | "draw" | null>(null);
    const [showResultReport, setShowResultReport] = useState(false);
    const [pvpRoomId, setPvpRoomId] = useState<string | null>(null);
    const [finalProfit, setFinalProfit] = useState(0);

    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        if (phase === "matchOver") {
            const timer = setTimeout(() => setShowResultReport(true), 2000);
            return () => clearTimeout(timer);
        } else {
            setShowResultReport(false);
        }
    }, [phase]);

    useEffect(() => {
        if (mode === "pvp") {
            socket.on("match_found", (data) => {
                const otherPlayer = data.players.find((p: any) => String(p.userId) !== String(user.id));
                setOpponent({
                    nickname: otherPlayer.nickname,
                    avatar: otherPlayer.avatar,
                    id: otherPlayer.userId
                });
                setPvpRoomId(data.roomId);
                setPhase("idle");
                playSound('success');
            });

            socket.on("round_result", (data) => {
                const otherId = Object.keys(data.moves).find(id => String(id) !== String(user.id));
                const theirMove = data.moves[otherId || ""];

                setOpponentMove(theirMove);
                setPlayerWins(data.scores[user.id]);
                setOpponentWins(data.scores[otherId || ""]);

                let res: "win" | "lose" | "draw" = "draw";
                if (String(data.winner) === String(user.id)) res = "win";
                else if (data.winner === "draw") res = "draw";
                else res = "lose";

                setLastRoundResult(res);
                setPhase("reveal");

                setTimeout(() => {
                    setPhase(current => (current === "reveal" ? "idle" : current));
                    setPlayerMove(null);
                    setOpponentMove(null);
                    setLastRoundResult(null);
                }, 2000);
            });


            socket.on("match_over", (data) => {
                setMatchResult(String(data.winnerId) === String(user.id) ? "win" : "lose");
                setFinalProfit(data.reward);
                setPhase("matchOver");
                refreshUser();
            });

            socket.on("opponent_disconnected", () => {
                setPhase(current => {
                    if (current !== "matchOver") {
                        setErrorMsg("Оппонент отключился");
                        setTimeout(() => resetToLobby(), 3000);
                        return current;
                    }
                    return current;
                });
            });

            return () => {
                socket.off("match_found");
                socket.off("round_result");
                socket.off("match_over");
                socket.off("opponent_disconnected");
            };
        }
    }, [mode, user.id, refreshUser, playSound]);

    // Свайп влево в нижней части экрана => onBack()
    useEffect(() => {
        const el = rootRef.current;
        if (!el) return;

        const isProbablyMobile = typeof window !== "undefined" && window.matchMedia
            ? window.matchMedia("(pointer: coarse)").matches
            : true;

        if (!isProbablyMobile) return;

        const isInteractiveTarget = (target: EventTarget | null) => {
            const node = target as HTMLElement | null;
            if (!node) return false;
            const tag = (node.tagName || "").toLowerCase();
            if (tag === "input" || tag === "textarea" || tag === "select" || tag === "button") return true;
            if (node.isContentEditable) return true;
            return !!node.closest?.("input,textarea,select,button,[contenteditable='true']");
        };

        const onTouchStart = (e: TouchEvent) => {
            if (!e.touches || e.touches.length !== 1) return;
            if (isInteractiveTarget(e.target)) return;

            const t = e.touches[0];
            swipeRef.current.startX = t.clientX;
            swipeRef.current.startY = t.clientY;
            swipeRef.current.startTs = Date.now();
            swipeRef.current.active = true;
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (!swipeRef.current.active) return;
            swipeRef.current.active = false;

            if (!e.changedTouches || e.changedTouches.length !== 1) return;

            const t = e.changedTouches[0];
            const endX = t.clientX;
            const endY = t.clientY;

            const dx = endX - swipeRef.current.startX;
            const dy = endY - swipeRef.current.startY;
            const dt = Date.now() - swipeRef.current.startTs;

            const h = window.innerHeight || 0;
            const bottomZonePx = Math.min(220, Math.floor(h * 0.35));
            const isInBottomZone = swipeRef.current.startY >= (h - bottomZonePx);

            // Порог/фильтры жеста
            const minSwipeX = 80;      // минимум по X (px)
            const maxSwipeY = 70;      // максимум по Y (px), чтобы не путать со скроллом
            const maxDuration = 700;   // мс

            const isLeftSwipe = dx <= -minSwipeX;
            const isMostlyHorizontal = Math.abs(dy) <= maxSwipeY;
            const isFastEnough = dt <= maxDuration;

            if (isInBottomZone && isLeftSwipe && isMostlyHorizontal && isFastEnough) {
                onBack();
            }
        };

        el.addEventListener("touchstart", onTouchStart, { passive: true });
        el.addEventListener("touchend", onTouchEnd, { passive: true });

        return () => {
            el.removeEventListener("touchstart", onTouchStart);
            el.removeEventListener("touchend", onTouchEnd);
        };
    }, [onBack]);

    const isBonusReady = !user.last_claim_date || (new Date().toISOString().split('T')[0] !== user.last_claim_date);



    const resetToLobby = () => {
        playSound('click_main');
        if (timerRef.current) clearInterval(timerRef.current);
        setPhase("lobby");
        setCountdown(null);
        setPlayerMove(null);
        setOpponentMove(null);
        setPlayerWins(0);
        setOpponentWins(0);
        setMatchResult(null);
        setFinalProfit(0);
        setLastRoundResult(null);
        setOpponent(null);
        setPvpRoomId(null);
        setErrorMsg(null);
        socket.disconnect();
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
                    setOpponentWins(0);
                }
            } catch { setErrorMsg("Ошибка старта"); }
            setIsLoading(false);
            return;
        }

        if (balance < 50) { setErrorMsg("Недостаточно средств (нужно 50)!"); return; }

        setIsLoading(true);
        setPhase("matching");
        socket.connect();
        socket.emit("join_queue", { userId: user.id, token });
        setIsLoading(false);
    };

    const handleMoveClick = (move: Move) => {
        if (phase === "reveal" || phase === "matchOver") return;
        if (mode === "pvp" && playerMove !== null) return;

        playSound('click_sharp');
        setPlayerMove(move);
        playerMoveRef.current = move;

        if (mode === "bot") {
            if (phase === "idle") startCountdown();
        } else {
            if (pvpRoomId) {
                socket.emit("submit_move", { roomId: pvpRoomId, userId: user.id, move });
            }
        }
    };

    const startCountdown = () => {
        setPhase("countdown");
        setOpponentMove(null);
        setCountdown(3);
        let current = 3;
        const id = window.setInterval(() => {
            current -= 1;
            setCountdown(current);
            if (current <= 0) {
                clearInterval(id);
                playRoundOnServer();
            }
        }, 1000);
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
            setOpponentMove(data.botMove);
            setPlayerWins(data.playerWins);
            setOpponentWins(data.botWins);
            setLastRoundResult(data.result);
            setPhase("reveal");

            if (data.playerWins >= 3 || data.botWins >= 3) {
                setTimeout(() => finishMatch(), 1000);
            } else {
                setTimeout(() => {
                    setPhase("idle");
                    setPlayerMove(null);
                    setOpponentMove(null);
                    setLastRoundResult(null);
                }, 1000);
            }
        } catch { resetToLobby(); }
    };

    const finishMatch = async () => {
        try {
            const res = await fetch(`${API_URL}/api/match/end`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.points_change > 0) playSound('success');
            setFinalProfit(data.points_change);
            setMatchResult(data.points_change > 0 ? "win" : "lose");
            setPhase("matchOver");
            refreshUser();
        } catch { }
    };



    const isGameActive = phase !== "lobby" && phase !== "matching";

    return (
        <div ref={rootRef} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '0 4px', height: '44px' }}>
                <button onClick={onBack} className="back-btn">🠸 Назад</button>
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <span className="game-header-title" style={{ color: mode === 'pvp' ? '#f87171' : '#4ade80' }}>
                        {mode === 'pvp' ? 'АРЕНА ОНЛАЙН' : 'ТРЕНИРОВКА'}
                    </span>
                </div>
                <div style={{ width: '100px', display: 'flex', justifyContent: 'flex-end' }}>
                    {!isGameActive && phase !== "matching" && (
                        <div className="wallet-widget menu-card" onClick={onOpenWallet} style={{ borderColor: themeColor, padding: '8px 12px', borderRadius: '999px', gap: 8, margin: 0, position: 'relative' }}>
                            <img src="/images/coin.png" alt="coin" className="coin-icon" />
                            <span style={{ color: themeColor, fontWeight: 'bold' }}>{balance}</span>
                            {isBonusReady && <div className="notification-dot" />}
                        </div>
                    )}
                </div>
            </div>

            {phase === "lobby" && (
                <div className="lobby-panel">
                    <div style={{ marginBottom: 10, textAlign: 'center' }}>
                        <img src={mode === 'bot' ? "/images/Training.png" : "/images/pvp.png"} alt="Mode" style={{ width: mode === 'bot' ? '80px' : '120px', height: mode === 'bot' ? '80px' : '120px', objectFit: 'contain' }} />
                    </div>
                    <p className="lobby-title">{mode === 'bot' ? 'Тренировка' : 'Рейтинговый бой'}</p>
                    <p className="lobby-text">{mode === 'bot' ? 'Победа: +15' : 'Награда: +50'} <img src="/images/coin.png" alt="coin" className="coin-icon" /></p>
                    <p className="error-msg" style={{ minHeight: '1.2rem', margin: '4px 0', visibility: errorMsg ? 'visible' : 'hidden' }}>{errorMsg || ' '}</p>
                    <button className="primary-btn" onClick={startArena} disabled={isLoading} style={{ '--theme-color': themeColor, marginTop: 10 } as React.CSSProperties}>
                        {isLoading ? "Загрузка..." : mode === 'bot' ? "Начать бой" : "Найти противника"}
                    </button>
                </div>
            )}

            {phase === "matching" && (
                <div className="lobby-panel">
                    <div className="loader" style={{ borderColor: themeColor, borderTopColor: 'transparent' }}></div>
                    <p className="lobby-title" style={{ marginTop: 20 }}>Поиск противника...</p>
                    <p className="lobby-text">Это может занять несколько секунд</p>
                    <button className="secondary-btn" onClick={resetToLobby} style={{ marginTop: 20 }}>Отмена</button>
                </div>
            )}




            {isGameActive && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="game-profile-card" style={{ border: '1px solid #f87171', marginBottom: '10px', boxShadow: '0 4px 20px rgba(248, 113, 113, 0.2)' }}>
                        <img src={opponent?.avatar || BOT.avatar} className="game-profile-avatar" style={{ border: '2px solid #f87171' }} alt="Opponent" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="game-profile-name">{opponent?.nickname || BOT.name}</div>
                            <div className="game-profile-info" style={{ color: '#f87171', opacity: 0.8 }}>Соперник</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div className="game-profile-score">{opponentWins}</div>
                        </div>
                    </div>

                    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <HandFightAnimation
                            phase={phase === "idle" ? "idle" : phase === "matchOver" ? "reveal" : phase}
                            countdown={countdown}
                            playerMove={playerMove}
                            botMove={opponentMove}
                            lastRoundResult={lastRoundResult}
                            showResultOverlay={!showResultReport}
                        />

                        {isVisible && createPortal(
                            <div className="score-panel">
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                    <div style={{ color: themeColor, fontSize: '0.7rem', lineHeight: 1 }}>ВЫ</div>
                                    <div style={{ fontWeight: '800', fontSize: '1.5rem', lineHeight: 1, display: 'flex', alignItems: 'center' }}>
                                        <span style={{ color: themeColor }}>{playerWins}</span>
                                        <span style={{ color: '#9ca3af', margin: '0 4px', fontSize: '1rem' }}>:</span>
                                        <span style={{ color: '#f87171' }}>{opponentWins}</span>
                                    </div>
                                    <div style={{ color: '#f87171', fontSize: '0.7rem', lineHeight: 1 }}>СОПЕРНИК</div>
                                </div>
                            </div>,
                            document.body
                        )}
                    </div>

                    <div className="moves-row" style={{ marginBottom: 12 }}>
                        {['rock', 'scissors', 'paper'].map((m) => {
                            const isSelected = playerMove === m;
                            const isDisabled = phase === "reveal" || phase === "matchOver" || (mode === "pvp" && playerMove !== null);
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



                    <div className="game-profile-card" style={{ border: `1px solid ${themeColor}`, boxShadow: `0 4px 20px ${themeColor}20` }}>
                        <img src={user.avatar} className="game-profile-avatar" style={{ border: `2px solid ${themeColor}` }} alt="Me" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="game-profile-name">{user.nickname}</div>
                            <div onClick={onOpenWallet} className="game-profile-info" style={{ color: '#facc15', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', width: 'fit-content' }}>
                                <img src="/images/coin.png" alt="coin" className="coin-icon" /> {balance}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div className="game-profile-score">{playerWins}</div>
                        </div>
                    </div>
                </div>
            )}

            {phase === "matchOver" && showResultReport && (
                <div className="match-overlay">
                    <div className="match-card" style={{ borderColor: themeColor }}>
                        <div style={{ fontSize: '4rem', marginBottom: '10px' }}>{matchResult === "win" ? "🏆" : "💀"}</div>
                        <h2 className="match-title">{matchResult === "win" ? "ПОБЕДА!" : "ПОРАЖЕНИЕ"}</h2>
                        <div className="match-score" style={{ fontSize: '1.5rem', margin: '15px 0', color: finalProfit >= 0 ? '#4ade80' : '#f87171' }}>
                            {finalProfit > 0 ? <>{`+ ${finalProfit} `} <img src="/images/coin.png" alt="coin" className="coin-icon" /></> : <>{`${finalProfit} `} <img src="/images/coin.png" alt="coin" className="coin-icon" /></>}
                        </div>
                        <button className="primary-btn" onClick={onBack} style={{ '--theme-color': themeColor, width: '100%' } as React.CSSProperties}>В меню</button>
                    </div>
                </div>
            )}
        </div>
    );
};