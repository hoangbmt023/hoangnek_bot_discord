const { PermissionFlagsBits } = require('discord.js');
const EmbedBuilderUtility = require('../../utils/embedBuilder');
const aiSetupHandler = require('./handlers/aiSetupHandler');
const channelSetupHandler = require('./handlers/channelSetupHandler');
const featureSetupHandler = require('./handlers/featureSetupHandler');
const knowledgeSetupHandler = require('./handlers/knowledgeSetupHandler');
const notifySetupHandler = require('./handlers/notifySetupHandler');
const whitelistSetupHandler = require('./handlers/whitelistSetupHandler');

/**
 * SetupCommandHandler (Facade / Dispatcher)
 * Điều phối các lệnh cấu hình tổng hợp (!setup ...) sang các sub-handlers chuyên trách.
 * Tuân thủ Open/Closed Principle (OCP) và Single Responsibility Principle (SRP).
 */
class SetupCommandHandler {
  /**
   * Trích xuất Channel ID từ cú pháp tag hoặc ID
   * @param {string} input
   * @returns {string|null}
   */
  extractChannelId(input) {
    return knowledgeSetupHandler.extractChannelId(input);
  }

  /**
   * Trích xuất Channel ID và Message ID từ link tin nhắn hoặc ID
   * @param {string} input
   * @param {string} [fallbackChannelId]
   * @returns {{ channelId: string, messageId: string } | null}
   */
  extractMessageInfo(input, fallbackChannelId) {
    return knowledgeSetupHandler.extractMessageInfo(input, fallbackChannelId);
  }

  /**
   * Kiểm tra tin nhắn có phải lệnh prefix !setup không
   * @param {string} content
   * @returns {boolean}
   */
  isSetupCommand(content) {
    if (!content || typeof content !== 'string') return false;
    const trimmed = content.trim().toLowerCase();
    return trimmed.startsWith('!setup');
  }

  /**
   * Xử lý lệnh dạng Prefix (!setup)
   * @param {import('discord.js').Message} message
   */
  async handlePrefixCommand(message) {
    const { member, content } = message;

    // Kiểm tra quyền Quản trị
    const hasPermission =
      member.permissions.has(PermissionFlagsBits.Administrator) ||
      member.permissions.has(PermissionFlagsBits.ManageGuild) ||
      member.permissions.has(PermissionFlagsBits.ManageChannels);

    if (!hasPermission) {
      const errorEmbed = EmbedBuilderUtility.createChannelSetupResponseEmbed({
        title: 'Quyền Hạn Không Đủ',
        description: 'Bạn cần có quyền **Quản trị viên (Administrator)** hoặc **Quản lý máy chủ (Manage Server)** để thực thi cấu hình bot.',
        success: false,
      });
      return await message.reply({ embeds: [errorEmbed] });
    }

    const args = content.trim().split(/\s+/).slice(1);
    if (args.length === 0) {
      const helpEmbed = EmbedBuilderUtility.createHelpEmbed({ feature: 'setup' });
      return await message.reply({ embeds: [helpEmbed] });
    }

    const firstArg = (args[0] || '').toLowerCase();

    // 1. Cấu hình thông báo (!setup notify / !setup welcome / !setup leave)
    if (firstArg === 'notify' || firstArg === 'notification' || firstArg === 'thongbao') {
      return await notifySetupHandler.handleNotifyCommand(message, args.slice(1));
    }
    if (firstArg === 'welcome' || firstArg === 'chao_mung') {
      return await notifySetupHandler.handleNotifyShortcut(message, 'welcome', args.slice(1));
    }
    if (firstArg === 'leave' || firstArg === 'tam_biet') {
      return await notifySetupHandler.handleNotifyShortcut(message, 'leave', args.slice(1));
    }

    // 2. Cấu hình AI Model (!setup ai / !setup model / !setup primary)
    if (firstArg === 'ai' || firstArg === 'model') {
      return await aiSetupHandler.handle(message, args.slice(1));
    }
    if (firstArg === 'primary' || firstArg === 'set-primary') {
      return await aiSetupHandler.handle(message, ['primary', ...args.slice(1)]);
    }

    // 3. Cấu hình Tri thức Server (!setup knowledge / !setup doc / !setup data)
    if (firstArg === 'knowledge' || firstArg === 'doc' || firstArg === 'data') {
      return await knowledgeSetupHandler.handle(message, args.slice(1));
    }

    // 4. Cấu hình Kênh lệnh, Whitelist, Feature
    const knownFeatures = ['music', 'moderation', 'all'];
    const knownTargets = ['channel', 'kenh', 'whitelist', 'wl', 'feature', 'state', 'toggle'];

    let feature = 'music';
    let target = 'channel';
    let action = 'list';
    let actionArgs = [];

    if (knownFeatures.includes(args[0]?.toLowerCase()) && knownTargets.includes(args[1]?.toLowerCase())) {
      feature = args[0].toLowerCase();
      target = args[1].toLowerCase();
      action = (args[2] || 'list').toLowerCase();
      actionArgs = args.slice(3);
    } else if (knownTargets.includes(args[0]?.toLowerCase())) {
      target = args[0].toLowerCase();
      action = (args[1] || 'list').toLowerCase();
      actionArgs = args.slice(2);
      feature = target === 'channel' ? 'music' : 'all';
    } else {
      target = 'channel';
      action = (args[0] || 'list').toLowerCase();
      actionArgs = args.slice(1);
      feature = 'music';
    }

    // Cross-validation
    if (feature === 'music' && target !== 'channel' && target !== 'kenh') {
      const errEmbed = EmbedBuilderUtility.createChannelSetupResponseEmbed({
        title: 'Cấu Hình Không Hợp Lệ',
        description:
          `❌ Chức năng **Âm nhạc (music)** chỉ áp dụng đối tượng **Kênh (channel)**.\n\n` +
          `> *Hệ thống âm nhạc không hỗ trợ Danh sách trắng (whitelist) hoặc Bật/Tắt module.*`,
        success: false,
      });
      return await message.reply({ embeds: [errEmbed] });
    }

    if ((target === 'whitelist' || target === 'wl') && feature !== 'moderation' && feature !== 'all') {
      const errEmbed = EmbedBuilderUtility.createWhitelistResponseEmbed({
        title: 'Cấu Hình Không Hợp Lệ',
        description:
          `❌ **Danh sách trắng (whitelist)** chỉ áp dụng cho chức năng **Lọc ngôn từ (moderation)** hoặc **Tất cả (all)**.`,
        success: false,
      });
      return await message.reply({ embeds: [errEmbed] });
    }

    if (target === 'feature' || target === 'state' || target === 'toggle') {
      return await featureSetupHandler.handle(message, action, feature, actionArgs);
    }

    if (target === 'whitelist' || target === 'wl') {
      return await whitelistSetupHandler.handle(message, action, feature, actionArgs);
    }

    return await channelSetupHandler.handle(message, action, actionArgs);
  }
}

module.exports = new SetupCommandHandler();
