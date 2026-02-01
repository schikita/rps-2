const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

let sequelize;

// ЛОГИКА ПОДКЛЮЧЕНИЯ (Docker vs Локально vs SQLite fall-back)
if (process.env.DATABASE_URL) {
    console.log("🔌 Подключение через DATABASE_URL (Docker)...");
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: process.env.DB_SSL === 'true' ? { require: true, rejectUnauthorized: false } : false
        }
    });
} else if (process.env.DB_HOST) {
    console.log("💻 Подключение через переменные (Локально Postgres)...");
    sequelize = new Sequelize(
        process.env.DB_NAME || 'rps_game',
        process.env.DB_USER || 'postgres',
        process.env.DB_PASS || 'password',
        {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            dialect: 'postgres',
            logging: false
        }
    );
} else {
    console.log("📂 Использование SQLite для локальной разработки...");
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, '../database.sqlite'),
        logging: false
    });
}

// 1. МОДЕЛЬ ПОЛЬЗОВАТЕЛЯ (User)
const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    telegramId: { type: DataTypes.STRING, unique: true, allowNull: true },
    email: { type: DataTypes.STRING, unique: true, allowNull: true, validate: { isEmail: true } },
    password: { type: DataTypes.STRING, allowNull: true },
    avatar: { type: DataTypes.STRING, defaultValue: "/avatars/skin-1.jpg" },

    // ЭКОНОМИКА: Стартовые деньги 1000
    coins: {
        type: DataTypes.INTEGER,
        defaultValue: 1000,
        validate: { min: 0 }
    },

    last_claim_date: { type: DataTypes.DATEONLY },
    loginStreak: { type: DataTypes.INTEGER, defaultValue: 0 },

    equippedAvatarId: { type: DataTypes.INTEGER, allowNull: true },
    equippedBorderId: { type: DataTypes.INTEGER, allowNull: true },
    equippedBackgroundId: { type: DataTypes.INTEGER, allowNull: true },
    equippedHandsId: { type: DataTypes.INTEGER, allowNull: true },

    // СТАТИСТИКА
    wins: { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0 } },
    losses: { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0 } },
    total_earned: { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0 } },

    // БОНУСЫ
    rulesBonusClaimed: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// 2. МОДЕЛЬ ПРЕДМЕТА (Item - Магазин)
const Item = sequelize.define('Item', {
    name: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.INTEGER, allowNull: false },
    imageId: { type: DataTypes.STRING, allowNull: false }, // Идентификатор стиля (например, 'neon_green')
    color: { type: DataTypes.STRING, defaultValue: "#ffffff" }, // Цвет для фронтенда
    type: { type: DataTypes.ENUM('avatar', 'border', 'background', 'hands', 'effect'), allowNull: false },
});

// 3. СВЯЗЬ ПОЛЬЗОВАТЕЛЬ-ПРЕДМЕТЫ (Инвентарь)
const UserItems = sequelize.define('UserItems', {});

User.belongsToMany(Item, { through: UserItems });
Item.belongsToMany(User, { through: UserItems });

module.exports = { sequelize, User, Item };