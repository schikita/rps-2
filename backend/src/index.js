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
const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: path.join(__dirname, "../game_database.sqlite"), 
    logging: false, 
});

// --- 2. DEFINE USER MODEL ---
const User = sequelize.define("User", {
    nickname: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
    },
    // ✅ NEW: Added Email Field
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: {
            isEmail: true // Ensures valid email format
        }
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
const PORT = 3000; 

// --- 3. SYNC DB & START SERVER ---
async function startServer() {
    try {
        // ✅ UPDATED: { alter: true } adds the 'email' column to existing DB if missing
        await sequelize.sync({ alter: true }); 
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

// --- REGISTER (Nickname + Email + Password) ---
app.post("/auth/register", async (req, res) => {
    try {
        // ✅ TYPO FIXED HERE (Removed 'fv')
        const { nickname, email, password, avatar } = req.body;

        if (!nickname || !email || !password) {
            return res.status(400).json({ error: "nickname, email, and password required" });
        }

        const hash = await bcrypt.hash(password, 10);

        // Create user
        const newUser = await User.create({
            nickname,
            email,
            password_hash: hash,
            avatar: avatar || null
        });

        const token = jwt.sign({ id: newUser.id }, JWT_SECRET);

        res.json({ 
            token, 
            user: {
                id: newUser.id,
                nickname: newUser.nickname,
                email: newUser.email,
                avatar: newUser.avatar,
                points: newUser.points
            }
        });
    } catch (e) {
        console.error(e);
        // Handle duplicate errors specifically
        if (e.name === "SequelizeUniqueConstraintError") {
            const field = e.errors[0].path; // will be 'nickname' or 'email'
            return res.status(400).json({ error: `${field} already exists` });
        }
        if (e.name === "SequelizeValidationError") {
            return res.status(400).json({ error: "Invalid email format" });
        }
        res.status(500).json({ error: "server error" });
    }
});

// --- LOGIN (Nickname Only) ---
app.post("/auth/login", async (req, res) => {
    try {
        const { nickname, password } = req.body;

        // Find user by nickname
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
                email: user.email, // Return email to frontend
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