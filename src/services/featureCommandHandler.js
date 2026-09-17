const guildSettingsService = require('./guildSettingsService');
const EmbedBuilderUtility = require('../utils/embedBuilder');
const logger = require('../utils/logger');

/**
 * FeatureCommandHandler
 * Xử lý các câu lệnh bật/tắt tính năng từ tin nhắn chat (/feature, !feature, /toggle, !toggle)
 */
class FeatureCommandHandler {
  /**
   * Kiểm tra tin nhắn có phải là lệnh feature hay không
   * @param {string} content
   * @returns {boolean}
   */
  isFeatureCommand(content) {
    if (!content || typeof content !== 'string') return false;
    const lower = content.trim().toLowerCase();
    return (
      lower.startsWith('!feature') ||
      lower.startsWith('!toggle') ||
      lower.startsWith('/feature') ||
      lower.startsWith('/toggle')
    );
  }

  /**
   * Xử lý lệnh từ tin nhắn
   * @param {import('discord.js').Message} message
   */
  async handleCommand(message) {
    if (!message || !message.guild || !message.member) return;

    // 1. Kiểm tra quyền Quản trị viên
    const hasPermission =
      message.member.permissions.has('Administrator') ||
      message.member.permissions.has('ManageGuild');

    if (!hasPermission) {
      const errorEmbed = EmbedBuilderUtility.createFeatureToggleResponseEmbed({
        title: 'Quyền Hạn Không Đủ',
        description: 'Bạn cần có quyền **Quản trị viên (Administrator)** hoặc **Quản lý máy chủ (Manage Server)** để bật/tắt tính năng.',
        enabled: false,
      });
      await message.reply({ embeds: [errorEmbed] }).catch(() => {});
      return;
    }

    const rawContent = message.content.trim();
    try {
      logger.info(
        `[TextCommand] ${message.author.tag} (${message.author.id}) đã gọi lệnh Feature: "${rawContent}" tại Server "${message.guild.name}"`
      );

      const firstSpaceIdx = rawContent.indexOf(' ');
      if (firstSpaceIdx === -1) {
        return this.handleStatus(message, message.guild.id);
      }

      const restOfCommand = rawContent.slice(firstSpaceIdx + 1).trim();
      const tokens = restOfCommand.split(/\s+/);
      const action = tokens[0].toLowerCase();
      const featureArg = tokens[1] ? tokens[1].toLowerCase() : null;

      const guildId = message.guild.id;

      if (action === 'enable' || action === 'on' || action === 'bat') {
        return this.handleSet(message, guildId, featureArg, true);
      } else if (action === 'disable' || action === 'off' || action === 'tat') {
        return this.handleSet(message, guildId, featureArg, false);
      } else if (action === 'status' || action === 'list' || action === 'trangthai') {
        return this.handleStatus(message, guildId, featureArg);
      } else if (action === 'toggle' || action === 'dao') {
        return this.handleToggle(message, guildId, featureArg);
      } else {
        // Cú pháp gõ tắt: /toggle moderation (tự động toggle)
        return this.handleToggle(message, guildId, action);
      }
    } catch (error) {
      logger.error('[FeatureCommandHandler] Lỗi khi xử lý lệnh Feature:', error);
    }
  }

