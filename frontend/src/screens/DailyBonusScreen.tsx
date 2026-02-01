import React, { useState, useEffect } from "react";
import { API_URL } from "../config";
import { useUser } from "../context/UserContext";

interface DailyBonusScreenProps {
  onBack: () => void;
  themeColor: string;
  showAlert: (title: string, msg: string, type: 'success' | 'error' | 'info') => void;
}

const REWARDS = [50, 100, 150, 200, 250, 300, 1000];

export const DailyBonusScreen: React.FC<DailyBonusScreenProps> = ({ onBack, themeColor, showAlert }) => {
  const { user, token, refreshUser } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      // Next day in UTC
      const nextDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diff = nextDay.getTime() - now.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    const timer = setInterval(updateCountdown, 1000);
    updateCountdown();
    return () => clearInterval(timer);
  }, []);

  if (!user || !token) return null;

  const today = new Date().toISOString().split('T')[0];
  const lastClaim = user.last_claim_date || "";
  const isClaimedToday = lastClaim === today;

  // Streak logic based on user.streak (synced with loginStreak from backend)
  const currentStreak = user.streak || 0;

  // The rewards are index-based: day 1 is index 0, day 7 is index 6.
  // If we claimed today, we are at currentStreak.
  // If we haven't claimed today, the next target is currentStreak (since streak resets if we miss a day).
  const targetIndex = currentStreak % 7;

  const handleClaim = async (index: number) => {
    // Only allow claiming the NEXT index in the streak if not claimed today
    if (index !== targetIndex || isClaimedToday || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/daily-bonus`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ localDate: today })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        await refreshUser();
        showAlert("Награда получена!", `Вы получили ${data.reward} монет!`, "success");
      } else {
        showAlert("Ошибка", data.message || "Не удалось получить бонус", "error");
      }
    } catch {
      showAlert("Ошибка сети", "Проверьте интернет соединение", "error");
    }
    setIsLoading(false);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 4px' }}>

      <div style={{ display: "flex", alignItems: "center", marginBottom: 20, marginTop: 10 }}>
        <button onClick={onBack} className="back-btn">🠸 Назад</button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Bounded', fontSize: '2rem', color: themeColor, textShadow: `0 0 10px ${themeColor}80` }}>
          ЕЖЕДНЕВНЫЙ БОНУС
        </h1>
        <p style={{ color: '#9ca3af' }}>Забирай награду каждый день!</p>
      </div>

      <div
        className="bonus-grid"
        style={{ '--bonus-theme': themeColor } as React.CSSProperties}
      >
        {REWARDS.map((amount, index) => {
          const dayNumber = index + 1;
          const isBigReward = index === 6;

          // If claimed today, then indices 0 to targetIndex-1 were already claimed previously,
          // and targetIndex was claimed JUST NOW.
          // If NOT claimed today, then indices 0 to targetIndex-1 were claimed previously.

          let isClaimed = false;
          let isActive = false;

          if (isClaimedToday) {
            // If we claim on Day 7 (index 6), streak becomes 7. targetIndex becomes 0.
            // This is tricky. Let's use the actual streak count for clarity.
            // We show 'claimed' for the last N days of the current 7-day cycle.
            const cyclePos = ((currentStreak - 1) % 7); // 0 to 6
            isClaimed = index <= cyclePos;
            isActive = false;
          } else {
            const cyclePos = (currentStreak % 7); // 0 to 6
            isClaimed = index < cyclePos;
            isActive = index === cyclePos;
          }

          let className = "bonus-card";
          if (isBigReward) className += " big-reward";
          if (isClaimed) className += " claimed";
          if (isActive) className += " active";

          return (
            <div
              key={index}
              className={className}
              onClick={() => handleClaim(index)}
            >
              <div className="bonus-day-text" style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: 4 }}>
                {isClaimed ? '✓ ПОЛУЧЕНО' : `ДЕНЬ ${dayNumber}`}
              </div>
              {isBigReward ? '🎁' : <img src="/images/coin.png" alt="coin" className="coin-icon" style={{ width: '1.5em', height: '1.5em' }} />}
              <div className="bonus-amount-text" style={{ fontWeight: 'bold', color: '#fff', marginTop: 4 }}>
                {amount}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: 20, textAlign: 'center', marginTop: 'auto' }}>
        {isClaimedToday ? (
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '12px', border: `1px solid ${themeColor}40` }}>
            <div style={{ color: '#9ca3af', marginBottom: 8, fontSize: '0.9rem' }}>Следующая награда через:</div>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '1.5rem',
              color: themeColor,
              fontWeight: 'bold',
              letterSpacing: '2px'
            }}>
              {timeLeft}
            </div>
          </div>
        ) : (
          <div style={{ color: themeColor, fontWeight: 'bold', animation: 'pulse 1.5s infinite' }}>
            Нажми на светящуюся ячейку!
          </div>
        )}
      </div>
    </div>
  );
};
