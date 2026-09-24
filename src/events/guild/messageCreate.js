const { Events } = require('discord.js');
const BaseEvent = require('../BaseEvent');
const moderationService = require('../../services/moderation/moderationService');
const helpCommandHandler = require('../../services/help/helpCommandHandler');
const setupCommandHandler = require('../../services/settings/setupCommandHandler');
const musicCommandHandler = require('../../services/music/musicCommandHandler');
const askCommandHandler = require('../../services/ai/askCommandHandler');

/**
 * MessageCreateEvent
 * Lắng nghe mọi tin nhắn mới trong Guild:
 * - Điều phối câu lệnh trợ giúp / hướng dẫn (!help / /help / s!help)
 * - Điều phối câu lệnh AI Assistant (!ask / /ask)
 * - Điều phối câu lệnh cấu hình bot (!setup ...)
 * - Điều phối câu lệnh phát nhạc (s!play, s!skip, s!queue...)
 * - Thực hiện kiểm duyệt nội dung độc hại (Moderation)
 */
class MessageCreateEvent extends BaseEvent {
  constructor() {
    super(Events.MessageCreate, false);
  }

  /**
   * Xử lý khi có tin nhắn mới được gửi
   * @param {import('discord.js').Message} message
   */
  async execute(message) {
    if (!message || message.author.bot || !message.guild) return;

    // 1. Kiểm tra xem có phải lệnh Trợ giúp (!help / /help / s!help) không
    if (helpCommandHandler.isHelpCommand(message.content)) {
      await helpCommandHandler.handleCommand(message);
      return;
    }

    // 2. Kiểm tra xem có phải lệnh AI Assistant (!ask / /ask) không
    if (askCommandHandler.isAskCommand(message.content)) {
      await askCommandHandler.handleCommand(message);
      return;
    }

    // 3. Kiểm tra xem có phải lệnh Cấu hình Bot (!setup ...) không
    if (setupCommandHandler.isSetupCommand(message.content)) {
      await setupCommandHandler.handlePrefixCommand(message);
      return;
    }

    // 4. Kiểm tra xem có phải lệnh Phát Nhạc (s!play, s!pause, s!skip...) không
    if (musicCommandHandler.isMusicCommand(message.content)) {
      await musicCommandHandler.handleCommand(message);
      return;
    }

    // 5. Chuyển tin nhắn thông thường qua dịch vụ kiểm duyệt
    await moderationService.handleMessage(message);
  }
}

module.exports = MessageCreateEvent;


