require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Sequelize, DataTypes } = require("sequelize");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());

// --- 1. SETUP SQLITE DATABASE ---
// This creates a file named "game_database.sqlite" in your backend folder
const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: path.join(__dirname, "../game_database.sqlite"), 
    logging: false, // Set to console.log to see SQL queries
});

// --- 2. DEFINE USER MODEL ---
const User = sequelize.define("User", {
    nickname: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    avatar: {
        type: DataTypes.STRING,
        defaultValue: null
    },
    points: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
});

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
// IMPORTANT: I changed this to 3000 because your Frontend tries to connect to 3000
const PORT = 3000; 

// --- 3. SYNC DB & START SERVER ---
async function startServer() {
    try {
        await sequelize.sync(); // Creates table if it doesn't exist
        console.log("✅ SQLite Database connected & tables ready");
        
        app.listen(PORT, "0.0.0.0", () =>
            console.log(`Backend listening on port ${PORT}`)
        );
    } catch (error) {
        console.error("❌ Failed to start server:", error);
    }
}

// --- ROUTES ---

app.get("/health", (req, res) => {
    res.json({ ok: true, database: "sqlite" });
});

app.post("/auth/register", async (req, res) => {
    try {
        const { nickname, password, avatar } = req.body;

        if (!nickname || !password) {
            return res.status(400).json({ error: "nickname and password required" });
        }

        const hash = await bcrypt.hash(password, 10);

        // Create user using Sequelize
        const newUser = await User.create({
            nickname,
            password_hash: hash,
            avatar: avatar || null
        });

        const token = jwt.sign({ id: newUser.id }, JWT_SECRET);

        res.json({ 
            token, 
            user: {
                id: newUser.id,
                nickname: newUser.nickname,
                avatar: newUser.avatar,
                points: newUser.points
            }
        });
    } catch (e) {
        console.error(e);
        if (e.name === "SequelizeUniqueConstraintError") {
            return res.status(400).json({ error: "nickname already exists" });
        }
        res.status(500).json({ error: "server error" });
    }
});

app.post("/auth/login", async (req, res) => {
    try {
        const { nickname, password } = req.body;

        // Find user using Sequelize
        const user = await User.findOne({ where: { nickname } });

        if (!user) {
            return res.status(400).json({ error: "user not found" });
        }

        const ok = await bcrypt.compare(password, user.password_hash);

        if (!ok) return res.status(400).json({ error: "wrong password" });

        const token = jwt.sign({ id: user.id }, JWT_SECRET);

        res.json({
            token,
            user: {
                id: user.id,
                nickname: user.nickname,
                avatar: user.avatar,
                points: user.points
            }
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "server error" });
    }
});

startServer();