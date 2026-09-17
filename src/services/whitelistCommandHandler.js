const whitelistService = require('./whitelistService');
const EmbedBuilderUtility = require('../utils/embedBuilder');
const logger = require('../utils/logger');

/**
 * WhitelistCommandHandler
 * Xử lý các câu lệnh quản lý danh sách Whitelist trong kênh chat (/wl, !wl)
 */
class WhitelistCommandHandler {
  /**
   * Kiểm tra tin nhắn có phải là lệnh whitelist hay không
   * @param {string} content
   * @returns {boolean}
   */
  isWhitelistCommand(content) {
    if (!content || typeof content !== 'string') return false;
    const lower = content.trim().toLowerCase();
    return (
      lower.startsWith('!whitelist') ||
      lower.startsWith('!wl') ||
      lower.startsWith('/whitelist') ||
      lower.startsWith('/wl')
    );
  }

  /**
   * Xử lý lệnh whitelist từ tin nhắn
   * @param {import('discord.js').Message} message
   */
  async handleCommand(message) {
    if (!message || !message.guild || !message.member) return;

    // 1. Kiểm tra quyền: Chỉ cho phép Quản trị viên (Admin / Manage Guild / Manage Messages)
    const hasPermission =
      message.member.permissions.has('Administrator') ||
      message.member.permissions.has('ManageGuild') ||
      message.member.permissions.has('ManageMessages');

    if (!hasPermission) {
      const errorEmbed = EmbedBuilderUtility.createWhitelistResponseEmbed({
        title: 'Quyền Hạn Không Đủ',
        description: 'Bạn cần có quyền **Quản trị viên (Administrator)** hoặc **Quản lý máy chủ (Manage Server)** để quản lý Whitelist.',
        success: false,
      });
      await message.reply({ embeds: [errorEmbed] }).catch(() => {});
      return;
    }

    const rawContent = message.content.trim();
    try {
      logger.info(
        `[TextCommand] ${message.author.tag} (${message.author.id}) đã gọi lệnh Whitelist: "${rawContent}" tại Server "${message.guild.name}"`
      );

      const firstSpaceIdx = rawContent.indexOf(' ');
      if (firstSpaceIdx === -1) {
        return this.sendHelp(message);
      }

      const restOfCommand = rawContent.slice(firstSpaceIdx + 1).trim();
      const tokens = restOfCommand.split(/\s+/);
      const firstArg = tokens[0].toLowerCase();

      const guildId = message.guild.id;

      if (firstArg === 'add' || firstArg === 'them') {
        const feature = tokens[1] && !tokens[1].startsWith('<@') && !/^\d{17,20}$/.test(tokens[1]) ? tokens[1] : 'toxic';
        const usersPart = restOfCommand.replace(new RegExp(`^${tokens[0]}\\s+(${feature}\\s+)?`, 'i'), '');
        return this.handleAdd(message, guildId, feature, usersPart);
      } else if (firstArg === 'remove' || firstArg === 'xoa' || firstArg === 'del') {
        const feature = tokens[1] && !tokens[1].startsWith('<@') && !/^\d{17,20}$/.test(tokens[1]) ? tokens[1] : 'toxic';
        const usersPart = restOfCommand.replace(new RegExp(`^${tokens[0]}\\s+(${feature}\\s+)?`, 'i'), '');
        return this.handleRemove(message, guildId, feature, usersPart);
      } else if (firstArg === 'list' || firstArg === 'danhsach' || firstArg === 'show') {
        const feature = tokens[1] || null;
        return this.handleList(message, guildId, feature);
      } else if (firstArg === 'clear' || firstArg === 'xoatatca') {
        const feature = tokens[1] || null;
        return this.handleClear(message, guildId, feature);
      } else if (firstArg === 'help') {
        return this.sendHelp(message);
      } else {
        const feature = firstArg;
        const usersPart = restOfCommand.slice(firstArg.length).trim();
        return this.handleAdd(message, guildId, feature, usersPart);
      }
    } catch (error) {
      logger.error('[WhitelistCommandHandler] Lỗi khi xử lý lệnh Whitelist:', error);
    }
  }

  async handleAdd(message, guildId, feature, usersInput) {
    const result = whitelistService.addUsers(guildId, usersInput, feature);

    if (result.added.length === 0 && result.alreadyExists.length === 0) {
      const usageEmbed = EmbedBuilderUtility.createWhitelistResponseEmbed({
        title: 'Cú Pháp Không Hợp Lệ',
        description:
          `**Cú pháp chuẩn:**\n` +
          `• \`/wl <chức_năng> @user1, @user2, ...\`\n` +
          `• \`/wl add toxic @user1, @user2\`\n` +
          `• \`/wl add all 123456789012345678\``,
        success: false,
      });
      await message.reply({ embeds: [usageEmbed] });
      return;
    }

    let desc = `• **Chức năng:** \`${result.featureName}\`\n\n`;
    if (result.added.length > 0) {
      const addedList = result.added.map((id) => `• <@${id}> (\`${id}\`)`).join('\n');
      desc += `**Thành viên đã thêm (${result.added.length}):**\n${addedList}\n\n`;
    }
    if (result.alreadyExists.length > 0) {
      const existList = result.alreadyExists.map((id) => `• <@${id}>`).join('\n');
      desc += `**Thành viên đã có sẵn (${result.alreadyExists.length}):**\n${existList}\n\n`;
    }
    desc += `*Các thành viên trên sẽ được miễn trừ kiểm duyệt cho chức năng này.*`;

    const embed = EmbedBuilderUtility.createWhitelistResponseEmbed({
      title: 'Cập Nhật Danh Sách Whitelist',
      description: desc,
      success: true,
    });

    await message.reply({ embeds: [embed] });
  }

