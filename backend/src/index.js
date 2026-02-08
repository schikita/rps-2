require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");

const Sequelize = require('sequelize');
const { sequelize, User, Item } = require('./models');

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PORT = process.env.PORT || 3000;
const IS_LOCAL = process.env.DB_HOST === 'localhost' || !process.env.DATABASE_URL;

const crypto = require("crypto");

// Проверка данных от Telegram (WebApp.initData)
function verifyTelegramWebAppData(initData) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.warn("⚠️ TELEGRAM_BOT_TOKEN not set in .env! (NOT SECURE)");
        return true;
    }

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    // Сортировка ключей и сборка строки для проверки
    const dataCheckString = Array.from(urlParams.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, val]) => `${key}=${val}`)
        .join('\n');

    const secret = crypto.createHmac('sha256', 'WebAppData').update(TELEGRAM_BOT_TOKEN).digest();
    const calculatedHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

    return calculatedHash === hash;
}

// Вспомогательный объект для хранения активных матчей
const activeMatches = new Map();

// Очистка старых сессий матчей каждые 15 минут
setInterval(() => {
    const now = Date.now();
    for (const [userId, match] of activeMatches.entries()) {
        // Если матч висит более 30 минут — удаляем
        if (match.createdAt && (now - match.createdAt > 30 * 60 * 1000)) {
            activeMatches.delete(userId);
        }
    }
}, 15 * 60 * 1000);

// MIDDLEWARE (ПРОВЕРКА ТОКЕНА)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Доступ запрещен." });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        req.userId = decoded.id;
        next();
    } catch (e) {
        res.status(403).json({ error: "Неверный токен." });
    }
};

app.get("/health", (req, res) => res.json({ ok: true }));

// АВТОРИЗАЦИЯ: РЕГИСТРАЦИЯ
app.post("/auth/register", async (req, res) => {
    try {
        const { nickname, email, password, avatar } = req.body;
        if (!nickname || !email || !password) return res.status(400).json({ error: "Заполните все поля" });

        // Валидация никнейма (только буквы и цифры)
        const nameRegex = /^[a-zA-Z0-9_а-яА-Я]+$/;
        if (!nameRegex.test(nickname)) return res.status(400).json({ error: "Никнейм может содержать только буквы и цифры" });
        if (password.length < 6) return res.status(400).json({ error: "Пароль должен быть не менее 6 символов" });

        const hash = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            username: nickname,
            email: email,
            password: hash,
            avatar: avatar || "/avatars/boy.jpg"
        });

        const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: newUser });
    } catch (e) {
        console.error(e);
        res.status(400).json({ error: "Пользователь уже существует" });
    }
});

// АВТОРИЗАЦИЯ: TELEGRAM AUTO-LOGIN
app.post("/auth/telegram", async (req, res) => {
    try {
        const { initData } = req.body;
        if (!initData) return res.status(400).json({ error: "No initData provided" });

        if (!verifyTelegramWebAppData(initData)) {
            return res.status(403).json({ error: "Invalid Telegram data" });
        }

        const params = new URLSearchParams(initData);
        const userData = JSON.parse(params.get('user'));
        const tgId = String(userData.id);

        let user = await User.findOne({ where: { telegramId: tgId } });

        // Генерация безопасного email для валидации
        const safeEmail = `${tgId}@telegram.bot`;
        const newAvatar = userData.photo_url || "/avatars/boy.jpg";

        if (!user) {
            // Создаем нового пользователя
            const nickname = userData.username || userData.first_name || `tg_${tgId}`;

            // Проверяем уникальность никнейма
            let uniqueNickname = nickname;
            let counter = 1;
            while (await User.findOne({ where: { username: uniqueNickname } })) {
                uniqueNickname = `${nickname}_${counter}`;
                counter++;
            }

            user = await User.create({
                username: uniqueNickname,
                telegramId: tgId,
                email: safeEmail,
                avatar: newAvatar
            });
        } else {
            // Обновляем аватар, если он изменился в Telegram
            if (user.avatar !== newAvatar) {
                user.avatar = newAvatar;
                await user.save();
            }
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user });
    } catch (e) {
        console.error("TG Auth Error:", e);
        res.status(500).json({ error: "Internal server error during TG auth" });
    }
});

