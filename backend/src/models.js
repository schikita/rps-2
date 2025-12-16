const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

let sequelize;

// LOGICA CONNESSIONE (Docker vs Locale)
if (process.env.DATABASE_URL) {
    console.log("🔌 Connessione via DATABASE_URL (Docker)...");
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: process.env.DB_SSL === 'true' ? { require: true, rejectUnauthorized: false } : false
        }
    });
} else {
    console.log("💻 Connessione via variabili (Locale)...");
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
}

// 1. MODELLO USER
const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    email: { type: DataTypes.STRING, unique: true, allowNull: false, validate: { isEmail: true } }, // Aggiunto Email
    password: { type: DataTypes.STRING, allowNull: false },
    avatar: { type: DataTypes.STRING, defaultValue: "/avatars/skin-1.jpg" }, // Aggiunto Avatar
    
    // ECONOMIA: Soldi Iniziali 1000
    coins: { type: DataTypes.INTEGER, defaultValue: 1000 }, 
    
    lastLoginDate: { type: DataTypes.DATEONLY },
    loginStreak: { type: DataTypes.INTEGER, defaultValue: 0 },
    
    equippedAvatarId: { type: DataTypes.INTEGER, allowNull: true },
    equippedBorderId: { type: DataTypes.INTEGER, allowNull: true }
});

// 2. MODELLO ITEM (Shop)
const Item = sequelize.define('Item', {
    name: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.INTEGER, allowNull: false },
    imageId: { type: DataTypes.STRING, allowNull: false }, // Useremo questo per identificare lo stile (es. 'neon_green')
    color: { type: DataTypes.STRING, defaultValue: "#ffffff" }, // Colore per il frontend
    type: { type: DataTypes.ENUM('avatar', 'border', 'effect'), allowNull: false },
});

// 3. USER_ITEMS (Inventario)
const UserItem = sequelize.define('UserItem', {
    // ID automatico
});

User.belongsToMany(Item, { through: UserItem });
Item.belongsToMany(User, { through: UserItem });

module.exports = { sequelize, User, Item, UserItem };