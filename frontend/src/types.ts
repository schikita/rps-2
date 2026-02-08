export interface User {
    id: string;
    nickname: string;
    username?: string; // fallback from backend
    email: string;
    avatar: string;
    points: number;
    coins?: number; // fallback from backend
    inventory: number[];
    last_claim_date?: string;
    streak: number;
    loginStreak?: number; // fallback from backend
    equippedBorderId: number | null;
    equippedBackgroundId: number | null;
    equippedHandsId: number | null;
    wins: number;
    losses: number;
    total_earned: number;
    Items?: Item[];
}

export interface Item {
    id: number;
    name: string;
    price: number;
    imageId: string;
    color: string;
    type: 'avatar' | 'border' | 'background' | 'hands' | 'effect';
}
