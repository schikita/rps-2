require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { sequelize, User, Item } = require('./models');

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const PORT = process.env.PORT || 3000;

// MIDDLEWARE
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Access denied." });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        req.userId = decoded.id;
        next();
    } catch (e) {
        res.status(403).json({ error: "Invalid token." });
    }
};

app.get("/health", (req, res) => res.json({ ok: true }));

// AUTH: REGISTER (Corretto per salvare Avatar e Email)
app.post("/auth/register", async (req, res) => {
    try {
        const { nickname, email, password, avatar } = req.body;
        if (!nickname || !email || !password) return res.status(400).json({ error: "Missing fields" });
        
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
        res.status(400).json({ error: "User already exists" });
    }
});

// AUTH: LOGIN
app.post("/auth/login", async (req, res) => {
    try {
        const { nickname, password } = req.body;
        const user = await User.findOne({ where: { username: nickname } });
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: "Invalid credentials" });
        }
        
        const token = jwt.sign({ id: user.id }, JWT_SECRET);
        res.json({ token, user });
    } catch (e) {
        res.status(500).json({ error: "Server error" });
    }
});

// GET USER
app.get("/api/user", authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.userId, {
            include: { model: Item, through: { attributes: [] } }
        });
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({ user });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
});

// DAILY BONUS
const DAILY_REWARDS = [50, 100, 150, 200, 250, 300, 1000];

app.post('/api/daily-bonus', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.userId);
        const today = new Date().toISOString().split('T')[0];

        // 1. Проверка: уже забрал сегодня?
        if (user.lastLoginDate === today) {
            return res.json({ 
                success: false, 
                message: "Награда уже получена сегодня", 
                streak: user.loginStreak,
                reward: 0 
            });
        }

        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        // 2. Обновляем серию (Streak)
        if (user.lastLoginDate === yesterday) {
            user.loginStreak += 1;
        } else {
            user.loginStreak = 1; // Сброс на День 1, если пропустил
        }

        // 3. Выбираем награду из массива
        // (streak - 1) потому что массив начинается с 0
        // % 7 обеспечивает цикл (после 7-го дня снова 1-й)
        const rewardIndex = (user.loginStreak - 1) % 7;
        const reward = DAILY_REWARDS[rewardIndex];

        // 4. Начисляем
        user.coins += reward;
        user.lastLoginDate = today;
        await user.save();

        res.json({ 
            success: true, 
            reward, // Теперь здесь будет 50 для первого дня
            coins: user.coins, 
            streak: user.loginStreak
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Server Error" });
    }
});

// SHOP ROUTES
app.get('/api/shop', async (req, res) => {
    try {
        const items = await Item.findAll({ attributes: { exclude: ['createdAt', 'updatedAt'] } });
        res.json(items);
    } catch (e) { res.status(500).json({ error: "Server Error" }); }
});

app.post('/api/buy', authenticateToken, async (req, res) => {
    const { itemId } = req.body;
    try {
        const user = await User.findByPk(req.userId);
        const item = await Item.findByPk(itemId);

        if (!item) return res.status(404).json({ error: "Item not found" });

        const hasItem = await user.hasItem(item);
        if (hasItem) return res.status(400).json({ error: "Già posseduto" });

        if (user.coins < item.price) return res.status(400).json({ error: "Monete insufficienti" });

        user.coins -= item.price;
        await user.save();
        await user.addItem(item);

        res.json({ success: true, coins: user.coins, message: `Acquistato ${item.name}!` });
    } catch (e) {
        res.status(500).json({ error: "Server error" });
    }
});

// BATTLE ROUTES
app.post("/api/bet/start", authenticateToken, async (req, res) => {
    const { betAmount } = req.body;
    try {
        const user = await User.findByPk(req.userId);
        if (user.coins < betAmount) return res.status(400).json({ error: "No money" });
        user.coins -= betAmount;
        await user.save();
        res.json({ success: true, new_balance: user.coins });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
});

app.post("/api/match/round", authenticateToken, async (req, res) => {
    const { playerMove } = req.body;
    const MOVES = ['rock', 'scissors', 'paper'];
    const botMove = MOVES[Math.floor(Math.random() * MOVES.length)];
    
    let result = 'lose';
    if (playerMove === botMove) result = 'draw';
    else if (
        (playerMove === 'rock' && botMove === 'scissors') ||
        (playerMove === 'scissors' && botMove === 'paper') ||
        (playerMove === 'paper' && botMove === 'rock')
    ) result = 'win';

    res.json({ success: true, botMove, result });
});

app.post("/api/match/end", authenticateToken, async (req, res) => {
    const { mode, isWinner, betAmount } = req.body;
    try {
        const user = await User.findByPk(req.userId);
        let profit = 0;
        if (isWinner) {
            profit = (mode === "bot") ? 15 : (betAmount * 2);
            user.coins += profit;
            await user.save();
        }
        res.json({ success: true, points_change: profit, new_balance: user.coins });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
});



// POPOLAMENTO SHOP (Match col Frontend)
async function seedShop() {
    try {
        const count = await Item.count();
        if (count === 0) {
            console.log("🛒 Creazione Negozio...");
            await Item.bulkCreate([
                // Avatars/Effects sincronizzati con il frontend
                { name: "Кислота (Acid)", price: 500, type: "border", imageId: "neon_green", color: "#22c55e" },
                { name: "Магнат (Gold)", price: 2000, type: "border", imageId: "gold_rush", color: "#facc15" },
                { name: "Киберпанк (Cyber)", price: 5000, type: "border", imageId: "cyber_punk", color: "#ec4899" }
            ]);
            console.log("✅ Negozio Pronto!");
        }
    } catch (e) { console.error("Shop seed error", e); }
}

async function startServer() {
    await sequelize.sync({ force: true });
    await seedShop();
    app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
}
startServer();