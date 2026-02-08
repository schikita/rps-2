const { Item } = require('./src/models');
const { sequelize } = require('./src/models');

async function check() {
    try {
        await sequelize.authenticate();
        const count = await Item.count();
        const hands = await Item.findAll({ where: { type: 'hands' } });
        console.log(`Total items: ${count}`);
        console.log(`Hands items: ${hands.length}`);
        hands.forEach(h => console.log(` - ${h.name} (${h.imageId})`));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