// АВТОРИЗАЦИЯ: ВХОД
app.post("/auth/login", async (req, res) => {
    try {
        const { nickname, password } = req.body;
        const user = await User.findOne({ where: { username: nickname } });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: "Неверные учетные данные" });
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user });
    } catch (e) {
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// ПОЛУЧЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ
app.get("/api/user", authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.userId, {
            include: { model: Item, through: { attributes: [] } }
        });
        if (!user) return res.status(404).json({ error: "Пользователь не найден" });

        const userData = user.toJSON();
        if (IS_LOCAL) {
            userData.coins = 999999;
        }
        res.json({ user: userData });
    } catch (e) { res.status(500).json({ error: "Ошибка сервера" }); }
});

// ЕЖЕДНЕВНЫЙ БОНУС
const DAILY_REWARDS = [50, 100, 150, 200, 250, 300, 1000];

app.post('/api/daily-bonus', authenticateToken, async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const user = await User.findByPk(req.userId, { transaction });
        if (!user) {
            await transaction.rollback();
            return res.status(404).json({ error: "Пользователь не найден" });
        }

        const serverToday = new Date().toISOString().split('T')[0];
        const clientToday = req.body.localDate || serverToday;

        console.log(`[DailyBonus] User: ${user.username}, Last Claim: ${user.last_claim_date}, Client Today: ${clientToday}, Server Today: ${serverToday}`);

        // Prevent claiming for future dates (max 1 day buffer for timezones)
        const serverDate = new Date(serverToday);
        const clientDate = new Date(clientToday);
        const timeDiff = clientDate.getTime() - serverDate.getTime();
        const dayDiff = timeDiff / (1000 * 3600 * 24);

        if (dayDiff > 1) {
            console.warn(`[DailyBonus] Future date blocked: client=${clientToday}, server=${serverToday}`);
            await transaction.rollback();
            return res.status(400).json({ success: false, message: "Неверная дата (будущее)" });
        }

        if (user.last_claim_date) {
            const lastClaimStr = String(user.last_claim_date);
            if (lastClaimStr === clientToday) {
                console.log(`[DailyBonus] Already claimed today: ${clientToday}`);
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Награда уже получена сегодня",
                    streak: user.loginStreak,
                    reward: 0
                });
            }

            if (lastClaimStr > clientToday) {
                console.warn(`[DailyBonus] Past date claim attempt blocked: last=${lastClaimStr}, client=${clientToday}`);
                await transaction.rollback();
                return res.status(400).json({ success: false, message: "Неверная дата (прошлое)" });
            }
        }

        // Check if yesterday (to continue streak)
        const yesterdayDate = new Date(clientDate);
        yesterdayDate.setDate(clientDate.getDate() - 1);
        const yesterday = yesterdayDate.toISOString().split('T')[0];

        const oldStreak = user.loginStreak;
        if (String(user.last_claim_date) === yesterday) {
            user.loginStreak += 1;
        } else {
            user.loginStreak = 1;
        }
        console.log(`[DailyBonus] Streak updated: ${oldStreak} -> ${user.loginStreak} (Yesterday was: ${yesterday})`);

        const rewardIndex = (user.loginStreak - 1) % 7;
        const reward = DAILY_REWARDS[rewardIndex];

        user.coins += reward;
        user.total_earned += reward;
        user.last_claim_date = clientToday;

        await user.save({ transaction });
        await transaction.commit();

        console.log(`[DailyBonus] SUCCESS: User ${user.username} claimed ${reward}, new balance: ${user.coins}`);

        res.json({
            success: true,
            reward,
            streak: user.loginStreak,
            newBalance: user.coins
        });
    } catch (e) {
        if (transaction) await transaction.rollback();
        console.error(e);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// БОНУС ЗА ПРОЧТЕНИЕ ПРАВИЛ
app.post('/api/bonus/rules', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.userId);

        if (user.rulesBonusClaimed) {
            return res.json({
                success: false,
                message: "Бонус уже получен",
                new_balance: user.coins
            });
        }

        user.coins += 50;
        user.rulesBonusClaimed = true;
        await user.save();

        res.json({
            success: true,
            message: "Бонус 50 монет получен!",
            new_balance: user.coins,
            added: 50
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// МАГАЗИН: СПИСОК ТОВАРОВ
app.get('/api/shop', async (req, res) => {
    try {
        const items = await Item.findAll({ attributes: { exclude: ['createdAt', 'updatedAt'] } });
        res.json(items);
    } catch (e) { res.status(500).json({ error: "Ошибка сервера" }); }
});

// МАГАЗИН: ПОКУПКА
app.post('/api/buy', authenticateToken, async (req, res) => {
    const { itemId } = req.body;
    try {
        const user = await User.findByPk(req.userId);
        const item = await Item.findByPk(itemId);

        if (!item) return res.status(404).json({ error: "Предмет не найден" });

        const hasItem = await user.hasItem(item);
        if (hasItem) return res.status(400).json({ error: "Уже куплено" });

        if (!IS_LOCAL && user.coins < item.price) return res.status(400).json({ error: "Недостаточно монет" });

        if (!IS_LOCAL) {
            user.coins -= item.price;
            await user.save();
        }
        await user.addItem(item);

        res.json({ success: true, coins: user.coins, message: `Куплено: ${item.name}!` });
    } catch (e) {
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// БИТВА: СТАВКА (ИСПРАВЛЕНО: добавлена проверка user)
app.post("/api/bet/start", authenticateToken, async (req, res) => {
    const { betAmount } = req.body;
    try {
        const user = await User.findByPk(req.userId);

        // ВАЖНО: Проверка наличия пользователя
        if (!user) {
            return res.status(404).json({ error: "Пользователь не найден. Перезайдите." });
        }

        if (betAmount <= 0) return res.status(400).json({ error: "Ставка должна быть больше 0" });
        if (!IS_LOCAL && user.coins < betAmount) return res.status(400).json({ error: "Недостаточно средств" });

        if (!IS_LOCAL) {
            user.coins -= betAmount;
            await user.save();
        }

        // Создаем сессию матча на сервере
        activeMatches.set(req.userId, {
            betAmount,
            playerWins: 0,
            botWins: 0,
            mode: "pvp",
            active: true,
            createdAt: Date.now()
        });

        res.json({ success: true, new_balance: user.coins });
    } catch (e) {
        console.error("Ошибка ставки:", e);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// БИТВА: ТРЕНИРОВКА (Начало)
app.post("/api/match/start-training", authenticateToken, async (req, res) => {
    activeMatches.set(req.userId, { playerWins: 0, botWins: 0, mode: "bot", active: true, createdAt: Date.now() });
    res.json({ success: true });
});

// БИТВА: РАУНД
app.post("/api/match/round", authenticateToken, async (req, res) => {
    const { playerMove } = req.body;
    const match = activeMatches.get(req.userId);

    if (!match || !match.active) {
        return res.status(400).json({ error: "Нет активного матча" });
    }

    const MOVES = ['rock', 'scissors', 'paper'];
    const botMove = MOVES[Math.floor(Math.random() * MOVES.length)];

    let result = 'lose';
    if (playerMove === botMove) result = 'draw';
    else if (
        (playerMove === 'rock' && botMove === 'scissors') ||
        (playerMove === 'scissors' && botMove === 'paper') ||
        (playerMove === 'paper' && botMove === 'rock')
    ) result = 'win';

    if (result === 'win') match.playerWins++;
    if (result === 'lose') match.botWins++;

    res.json({ success: true, botMove, result, playerWins: match.playerWins, botWins: match.botWins });
});

// БИТВА: ЗАВЕРШЕНИЕ
app.post("/api/match/end", authenticateToken, async (req, res) => {
    const match = activeMatches.get(req.userId);

    if (!match || !match.active) {
        return res.status(400).json({ error: "Нет активного матча для завершения" });
    }

    try {
        const user = await User.findByPk(req.userId);
        if (!user) return res.status(404).json({ error: "Пользователь не найден" });

        const isWinner = match.playerWins >= 3;
        const isLoser = match.botWins >= 3;

        if (!isWinner && !isLoser) {
            return res.status(400).json({ error: "Матч еще не окончен" });
        }

        let profit = 0;
        if (isWinner) {
            profit = (match.mode === "bot") ? 15 : (match.betAmount * 2);
            user.coins += profit;
            user.wins += 1;
            user.total_earned += profit;
        } else {
            user.losses += 1;
        }
        await user.save();

        // Закрываем сессию
        activeMatches.delete(req.userId);

        res.json({ success: true, points_change: profit, new_balance: user.coins });
    } catch (e) { res.status(500).json({ error: "Ошибка сервера" }); }
});

// БИТВА: ОТМЕНА (выход из тренировки без завершения)
app.post("/api/match/cancel", authenticateToken, async (req, res) => {
    const match = activeMatches.get(req.userId);

    if (match) {
        activeMatches.delete(req.userId);
        console.log(`🚪 Match cancelled for user ${req.userId}`);
    }

    res.json({ success: true, message: "Матч отменен" });
});

// ЭКИПИРОВКА ПРЕДМЕТА (Универсальная)
app.post('/api/equip', authenticateToken, async (req, res) => {
    const { itemId, itemType } = req.body;
    try {
        const user = await User.findByPk(req.userId);
        if (!user) return res.status(404).json({ error: "Пользователь не найден" });

        // Unequip (itemId === -1 or null)
        if (itemId === -1 || itemId === null) {
            if (itemType === 'border') user.equippedBorderId = null;
            else if (itemType === 'background') user.equippedBackgroundId = null;
            else if (itemType === 'hands') user.equippedHandsId = null;
            await user.save();
            return res.json({ success: true });
        }

        const item = await Item.findByPk(itemId);
        if (!item) return res.status(404).json({ error: "Предмет не найден" });

        // Allow free items (price === 0) to be equipped without purchase
        const isFreeItem = item.price === 0;
        const hasItem = await user.hasItem(item);
        if (!isFreeItem && !hasItem) return res.status(403).json({ error: "Предмет не куплен" });

        // Equip based on item type
        if (item.type === 'border') user.equippedBorderId = itemId;
        else if (item.type === 'background') user.equippedBackgroundId = itemId;
        else if (item.type === 'hands') user.equippedHandsId = itemId;

        await user.save();
        res.json({ success: true, equipped: { type: item.type, id: itemId } });
    } catch (e) {
        console.error("Equip error:", e);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// ОБНОВЛЕНИЕ АВАТАРА
app.post('/api/user/avatar', authenticateToken, async (req, res) => {
    const { avatar } = req.body;
    try {
        const user = await User.findByPk(req.userId);
        if (!user) return res.status(404).json({ error: "Пользователь не найден" });
        user.avatar = avatar;
        await user.save();
        res.json({ success: true, avatar: user.avatar });
    } catch (e) { res.status(500).json({ error: "Ошибка сервера" }); }
});

// ТАБЛИЦА ЛИДЕРОВ
app.get('/api/leaderboard', async (req, res) => {
    try {
        const topPlayers = await User.findAll({
            attributes: ['id', 'username', 'avatar', 'wins', 'coins'],
            order: [['wins', 'DESC']],
            limit: 10
        });
        res.json(topPlayers);
    } catch (e) { res.status(500).json({ error: "Ошибка сервера" }); }
});

// НАПОЛНЕНИЕ МАГАЗИНА (SEED)
async function seedShop() {
    try {
        console.log("🛒 Проверка наполнения Магазина...");

        const existingItems = await Item.findAll();
        const existingNames = existingItems.map(i => i.name);

        const itemsToSeed = [
            // DEFAULTS (Free)
            { name: "Обычная рамка", price: 0, type: "border", imageId: "default", color: "#38bdf8" },
            { name: "Обычный фон", price: 0, type: "background", imageId: "default", color: "#38bdf8" },
            { name: "Обычные руки", price: 0, type: "hands", imageId: "default", color: "#38bdf8" },

            // BACKGROUNDS (Фоны)
            { name: "Неон", price: 500, type: "background", imageId: "bg_neon", color: "#22d3ee" },
            { name: "Закат", price: 1000, type: "background", imageId: "zakat", color: "#f97316" },
            { name: "Космос", price: 1500, type: "background", imageId: "cosmos", color: "#8b5cf6" },

            // HANDS (Руки)
            { name: "Танос", price: 3000, type: "hands", imageId: "tanos", color: "#8b5cf6" },
            { name: "Робокоп", price: 2500, type: "hands", imageId: "robocop", color: "#94a3b8" }
        ];

        // 1. CLEAR UNWANTED ITEMS FROM DB (Sync with itemsToSeed)
        const approvedNames = itemsToSeed.map(i => i.name);
        const deletedCount = await Item.destroy({
            where: {
                name: { [Sequelize.Op.notIn]: approvedNames }
            }
        });

        if (deletedCount > 0) {
            console.log(`🗑️ Удалено ${deletedCount} неактуальных предметов из базы.`);
        }

        let addedCount = 0;
        for (const item of itemsToSeed) {
            if (!existingNames.includes(item.name)) {
                await Item.create(item);
                addedCount++;
            }
        }
        if (addedCount > 0) {
            console.log(`✅ Магазин Обновлен! Добавлено ${addedCount} товаров.`);
        }
    } catch (e) { console.error("Ошибка создания магазина", e); }
}

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Real-time Matchmaking & Game State
const pvpQueue = [];
const pvpMatches = new Map();

io.on("connection", (socket) => {
    console.log(`🔌 New socket connection: ${socket.id}`);
    socket.on("join_queue", async (data) => {
        const { userId, token } = data;
        console.log(`📡 Join Queue attempt: User ${userId}`);
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            // Use loose equality to handle string/number differences
            if (String(decoded.id) !== String(userId)) {
                console.warn(`❌ Auth mismatch: Decoded ${decoded.id} vs Received ${userId}`);
                return;
            }

            const numericUserId = Number(userId);
            const match = activeMatches.get(numericUserId);
            if (match && match.active) {
                // Auto-cancel stale training match instead of blocking PvP
                activeMatches.delete(numericUserId);
                console.log(`🔄 Auto-cancelled stale training match for user ${numericUserId}`);
            }

            const existingIdx = pvpQueue.findIndex(p => String(p.userId) === String(userId));
            if (existingIdx !== -1) pvpQueue.splice(existingIdx, 1);

            const user = await User.findByPk(userId, {
                include: [{ model: Item, as: 'Items' }]
            });
            if (!user) {
                console.warn(`❌ User not found in DB: ${userId}`);
                return;
            }

            const equippedHands = user.Items?.find(item => item.id === user.equippedHandsId);
            const playerHandImageId = equippedHands?.imageId || null;

            const player = {
                socketId: socket.id,
                userId,
                nickname: user.username,
                avatar: user.avatar,
                handSkin: playerHandImageId // Sync the hand skin
            };

            if (pvpQueue.length > 0) {
                const opponent = pvpQueue.shift();
                console.log(`🤝 Match Found! ${player.nickname} vs ${opponent.nickname}`);

                // DEDUCT STAKES SYNC
                try {
                    const p1 = await User.findByPk(userId);
                    const p2 = await User.findByPk(opponent.userId);

                    if (!p1 || p1.coins < 50 || !p2 || p2.coins < 50) {
                        console.warn(`❌ Match cancelled: Insufficient funds for p1=${p1?.coins} or p2=${p2?.coins}`);
                        return;
                    }

                    p1.coins -= 50;
                    p2.coins -= 50;
                    await p1.save();
                    await p2.save();

                    const roomId = `room_${userId}_${opponent.userId}`;
                    const matchState = {
                        roomId,
                        players: [player, opponent],
                        moves: {},
                        scores: { [userId]: 0, [opponent.userId]: 0 },
                        active: true,
                        stakeDeducted: true
                    };
                    pvpMatches.set(roomId, matchState);

                    socket.join(roomId);
                    const opponentSocket = io.sockets.sockets.get(opponent.socketId);
                    if (opponentSocket) {
                        opponentSocket.join(roomId);
                        io.to(roomId).emit("match_found", { roomId, players: matchState.players });
                    }
                } catch (err) {
                    console.error("Match Start Error:", err);
                }
            } else {
                // Check balance before queuing
                if (IS_LOCAL || (user && user.coins >= 50)) {
                    pvpQueue.push(player);
                    socket.emit("waiting_for_opponent");
                } else {
                    socket.emit("error", { message: "Недостаточно монет для игры (нужно 50)" });
                }
            }
        } catch (e) {
            console.error(`❌ Socket Auth Error for user ${userId}:`, e.message);
        }
    });

    socket.on("submit_move", async (data) => {
        const { roomId, userId, move } = data;
        const match = pvpMatches.get(roomId);
        if (!match || !match.active) return;

        // Security check: is user in this match?
        if (!match.players.find(p => String(p.userId) === String(userId))) return;

        match.moves[String(userId)] = move;
        const playerIds = match.players.map(p => String(p.userId));

        if (Object.keys(match.moves).length === 2) {
            const p1 = playerIds[0], p2 = playerIds[1];
            const m1 = match.moves[p1], m2 = match.moves[p2];
            let res = 'draw';
            if (m1 !== m2) {
                if ((m1 === 'rock' && m2 === 'scissors') || (m1 === 'scissors' && m2 === 'paper') || (m1 === 'paper' && m2 === 'rock')) res = p1;
                else res = p2;
            }
            if (res !== 'draw') match.scores[String(res)]++;
            io.to(roomId).emit("round_result", { moves: match.moves, winner: res, scores: match.scores });
            match.moves = {};

            const winnerId = Object.keys(match.scores).find(id => match.scores[id] >= 3);
            if (winnerId) {
                match.active = false;
                const loserId = playerIds.find(id => id != winnerId);
                const winner = await User.findByPk(winnerId), loser = await User.findByPk(loserId);

                // Winner takes the 100 coin pool (50+50)
                winner.coins += 100;
                winner.wins += 1;
                winner.total_earned += 50; // Profit is 50
                loser.losses += 1;

                await winner.save();
                await loser.save();

                io.to(roomId).emit("match_over", { winnerId, reward: 100 });
                pvpMatches.delete(roomId);
            }
        }
    });

    socket.on("disconnect", async () => {
        const idx = pvpQueue.findIndex(p => p.socketId === socket.id);
        if (idx !== -1) pvpQueue.splice(idx, 1);

        for (const [roomId, match] of pvpMatches.entries()) {
            const discPlayer = match.players.find(p => p.socketId === socket.id);
            if (discPlayer && match.active) {
                match.active = false;
                const winnerObj = match.players.find(p => p.socketId !== socket.id);

                if (winnerObj) {
                    const winnerId = winnerObj.userId;
                    const winner = await User.findByPk(winnerId);
                    if (winner) {
                        // Winner by disconnect gets the 100 coin pool
                        winner.coins += 100;
                        winner.wins += 1;
                        winner.total_earned += 50;
                        await winner.save();
                        io.to(roomId).emit("match_over", { winnerId, reward: 100, reason: "opponent_disconnected" });
                    }
                }
                pvpMatches.delete(roomId);
            }
        }
    });
});

async function startServer() {
    await sequelize.sync({ alter: true });
    await seedShop();
    const distPath = path.join(__dirname, '../../dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
    server.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT} (Socket.io Enabled)`));
}
startServer();