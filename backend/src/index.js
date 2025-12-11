require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Sequelize, DataTypes } = require("sequelize");

const app = express();
app.use(express.json());
app.use(cors());

// --- CONFIG ---
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const PORT = 3000; 

// --- 1. SETUP DATABASE ---
let sequelize;
if (process.env.DATABASE_URL) {
    sequelize = new Sequelize(process.env.DATABASE_URL, { dialect: "postgres", logging: false });
} else {
    sequelize = new Sequelize(
        process.env.DB_NAME || "rps_game",
        process.env.DB_USER || "postgres",
        process.env.DB_PASS || "password",
        { host: process.env.DB_HOST || "localhost", dialect: "postgres", logging: false }
    );
}

// --- 2. MODEL ---
const User = sequelize.define("User", {
    nickname: { type: DataTypes.STRING, unique: true, allowNull: false },
    email: { type: DataTypes.STRING, unique: true, allowNull: false, validate: { isEmail: true } },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    avatar: { type: DataTypes.STRING, defaultValue: null },
    points: { type: DataTypes.INTEGER, defaultValue: 1000 },
    inventory: { type: DataTypes.TEXT, defaultValue: '["default"]' },
    last_claim_date: { type: DataTypes.DATE, defaultValue: null }
});

// --- 3. MIDDLEWARE ---
const verifyToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Access denied." });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (e) {
        res.status(403).json({ error: "Invalid token." });
    }
};

// --- ROUTES ---
app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/auth/register", async (req, res) => {
    try {
        const { nickname, email, password, avatar } = req.body;
        if (!nickname || !email || !password) return res.status(400).json({ error: "Missing fields" });
        const hash = await bcrypt.hash(password, 10);
        const newUser = await User.create({ nickname, email, password_hash: hash, avatar });
        const token = jwt.sign({ id: newUser.id }, JWT_SECRET);
        res.json({ token, user: newUser });
    } catch (e) {
        res.status(400).json({ error: "Nickname or Email exists" });
    }
});

app.post("/auth/login", async (req, res) => {
    try {
        const { nickname, password } = req.body;
        const user = await User.findOne({ where: { nickname } });
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(400).json({ error: "Invalid credentials" });
        }
        const token = jwt.sign({ id: user.id }, JWT_SECRET);
        res.json({ token, user });
    } catch (e) {
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/api/user", verifyToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.userId);
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({ user });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
});

app.post("/api/shop/buy", verifyToken, async (req, res) => {
    const { itemId, price } = req.body;
    try {
        const user = await User.findByPk(req.userId);
        if (user.points < price) return res.status(400).json({ error: "Insufficient funds" });
        let inventory = JSON.parse(user.inventory || '["default"]');
        if (inventory.includes(itemId)) return res.status(400).json({ error: "Owned" });
        inventory.push(itemId);
        user.points -= price;
        user.inventory = JSON.stringify(inventory);
        await user.save();
        res.json({ success: true, inventory, new_balance: user.points });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
});

app.post("/api/daily-bonus", verifyToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.userId);
        const now = new Date();
        const lastClaim = user.last_claim_date ? new Date(user.last_claim_date) : null;
        if (lastClaim && (now - lastClaim) < 24 * 60 * 60 * 1000) {
            return res.status(400).json({ error: "Bonus not ready yet" });
        }
        user.points += 50;
        user.last_claim_date = now;
        await user.save();
        res.json({ success: true, new_balance: user.points, message: "+50 Coins Added!" });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
});

// --- MATCH LOGIC ---

// 1. START MATCH: Deduct Bet
app.post("/api/bet/start", verifyToken, async (req, res) => {
    const { betAmount } = req.body;
    const amount = parseInt(betAmount, 10);
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid bet" });

    try {
        const user = await User.findByPk(req.userId);
        if (user.points < amount) return res.status(400).json({ error: "Insufficient funds" });

        user.points -= amount;
        await user.save();

        res.json({ success: true, bet_deducted: amount, new_balance: user.points });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
});

// 2. PLAY ROUND: Logic Only (No Money)
const MOVES = ['rock', 'scissors', 'paper'];
const detectWinner = (p1, p2) => {
    if (p1 === p2) return 'draw';
    if ((p1 === 'rock' && p2 === 'scissors') || (p1 === 'scissors' && p2 === 'paper') || (p1 === 'paper' && p2 === 'rock')) return 'win';
    return 'lose';
};

app.post("/api/match/round", verifyToken, async (req, res) => {
    const { playerMove } = req.body;
    if (!MOVES.includes(playerMove)) return res.status(400).json({ error: "Invalid move" });

    const botMove = MOVES[Math.floor(Math.random() * MOVES.length)];
    const result = detectWinner(playerMove, botMove);

    res.json({ success: true, botMove, result });
});

// 3. END MATCH: Give Reward
app.post("/api/match/end", verifyToken, async (req, res) => {
    const { mode, isWinner, betAmount } = req.body;
    const finalBetAmount = parseInt(betAmount, 10) || 0;

    try {
        const user = await User.findByPk(req.userId);
        let profit = 0;

        if (isWinner) {
            // If Player Wins Match:
            // Bot Mode: +15 coins
            // PvP Mode: Returns Original Bet + Winnings (Bet * 2)
            profit = (mode === "bot") ? 15 : (finalBetAmount * 2);
            user.points += profit;
            await user.save();
        } 
        // If Loser: Nothing happens (bet was already deducted at start)

        res.json({ success: true, points_change: profit, new_balance: user.points });
    } catch (e) { res.status(500).json({ error: "Server error" }); }
});

async function startServer() {
    await sequelize.sync({ alter: true });
    app.listen(PORT, "0.0.0.0", () => console.log(`Backend running on ${PORT}`));
}
startServer();