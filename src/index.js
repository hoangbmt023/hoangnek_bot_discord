const BotClient = require('./core/BotClient');
const logger = require('./utils/logger');

// Bắt các ngoại lệ chưa được xử lý để tránh crash đột ngột mà không có log
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection tại:', promise);
  logger.error('Lý do:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception đã xảy ra:', error);
});

// Khởi chạy Bot
const bot = new BotClient();
bot.start();
