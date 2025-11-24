require("dotenv").config();
console.log("DATABASE_URL =", process.env.DATABASE_URL);


const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

async function initDb() {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nickname TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar TEXT,
      points INT DEFAULT 0
    );
  `);
    console.log("DB ready");
}

app.get("/health", (req, res) => {
    res.json({ ok: true });
});

app.post("/auth/register", async (req, res) => {
    try {
        const { nickname, password, avatar } = req.body;

        if (!nickname || !password) {
            return res.status(400).json({ error: "nickname and password required" });
        }

        const hash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (nickname, password_hash, avatar)
       VALUES ($1, $2, $3)
       RETURNING id, nickname, avatar, points`,
            [nickname, hash, avatar || null]
        );

        const user = result.rows[0];
        const token = jwt.sign({ id: user.id }, JWT_SECRET);

        res.json({ token, user });
    } catch (e) {
        console.error(e);
        if (e.code === "23505") {
            return res.status(400).json({ error: "nickname already exists" });
        }
        res.status(500).json({ error: "server error" });
    }
});

app.post("/auth/login", async (req, res) => {
    try {
        const { nickname, password } = req.body;

        const result = await pool.query(
            "SELECT * FROM users WHERE nickname = $1",
            [nickname]
        );

        if (!result.rows.length) {
            return res.status(400).json({ error: "user not found" });
        }

        const user = result.rows[0];
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

const PORT = 3001;

initDb()
    .then(() => {
        app.listen(PORT, "0.0.0.0", () =>
            console.log(`Backend listening on ${PORT}`)
        );
    })
    .catch(err => {
        console.error("DB init failed", err);
        process.exit(1);
    });
