const { Events } = require('discord.js');
const BaseEvent = require('../BaseEvent');
const moderationService = require('../../services/moderationService');
const whitelistCommandHandler = require('../../services/whitelistCommandHandler');
const featureCommandHandler = require('../../services/featureCommandHandler');
const helpCommandHandler = require('../../services/helpCommandHandler');

/**
 * MessageCreateEvent
 * Lắng nghe mọi tin nhắn mới trong Guild:
 * - Điều phối câu lệnh trợ giúp / hướng dẫn (!help / /help)
 * - Điều phối câu lệnh quản lý Whitelist (!whitelist / !wl)
 * - Điều phối câu lệnh bật/tắt tính năng (!feature / !toggle)
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

    // 1. Kiểm tra xem có phải lệnh Trợ giúp (!help / /help) không
    if (helpCommandHandler.isHelpCommand(message.content)) {
      await helpCommandHandler.handleCommand(message);
      return;
    }

    // 2. Kiểm tra xem có phải lệnh quản lý Whitelist (!whitelist / !wl) không
    if (whitelistCommandHandler.isWhitelistCommand(message.content)) {
      await whitelistCommandHandler.handleCommand(message);
      return;
    }

    // 3. Kiểm tra xem có phải lệnh Bật/Tắt tính năng (!feature / !toggle) không
    if (featureCommandHandler.isFeatureCommand(message.content)) {
      await featureCommandHandler.handleCommand(message);
      return;
    }

    // 4. Chuyển tin nhắn thông thường qua dịch vụ kiểm duyệt
    await moderationService.handleMessage(message);
  }
}

module.exports = MessageCreateEvent;

