import React, { useState } from "react";
import { useSound } from "../sounds/useSound";
import { PrivacyPolicyRules } from "./PrivacyPolicyRules";

interface PrivacyPolicyScreenProps {
    onAccept: () => void;
    refreshUser: () => void;
}

export const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({ onAccept, refreshUser }) => {
    const [isChecked, setIsChecked] = useState(false);
    const [showRules, setShowRules] = useState(false);
    const { playSound } = useSound();

    if (showRules) {
        return <PrivacyPolicyRules onBack={() => setShowRules(false)} refreshUser={refreshUser} />;
    }

    const handleContinue = () => {
        if (isChecked) {
            playSound('success');
            onAccept();
        } else {
            playSound('click_sharp');
        }
    };

    const handleCheck = () => {
        playSound('click_soft');
        setIsChecked(!isChecked);
    };

    return (
        <div className="app-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="app-gradient-bg" />

            <div className="app-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <div className="menu-card animate-scale-in" style={{
                    padding: '40px 30px',
                    maxWidth: '400px',
                    width: '90%',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 20,
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    boxShadow: '0 0 30px rgba(56, 189, 248, 0.1)'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: 10 }}>📜</div>

                    <h2 style={{ fontFamily: 'Bounded', fontSize: '1.5rem', margin: 0 }}>
                        Перед началом игры
                    </h2>

                    <p style={{ color: '#9ca3af', fontSize: '0.6rem', fontWeight: 'light', lineHeight: '1.6' }}>
                        Игра работает в формате Telegram Mini App и находится в тестовом режиме (beta). Возможны ошибки, временная недоступность и сброс прогресса/статистики.
                        Пожалуйста, ознакомьтесь с документами:
                        — Политика конфиденциальности
                        — Пользовательское соглашение
                        — Правила игры и дисклеймер
                        Игра «Камень–Ножницы–Бумага» не является азартной игрой: ставок и денежных выигрышей нет
                    </p>

                    <div
                        onClick={handleCheck}
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 15,
                            background: 'rgba(255,255,255,0.05)',
                            padding: 15,
                            borderRadius: 12,
                            cursor: 'pointer',
                            border: isChecked ? '1px solid #4ade80' : '1px solid transparent',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            border: '2px solid rgba(255,255,255,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isChecked ? '#4ade80' : 'transparent',
                            borderColor: isChecked ? '#4ade80' : 'rgba(255,255,255,0.3)',
                            flexShrink: 0,
                            marginTop: 2
                        }}>
                            {isChecked && <span style={{ color: '#000', fontSize: '1rem', fontWeight: 'bold' }}>✓</span>}
                        </div>

                        <div style={{ textAlign: 'left', fontSize: '0.85rem', color: '#cbd5e1' }}>
                            Я прочитал и соглашаюсь с <a href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); playSound('click_soft'); setShowRules(true); }} style={{ color: '#38bdf8', textDecoration: 'underline' }}>Политикой конфиденциальности</a> и правилами обработки данных.
                        </div>
                    </div>

                    <button
                        className="primary-btn"
                        onClick={handleContinue}
                        disabled={!isChecked}
                        style={{
                            marginTop: 10,
                            width: '100%',
                            opacity: isChecked ? 1 : 0.5,
                            cursor: isChecked ? 'pointer' : 'not-allowed',
                            filter: isChecked ? 'none' : 'grayscale(1)'
                        }}
                    >
                        ПРОДОЛЖИТЬ
                    </button>
                </div>
            </div>
        </div>
    );
};
