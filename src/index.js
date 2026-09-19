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

// Tạo HTTP Server để thỏa mãn yêu cầu của Phusion Passenger trên cPanel (Keep-Alive)
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'online',
    message: 'Discord Bot is running successfully!',
    timestamp: new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date()),
  }));
});

// Xử lý lỗi nếu cổng/socket bị bận để không làm sập Bot
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.warn(`[Keep-Alive Server] Cổng/Socket ${PORT} đang bận hoặc đã được sử dụng. Bot Discord vẫn tiếp tục hoạt động.`);
  } else {
    logger.error('[Keep-Alive Server] Lỗi máy chủ HTTP phụ trợ:', err);
  }
});

server.listen(PORT, () => {
  logger.info(`[Keep-Alive Server] HTTP Server đang lắng nghe trên cổng/socket: ${PORT}`);
});

