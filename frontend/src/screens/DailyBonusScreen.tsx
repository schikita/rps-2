import React, { useState } from "react";
import { API_URL } from "../config";
import type { User } from "../App";

interface DailyBonusScreenProps {
  user: User;
  token: string;
  onBack: () => void;
  refreshUser: () => Promise<void>;
  themeColor: string;
  showAlert: (title: string, msg: string, type: 'success' | 'error' | 'info') => void; // Новое свойство
}

const REWARDS = [50, 100, 150, 200, 250, 300, 1000];

export const DailyBonusScreen: React.FC<DailyBonusScreenProps> = ({ user, token, onBack, refreshUser, themeColor, showAlert }) => {
  const [isLoading, setIsLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const lastClaim = user.last_claim_date || "";
  const isClaimedToday = lastClaim === today;

  let targetIndex = user.streak % 7;
  if (isClaimedToday && user.streak > 0) {
    targetIndex = (user.streak - 1) % 7;
  }

  const handleClaim = async (index: number) => {
    if (index !== targetIndex || isClaimedToday || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/daily-bonus`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        await refreshUser();
        // Используем красивый Modal вместо alert
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
        <button onClick={onBack} className="back-btn">← Назад</button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Bounded', fontSize: '2rem', color: themeColor, textShadow: `0 0 10px ${themeColor}80` }}>
          ЕЖЕДНЕВНЫЙ БОНУС
        </h1>
        <p style={{ color: '#9ca3af' }}>Нажми на день, чтобы забрать награду!</p>
      </div>

      <div
        className="bonus-grid"
        style={{ '--bonus-theme': themeColor } as React.CSSProperties}
      >
        {REWARDS.map((amount, index) => {
          const dayNumber = index + 1;
          const isBigReward = index === 6;

          const isTarget = index === targetIndex;
          const isClaimed = index < targetIndex || (index === targetIndex && isClaimedToday);
          const isActive = isTarget && !isClaimedToday;

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
              <div style={{ fontSize: isBigReward ? '3rem' : '2rem' }}>
                {isBigReward ? '🎁' : '💰'}
              </div>
              <div className="bonus-amount-text" style={{ fontWeight: 'bold', color: '#fff', marginTop: 4 }}>
                {amount}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: 20, textAlign: 'center', marginTop: 'auto' }}>
        {isClaimedToday ? (
          <div style={{ color: '#9ca3af', opacity: 0.7 }}>
            Возвращайся завтра за следующей наградой!
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