  async handleRemove(message, guildId, feature, usersInput) {
    const result = whitelistService.removeUsers(guildId, usersInput, feature);

    if (result.removed.length === 0 && result.notFound.length === 0) {
      const usageEmbed = EmbedBuilderUtility.createWhitelistResponseEmbed({
        title: 'Cú Pháp Không Hợp Lệ',
        description:
          `**Cú pháp chuẩn:**\n` +
          `• \`/wl remove <chức_năng> @user1, @user2\`\n` +
          `• \`/wl remove toxic @user1\``,
        success: false,
      });
      await message.reply({ embeds: [usageEmbed] });
      return;
    }

    let desc = `• **Chức năng:** \`${result.featureName}\`\n\n`;
    if (result.removed.length > 0) {
      const removedList = result.removed.map((id) => `• <@${id}> (\`${id}\`)`).join('\n');
      desc += `**Thành viên đã xóa (${result.removed.length}):**\n${removedList}\n\n`;
    }
    if (result.notFound.length > 0) {
      const notFoundList = result.notFound.map((id) => `• <@${id}>`).join('\n');
      desc += `**Không có trong danh sách (${result.notFound.length}):**\n${notFoundList}\n\n`;
    }
    desc += `*Các thành viên bị xóa sẽ tiếp tục được kiểm duyệt bình thường.*`;

    const embed = EmbedBuilderUtility.createWhitelistResponseEmbed({
      title: 'Xóa Khỏi Danh Sách Whitelist',
      description: desc,
      success: result.removed.length > 0,
      isDestructive: true,
    });

    await message.reply({ embeds: [embed] });
  }

  async handleList(message, guildId, feature) {
    const listData = whitelistService.getList(guildId, feature);
    let desc = '';

    if (feature) {
      const userIds = Array.isArray(listData) ? listData : [];
      const featName = whitelistService.getFeatureDisplayName(feature);

      if (userIds.length === 0) {
        desc = `Chưa có thành viên nào trong danh sách Whitelist cho chức năng \`${featName}\`.`;
      } else {
        const listStr = userIds.map((id, idx) => `${idx + 1}. <@${id}> (\`${id}\`)`).join('\n');
        desc = `• **Chức năng:** \`${featName}\` (${userIds.length} người)\n\n${listStr}`;
      }
    } else {
      const entries = Object.entries(listData);
      if (entries.length === 0) {
        desc = 'Chưa có thành viên nào được thêm vào Whitelist trong Server này.';
      } else {
        for (const [feat, uids] of entries) {
          if (uids.length > 0) {
            const featName = whitelistService.getFeatureDisplayName(feat);
            const listStr = uids.map((id, idx) => `  ${idx + 1}. <@${id}> (\`${id}\`)`).join('\n');
            desc += `**${featName} (${uids.length}):**\n${listStr}\n\n`;
          }
        }
      }
    }

    const listEmbed = EmbedBuilderUtility.createWhitelistResponseEmbed({
      title: 'Danh Sách Thành Viên Whitelist',
      description: desc || 'Danh sách hiện đang trống.',
      success: true,
    });

    await message.reply({ embeds: [listEmbed] });
  }

  async handleClear(message, guildId, feature) {
    whitelistService.clearList(guildId, feature);
    const featName = feature ? whitelistService.getFeatureDisplayName(feature) : 'Tất cả chức năng';

    const clearEmbed = EmbedBuilderUtility.createWhitelistResponseEmbed({
      title: 'Dọn Dẹp Danh Sách Whitelist',
      description: `Đã xóa toàn bộ danh sách thành viên Whitelist cho **${featName}** trong Server này.`,
      success: true,
      isDestructive: true,
    });

    await message.reply({ embeds: [clearEmbed] });
  }

  async sendHelp(message) {
    const helpEmbed = EmbedBuilderUtility.createWhitelistResponseEmbed({
      title: 'Hướng Dẫn Quản Lý Whitelist',
      description:
        `Hệ thống hỗ trợ miễn trừ kiểm duyệt theo từng tính năng và nhiều người dùng cùng lúc:\n\n` +
        `**1. Thêm thành viên vào Whitelist:**\n` +
        `• \`/wl <chức_năng> @user1, @user2\` *(ví dụ: \`/wl toxic @user1, @user2\`)*\n` +
        `• \`/wl add toxic @user1, @user2\`\n` +
        `• \`/wl add all @user1, 123456789012345678\`\n\n` +
        `**2. Xóa thành viên khỏi Whitelist:**\n` +
        `• \`/wl remove toxic @user1, @user2\`\n\n` +
        `**3. Xem danh sách thành viên:**\n` +
        `• \`/wl list\` *(hoặc lọc theo \`feature\`)*\n\n` +
        `**4. Dọn dẹp danh sách:**\n` +
        `• \`/wl clear\`\n\n` +
        `*Lưu ý: Chỉ Quản trị viên mới có thể thực thi các lệnh này.*`,
      success: true,
    });
    await message.reply({ embeds: [helpEmbed] });
  }
}

module.exports = new WhitelistCommandHandler();