  async handleSet(message, guildId, featureArg, enabled) {
    if (!featureArg) {
      const helpEmbed = EmbedBuilderUtility.createFeatureToggleResponseEmbed({
        title: 'Cú Pháp Không Hợp Lệ',
        description:
          `Vui lòng chọn tính năng cần thiết lập:\n\n` +
          `• \`moderation\`: Lọc ngôn từ độc hại & Hate Speech\n` +
          `• \`welcome\`: Thông báo chào mừng thành viên\n` +
          `• \`leave\`: Thông báo tạm biệt thành viên\n` +
          `• \`all\`: Tất cả tính năng\n\n` +
          `**Ví dụ:** \`/toggle enable moderation\` hoặc \`/toggle disable welcome\``,
        enabled: false,
      });
      await message.reply({ embeds: [helpEmbed] });
      return;
    }

    const result = guildSettingsService.setFeatureState(guildId, featureArg, enabled);

    if (!result.success) {
      const errorEmbed = EmbedBuilderUtility.createFeatureToggleResponseEmbed({
        title: 'Tính Năng Không Hợp Lệ',
        description: `Không tìm thấy tính năng \`${featureArg}\`. Các tính năng hỗ trợ: \`moderation\`, \`welcome\`, \`leave\`, \`all\`.`,
        enabled: false,
      });
      await message.reply({ embeds: [errorEmbed] });
      return;
    }

    const statusText = enabled ? 'BẬT' : 'TẮT';
    const embed = EmbedBuilderUtility.createFeatureToggleResponseEmbed({
      title: `Cập Nhật Tính Năng: [${statusText}]`,
      description:
        `• **Tính năng:** \`${result.featureName}\`\n` +
        `• **Trạng thái:** \`${statusText}\`\n\n` +
        `*Cài đặt đã được áp dụng ngay lập tức cho Server.*`,
      enabled,
    });

    await message.reply({ embeds: [embed] });
  }

  async handleToggle(message, guildId, featureArg) {
    if (!featureArg) {
      return this.handleStatus(message, guildId, 'all');
    }

    const result = guildSettingsService.toggleFeature(guildId, featureArg);

    if (!result.success) {
      const errorEmbed = EmbedBuilderUtility.createFeatureToggleResponseEmbed({
        title: 'Tính Năng Không Hợp Lệ',
        description: `Không tìm thấy tính năng \`${featureArg}\`. Các tính năng hỗ trợ: \`moderation\`, \`welcome\`, \`leave\`, \`all\`.`,
        enabled: false,
      });
      await message.reply({ embeds: [errorEmbed] });
      return;
    }

    const statusText = result.enabled ? 'BẬT' : 'TẮT';
    const embed = EmbedBuilderUtility.createFeatureToggleResponseEmbed({
      title: `Cập Nhật Tính Năng: [${statusText}]`,
      description:
        `• **Tính năng:** \`${result.featureName}\`\n` +
        `• **Trạng thái:** \`${statusText}\`\n\n` +
        `*Cài đặt đã được áp dụng ngay lập tức cho Server.*`,
      enabled: result.enabled,
    });

    await message.reply({ embeds: [embed] });
  }

  async handleStatus(message, guildId, filterArg = 'all') {
    let filter = 'all';
    if (filterArg) {
      const lower = filterArg.toLowerCase();
      if (lower === 'enabled' || lower === 'on' || lower === 'bat') {
        filter = 'enabled';
      } else if (lower === 'disabled' || lower === 'off' || lower === 'tat') {
        filter = 'disabled';
      }
    }

    let states = guildSettingsService.getAllFeatureStates(guildId);

    let filterTitle = 'Trạng Thái Tính Năng Server';
    if (filter === 'enabled') {
      states = states.filter((item) => item.enabled);
      filterTitle = 'Các Tính Năng Đang BẬT';
    } else if (filter === 'disabled') {
      states = states.filter((item) => !item.enabled);
      filterTitle = 'Các Tính Năng Đang TẮT';
    }

    let desc = '';
    if (states.length === 0) {
      if (filter === 'disabled') {
        desc = 'Hiện tại không có tính năng nào đang bị **TẮT** trong Server này.';
      } else if (filter === 'enabled') {
        desc = 'Hiện tại không có tính năng nào đang được **BẬT** trong Server này.';
      } else {
        desc = 'Không có dữ liệu tính năng.';
      }
    } else {
      desc = states
        .map((item) => {
          const badge = item.enabled ? '`BẬT`' : '`TẮT`';
          return `• **${item.name}:** ${badge}\n  *${item.description}*`;
        })
        .join('\n\n');
    }

    const embed = EmbedBuilderUtility.createFeatureToggleResponseEmbed({
      title: filterTitle,
      description:
        `${desc}\n\n` +
        `*Sử dụng \`/toggle enable <tính_năng>\` hoặc \`/toggle disable <tính_năng>\` để thay đổi.*`,
      isStatusList: true,
    });

    await message.reply({ embeds: [embed] });
  }
}

module.exports = new FeatureCommandHandler();
