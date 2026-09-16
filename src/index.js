const http = require('http');
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

// Khởi chạy Bot Discord
const bot = new BotClient();
bot.start();

// Tạo HTTP Server để thỏa mãn yêu cầu của Phusion Passenger trên cPanel
const PORT = process.env.PORT || 'passenger';
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'online',
    message: 'Discord Bot is running on cPanel Phusion Passenger!',
    uptime: `${Math.floor(process.uptime())} seconds`,
    timestamp: new Date().toISOString(),
  }));
});

server.listen(PORT, () => {
  logger.info(`[Passenger Keep-Alive] HTTP Server đang lắng nghe trên cổng: ${PORT}`);
});

