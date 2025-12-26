require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { sequelize, User, Item } = require('./models');

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const PORT = process.env.PORT || 3000;

// Вспомогательный объект для хранения активных матчей (в памяти для простоты, лучше Redis для продакшена)
const activeMatches = new Map();

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

        const hash = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            username: nickname,
            email: email,
            password: hash,
            avatar: avatar || "/avatars/skin-1.jpg"
        });

        const token = jwt.sign({ id: newUser.id }, JWT_SECRET);
        res.json({ token, user: newUser });
    } catch (e) {
        console.error(e);
        res.status(400).json({ error: "Пользователь уже существует" });
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

        const token = jwt.sign({ id: user.id }, JWT_SECRET);
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
        res.json({ user });
    } catch (e) { res.status(500).json({ error: "Ошибка сервера" }); }
});

// ЕЖЕДНЕВНЫЙ БОНУС
const DAILY_REWARDS = [50, 100, 150, 200, 250, 300, 1000];

app.post('/api/daily-bonus', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.userId);
        const today = new Date().toISOString().split('T')[0];

        if (user.lastLoginDate === today) {
            return res.json({
                success: false,
                message: "Награда уже получена сегодня",
                streak: user.loginStreak,
                reward: 0
            });
        }

        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        if (user.lastLoginDate === yesterday) {
            user.loginStreak += 1;
        } else {
            user.loginStreak = 1;
        }

        const rewardIndex = (user.loginStreak - 1) % 7;
        const reward = DAILY_REWARDS[rewardIndex];

        user.coins += reward;
        user.lastLoginDate = today;
        await user.save();

        res.json({
            success: true,
            reward,
            coins: user.coins,
            streak: user.loginStreak
        });
    } catch (e) {
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

        if (user.coins < item.price) return res.status(400).json({ error: "Недостаточно монет" });

        user.coins -= item.price;
        await user.save();
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
        if (user.coins < betAmount) return res.status(400).json({ error: "Недостаточно средств" });

        user.coins -= betAmount;
        await user.save();

        // Создаем сессию матча на сервере
        activeMatches.set(req.userId, {
            betAmount,
            playerWins: 0,
            botWins: 0,
            mode: "pvp",
            active: true
        });

        res.json({ success: true, new_balance: user.coins });
    } catch (e) {
        console.error("Ошибка ставки:", e);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// БИТВА: ТРЕНИРОВКА (Начало)
app.post("/api/match/start-training", authenticateToken, async (req, res) => {
    activeMatches.set(req.userId, { playerWins: 0, botWins: 0, mode: "bot", active: true });
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

// ЭКИПИРОВКА ПРЕДМЕТА
app.post('/api/equip', authenticateToken, async (req, res) => {
    const { itemId } = req.body;
    try {
        const user = await User.findByPk(req.userId);
        if (itemId !== -1) {
            const item = await Item.findByPk(itemId);
            if (!item) return res.status(404).json({ error: "Предмет не найден" });
            const hasItem = await user.hasItem(item);
            if (!hasItem) return res.status(403).json({ error: "Предмет не куплен" });
            user.equippedBorderId = itemId;
        } else {
            user.equippedBorderId = null;
        }
        await user.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Ошибка сервера" }); }
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
        const count = await Item.count();
        if (count === 0) {
            console.log("🛒 Создание Магазина...");
            await Item.bulkCreate([
                { name: "Кислота (Acid)", price: 500, type: "border", imageId: "neon_green", color: "#22c55e" },
                { name: "Магнат (Gold)", price: 2000, type: "border", imageId: "gold_rush", color: "#facc15" },
                { name: "Киберпанк (Cyber)", price: 5000, type: "border", imageId: "cyber_punk", color: "#ec4899" }
            ]);
            console.log("✅ Магазин Готов!");
        }
    } catch (e) { console.error("Ошибка создания магазина", e); }
}

async function startServer() {
    // ВАЖНО: alter: true обновляет структуру, НЕ удаляя данные
    await sequelize.sync({ alter: true });
    await seedShop();


    // Serve static files from the React frontend app
    const distPath = path.join(__dirname, '../../dist');
    app.use(express.static(distPath));

    // Anything that doesn't match the above, send back index.html
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });

    app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));
}
startServer();