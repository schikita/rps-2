import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User } from '../types';
import { STORAGE_KEY_USER, STORAGE_KEY_TOKEN, API_URL } from '../config';

interface UserContextType {
    user: User | null;
    token: string | null;
    login: (userData: User, token: string) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
    updateUser: (data: Partial<User>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const mapUser = (data: any): User => {
    const inv: number[] = data.Items ? data.Items.map((i: any) => i.id) : (data.inventory || []);
    return {
        id: data.id,
        nickname: data.username || data.nickname || "Player",
        email: data.email,
        avatar: data.avatar || "/avatars/skin-1.jpg",
        points: data.coins !== undefined ? data.coins : (data.points || 0),
        inventory: inv,
        last_claim_date: data.last_claim_date || data.lastLoginDate,
        streak: data.loginStreak !== undefined ? data.loginStreak : (data.streak || 0),
        equippedBorderId: data.equippedBorderId || null,
        equippedBackgroundId: data.equippedBackgroundId || null,
        equippedHandsId: data.equippedHandsId || null,
        wins: data.wins || 0,
        losses: data.losses || 0,
        total_earned: data.total_earned || 0
    };
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        const saved = localStorage.getItem(STORAGE_KEY_USER);
        return saved ? JSON.parse(saved) : null;
    });
    const [token, setToken] = useState<string | null>(localStorage.getItem(STORAGE_KEY_TOKEN));

    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem(STORAGE_KEY_USER);
        localStorage.removeItem(STORAGE_KEY_TOKEN);
    }, []);

    const login = useCallback((userData: any, userToken: string) => {
        const mapped = mapUser(userData);
        setUser(mapped);
        setToken(userToken);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(mapped));
        localStorage.setItem(STORAGE_KEY_TOKEN, userToken);
    }, []);

    const refreshUser = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/user`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) logout();
                return;
            }
            const data = await res.json();
            const mappedUser = mapUser(data.user);
            setUser(mappedUser);
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(mappedUser));
        } catch (e) {
            console.error("Refresh user error:", e);
        }
    }, [token, logout]);

    const updateUser = useCallback((data: Partial<User>) => {
        setUser(prev => {
            if (!prev) return null;
            const updated = { ...prev, ...data };
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
            return updated;
        });
    }, []);

    return (
        <UserContext.Provider value={{ user, token, login, logout, refreshUser, updateUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
