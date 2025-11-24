import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Настройка __dirname для ES-модулей (в них этой переменной нет по умолчанию)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

// API Маршруты
app.get('/api/game-status', (req, res) => {
    res.json({ status: 'active', players: 2 });
});

// Раздача статики из папки dist (уровень выше)
app.use(express.static(path.join(__dirname, '../dist')));

// Любой другой запрос -> index.html
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});