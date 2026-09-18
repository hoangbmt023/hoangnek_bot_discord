const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { config, validateConfig } = require('../config/env');
const EventLoader = require('./EventLoader');
const logger = require('../utils/logger');

/**
 * BotClient
 * Quản lý vòng đời và cấu hình Discord Client
 */
class BotClient {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, // Cần thiết để bắt sự kiện guildMemberAdd / guildMemberRemove
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // Cần thiết để đọc nội dung tin nhắn phục vụ lọc từ ngữ độc hại
        GatewayIntentBits.GuildVoiceStates, // Cần thiết để tham gia và quản lý voice channel phát nhạc
        GatewayIntentBits.AutoModerationConfiguration, // Cần thiết để quản lý quy tắc AutoMod
        GatewayIntentBits.AutoModerationExecution, // Cần thiết để nhận sự kiện chặn tin nhắn AutoMod
      ],
      partials: [
        Partials.GuildMember,
        Partials.User,
      ],
    });
  }

  /**
   * Khởi động bot: Nạp events, kiểm tra config và kết nối Gateway
   */
  async start() {
    logger.info(`Đang khởi động Bot trên môi trường [${config.env.toUpperCase()}]...`);

    // Kiểm tra cấu hình hợp lệ
    if (!validateConfig()) {
      logger.error('Khởi động thất bại do cấu hình môi trường không hợp lệ.');
      process.exit(1);
    }

    // Đăng ký toàn bộ event listener
    EventLoader.load(this.client);

    // Xử lý các tín hiệu tắt ứng dụng an toàn (Graceful Shutdown)
    this.setupGracefulShutdown();

    try {
      await this.client.login(config.bot.token);
    } catch (error) {
      logger.error('Đăng nhập Discord thất bại. Vui lòng kiểm tra lại DISCORD_TOKEN trong file cấu hình.', error);
      process.exit(1);
    }
  }

  /**
   * Cài đặt Graceful Shutdown khi nhận SIGINT / SIGTERM
   */
  setupGracefulShutdown() {
    const handleShutdown = async (signal) => {
      logger.warn(`Nhận tín hiệu ${signal}. Đang đóng kết nối Bot...`);
      try {
        if (this.client) {
          this.client.destroy();
        }
        logger.info('Đã ngắt kết nối an toàn. Tạm biệt!');
        process.exit(0);
      } catch (err) {
        logger.error('Lỗi khi tắt bot:', err);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  }
}

module.exports = BotClient;
