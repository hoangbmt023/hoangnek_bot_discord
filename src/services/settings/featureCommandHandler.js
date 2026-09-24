const guildSettingsService = require('./guildSettingsService');
const EmbedBuilderUtility = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

/**
 * FeatureCommandHandler
 * Xử lý các câu lệnh bật/tắt tính năng từ tin nhắn chat (!setup feature, /setup feature)
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
      lower.startsWith('!setup feature') ||
      lower.startsWith('/setup feature') ||
      lower.startsWith('!setup toggle') ||
      lower.startsWith('/setup toggle')
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
        `[TextCommand] ${message.author.tag} (${message.author.id}) đã gọi lệnh Setup Feature: "${rawContent}" tại Server "${message.guild.name}"`
      );

      let tokens = rawContent.split(/\s+/);
      if (tokens[0] && (tokens[0].toLowerCase() === '!setup' || tokens[0].toLowerCase() === '/setup')) {
        tokens = tokens.slice(1);
      }
      if (tokens[0] && ['feature', 'state', 'toggle'].includes(tokens[0].toLowerCase())) {
        tokens = tokens.slice(1);
      } else if (tokens.length > 0) {
        tokens = tokens.slice(1);
      }

      if (tokens.length === 0) {
        return this.handleStatus(message, message.guild.id);
      }

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
        // Cú pháp gõ tắt: !setup feature moderation (tự động toggle)
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
          `• \`ai\`: Trợ lý AI Assistant (!ask & /ask)\n` +
          `• \`music\`: Hệ thống Phát nhạc (s!play & /music)\n` +
          `• \`all\`: Tất cả tính năng\n\n` +
          `**Ví dụ:** \`!setup feature enable moderation\` hoặc \`!setup feature disable ai\``,
        enabled: false,
      });
      await message.reply({ embeds: [helpEmbed] });
      return;
    }

    const result = guildSettingsService.setFeatureState(guildId, featureArg, enabled);

    if (!result.success) {
      const errorEmbed = EmbedBuilderUtility.createFeatureToggleResponseEmbed({
        title: 'Tính Năng Không Hợp Lệ',
        description: `Không tìm thấy tính năng \`${featureArg}\`. Các tính năng hỗ trợ: \`moderation\`, \`welcome\`, \`leave\`, \`ai\`, \`music\`, \`all\`.`,
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
        description: `Không tìm thấy tính năng \`${featureArg}\`. Các tính năng hỗ trợ: \`moderation\`, \`welcome\`, \`leave\`, \`ai\`, \`music\`, \`all\`.`,
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
    const rawArg = (filterArg || 'all').toLowerCase();

    // Kiểm tra xem filterArg có phải là tên tính năng cụ thể không
    const normKey = guildSettingsService.normalizeFeature(rawArg);
    if (normKey && normKey !== 'all') {
      const isEnabled = guildSettingsService.isFeatureEnabled(guildId, normKey);
      const meta = guildSettingsService.getFeatureMeta(normKey);
      const badge = isEnabled ? '`BẬT`' : '`TẮT`';
      const desc = `• **${meta.name}:** ${badge}\n  *${meta.description}*`;

      const embed = EmbedBuilderUtility.createFeatureToggleResponseEmbed({
        title: `Trạng Thái Tính Năng • ${meta.name}`,
        description:
          `${desc}\n\n` +
          `*Sử dụng \`!setup feature enable/disable ${normKey}\` để thay đổi.*`,
        isStatusList: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    let filter = 'all';
    if (rawArg === 'enabled' || rawArg === 'on' || rawArg === 'bat') {
      filter = 'enabled';
    } else if (rawArg === 'disabled' || rawArg === 'off' || rawArg === 'tat') {
      filter = 'disabled';
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
        `*Sử dụng \`!setup feature enable <tính_năng>\` để thay đổi.*`,
      isStatusList: true,
    });

    await message.reply({ embeds: [embed] });
  }
}

module.exports = new FeatureCommandHandler();
