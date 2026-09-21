require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const HEALTH_PORT = Number(process.env.HEALTH_PORT || 8080);
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

function validate() {
  if (!BOT_TOKEN || BOT_TOKEN === 'replace-me') {
    throw new Error('BOT_TOKEN is required. Copy .env.example to .env and set a valid Telegram bot token.');
  }
  if (!Number.isInteger(HEALTH_PORT) || HEALTH_PORT < 1 || HEALTH_PORT > 65535) {
    throw new Error('HEALTH_PORT must be an integer between 1 and 65535.');
  }
}

module.exports = {
  BOT_TOKEN,
  HEALTH_PORT,
  LOG_LEVEL,
  validate,
  ITEM_IDS: {
    ROLE_TOKEN: 18131,
    DOTA_PLUS_1M: 11949,
    DOUBLE_DOWN: 17500,
  },
  RANKS: ['Herald', 'Guardian', 'Crusader', 'Archon', 'Legend', 'Ancient', 'Divine', 'Immortal'],
};
