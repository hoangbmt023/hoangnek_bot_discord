const whitelistService = require('./whitelistService');
const EmbedBuilderUtility = require('../utils/embedBuilder');
const logger = require('../utils/logger');

/**
 * WhitelistCommandHandler
 * Xử lý các câu lệnh quản lý danh sách Whitelist trong kênh chat (/wl, !wl, s!setup whitelist)
 * Hỗ trợ quản lý Người dùng (User), Vai trò (Role), và Kênh (Channel)
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
   * Định dạng ID thành mention Discord tương ứng
   * @param {string} id
   * @param {string} targetType
   * @returns {string}
   */
  formatMention(id, targetType) {
    if (targetType === 'roles' || targetType === 'role') return `<@&${id}> (\`${id}\`)`;
    if (targetType === 'channels' || targetType === 'channel') return `<#${id}> (\`${id}\`)`;
    return `<@${id}> (\`${id}\`)`;
  }

  /**
   * Xử lý lệnh whitelist từ tin nhắn
   * @param {import('discord.js').Message} message
   */
  async handleCommand(message) {
    if (!message || !message.guild || !message.member) return;

    // 1. Kiểm tra quyền: Chỉ cho phép Quản trị viên
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
        return this.parseAndAdd(message, guildId, tokens.slice(1), restOfCommand);
      } else if (firstArg === 'remove' || firstArg === 'xoa' || firstArg === 'del') {
        return this.parseAndRemove(message, guildId, tokens.slice(1), restOfCommand);
      } else if (firstArg === 'list' || firstArg === 'danhsach' || firstArg === 'show') {
        const target = tokens[1] || 'all';
        const feature = tokens[2] || 'toxic';
        return this.handleList(message, guildId, target, feature);
      } else if (firstArg === 'clear' || firstArg === 'xoatatca') {
        const target = tokens[1] || 'all';
        const feature = tokens[2] || 'toxic';
        return this.handleClear(message, guildId, target, feature);
      } else if (firstArg === 'help') {
        return this.sendHelp(message);
      } else {
        // Cú pháp rút gọn: !wl role @Role / !wl user @User / !wl @user
        return this.parseAndAdd(message, guildId, tokens, restOfCommand);
      }
    } catch (error) {
      logger.error('[WhitelistCommandHandler] Lỗi khi xử lý lệnh Whitelist:', error);
    }
  }

  /**
   * Phân tích tham số cho lệnh Add
   */
  async parseAndAdd(message, guildId, tokens, fullRest) {
    if (tokens.length === 0) {
      return this.sendHelp(message);
    }

    let target = 'users';
    let feature = 'toxic';
    let valueTokens = [];

    const knownTargets = ['user', 'users', 'role', 'roles', 'channel', 'channels', 'kenh'];
    const knownFeatures = ['toxic', 'moderation', 'all'];

    let currentIndex = 0;
    while (currentIndex < tokens.length) {
      const tok = tokens[currentIndex].toLowerCase();
      if (knownTargets.includes(tok)) {
        target = tok;
        currentIndex++;
      } else if (knownFeatures.includes(tok)) {
        feature = tok;
        currentIndex++;
      } else {
        break;
      }
    }

    valueTokens = tokens.slice(currentIndex);
    const valueInput = valueTokens.join(' ');

    // Tự động nhận diện target nếu người dùng tag cụ thể
    if (target === 'users' && valueInput) {
      target = whitelistService.detectTargetType(valueInput, 'users');
    }

    return this.handleAdd(message, guildId, target, feature, valueInput);
  }

  /**
   * Phân tích tham số cho lệnh Remove
   */
  async parseAndRemove(message, guildId, tokens, fullRest) {
    if (tokens.length === 0) {
      return this.sendHelp(message);
    }

    let target = 'users';
    let feature = 'toxic';
    let valueTokens = [];

    const knownTargets = ['user', 'users', 'role', 'roles', 'channel', 'channels', 'kenh'];
    const knownFeatures = ['toxic', 'moderation', 'all'];

    let currentIndex = 0;
    while (currentIndex < tokens.length) {
      const tok = tokens[currentIndex].toLowerCase();
      if (knownTargets.includes(tok)) {
        target = tok;
        currentIndex++;
      } else if (knownFeatures.includes(tok)) {
        feature = tok;
        currentIndex++;
      } else {
        break;
      }
    }

    valueTokens = tokens.slice(currentIndex);
    const valueInput = valueTokens.join(' ');

    if (target === 'users' && valueInput) {
      target = whitelistService.detectTargetType(valueInput, 'users');
    }

    return this.handleRemove(message, guildId, target, feature, valueInput);
  }

  async handleAdd(message, guildId, target, feature, valueInput) {
    const result = whitelistService.addTargets(guildId, target, valueInput, feature);

    if (result.added.length === 0 && result.alreadyExists.length === 0) {
      const usageEmbed = EmbedBuilderUtility.createWhitelistResponseEmbed({
        title: 'Cú Pháp Không Hợp Lệ',
        description:
          `**Cú pháp chuẩn:**\n` +
          `• \`!wl add user @user1, @user2\`\n` +
          `• \`!wl add role @Role1, @Role2\`\n` +
          `• \`!wl add channel #kenh-chat\`\n` +
          `• \`/setup whitelist add target:users value:@user1\``,
        success: false,
      });
      await message.reply({ embeds: [usageEmbed] });
      return;
    }

    let desc = `• **Đối tượng:** \`${result.targetName}\`\n• **Chức năng:** \`${result.featureName}\`\n\n`;
    if (result.added.length > 0) {
      const addedList = result.added.map((id) => `• ${this.formatMention(id, result.targetType)}`).join('\n');
      desc += `**Đã thêm vào Whitelist (${result.added.length}):**\n${addedList}\n\n`;
    }
    if (result.alreadyExists.length > 0) {
      const existList = result.alreadyExists.map((id) => `• ${this.formatMention(id, result.targetType)}`).join('\n');
      desc += `**Đã có sẵn trong Whitelist (${result.alreadyExists.length}):**\n${existList}\n\n`;
    }
    desc += `*Các đối tượng trên sẽ được miễn trừ kiểm duyệt ngôn từ.*`;

    const embed = EmbedBuilderUtility.createWhitelistResponseEmbed({
      title: 'Cập Nhật Danh Sách Whitelist',
      description: desc,
      success: true,
    });

    await message.reply({ embeds: [embed] });
  }

  async handleRemove(message, guildId, target, feature, valueInput) {
    const result = whitelistService.removeTargets(guildId, target, valueInput, feature);

    if (result.removed.length === 0 && result.notFound.length === 0) {
      const usageEmbed = EmbedBuilderUtility.createWhitelistResponseEmbed({
        title: 'Cú Pháp Không Hợp Lệ',
        description:
          `**Cú pháp chuẩn:**\n` +
          `• \`!wl remove user @user1\`\n` +
          `• \`!wl remove role @Role1\`\n` +
          `• \`!wl remove channel #kenh-chat\``,
        success: false,
      });
      await message.reply({ embeds: [usageEmbed] });
      return;
    }

    let desc = `• **Đối tượng:** \`${result.targetName}\`\n• **Chức năng:** \`${result.featureName}\`\n\n`;
    if (result.removed.length > 0) {
      const removedList = result.removed.map((id) => `• ${this.formatMention(id, result.targetType)}`).join('\n');
      desc += `**Đã xóa khỏi Whitelist (${result.removed.length}):**\n${removedList}\n\n`;
    }
    if (result.notFound.length > 0) {
      const notFoundList = result.notFound.map((id) => `• ${this.formatMention(id, result.targetType)}`).join('\n');
      desc += `**Không có trong danh sách (${result.notFound.length}):**\n${notFoundList}\n\n`;
    }
    desc += `*Các đối tượng bị xóa sẽ tiếp tục được kiểm duyệt ngôn từ bình thường.*`;

    const embed = EmbedBuilderUtility.createWhitelistResponseEmbed({
      title: 'Xóa Khỏi Danh Sách Whitelist',
      description: desc,
      success: result.removed.length > 0,
      isDestructive: true,
    });

    await message.reply({ embeds: [embed] });
  }

  async handleList(message, guildId, target = 'all', feature = 'toxic') {
    const targetFilter = target || 'all';
    const listData = whitelistService.getList(guildId, targetFilter, feature);
    const featName = whitelistService.getFeatureDisplayName(feature);
    let desc = `• **Chức năng:** \`${featName}\`\n\n`;

    if (Array.isArray(listData)) {
      const targetDisplayName = whitelistService.getTargetDisplayName(targetFilter);
      if (listData.length === 0) {
        desc += `Chưa có **${targetDisplayName}** nào trong Whitelist cho chức năng \`${featName}\`.`;
      } else {
        const listStr = listData.map((id, idx) => `  ${idx + 1}. ${this.formatMention(id, targetFilter)}`).join('\n');
        desc += `**${targetDisplayName} (${listData.length}):**\n${listStr}`;
      }
    } else {
      const { users, roles, channels } = listData;
      const totalCount = (users?.length || 0) + (roles?.length || 0) + (channels?.length || 0);

      if (totalCount === 0) {
        desc += `Danh sách Whitelist cho chức năng \`${featName}\` hiện đang trống.`;
      } else {
        if (users && users.length > 0) {
          const uStr = users.map((id, idx) => `  ${idx + 1}. <@${id}> (\`${id}\`)`).join('\n');
          desc += `👤 **Người Dùng / Users (${users.length}):**\n${uStr}\n\n`;
        }
        if (roles && roles.length > 0) {
          const rStr = roles.map((id, idx) => `  ${idx + 1}. <@&${id}> (\`${id}\`)`).join('\n');
          desc += `🛡️ **Vai Trò / Roles (${roles.length}):**\n${rStr}\n\n`;
        }
        if (channels && channels.length > 0) {
          const cStr = channels.map((id, idx) => `  ${idx + 1}. <#${id}> (\`${id}\`)`).join('\n');
          desc += `💬 **Kênh Miễn Trừ / Channels (${channels.length}):**\n${cStr}\n\n`;
        }
      }
    }

    const listEmbed = EmbedBuilderUtility.createWhitelistResponseEmbed({
      title: 'Danh Sách Whitelist Kiểm Duyệt',
      description: desc,
      success: true,
    });

    await message.reply({ embeds: [listEmbed] });
  }

  async handleClear(message, guildId, target = 'all', feature = 'toxic') {
    whitelistService.clearList(guildId, target, feature);
    const featName = whitelistService.getFeatureDisplayName(feature);
    const targetName = target === 'all' ? 'tất cả đối tượng (User, Role, Kênh)' : whitelistService.getTargetDisplayName(target);

    const clearEmbed = EmbedBuilderUtility.createWhitelistResponseEmbed({
      title: 'Dọn Dẹp Danh Sách Whitelist',
      description: `Đã xóa toàn bộ **${targetName}** trong danh sách Whitelist cho **${featName}** tại Server này.`,
      success: true,
      isDestructive: true,
    });

    await message.reply({ embeds: [clearEmbed] });
  }

  async sendHelp(message) {
    const helpEmbed = EmbedBuilderUtility.createWhitelistResponseEmbed({
      title: 'Hướng Dẫn Quản Lý Whitelist',
      description:
        `Hệ thống Whitelist miễn trừ kiểm duyệt ngôn từ cho **Người dùng**, **Vai trò (Role)** và **Kênh chat**:\n\n` +
        `**1. Thêm đối tượng vào Whitelist:**\n` +
        `• \`!wl add user @user1, @user2\` *(Thêm người dùng)*\n` +
        `• \`!wl add role @Role1, @Role2\` *(Thêm Role miễn trừ)*\n` +
        `• \`!wl add channel #general, #music\` *(Thêm Kênh miễn trừ)*\n` +
        `• \`/setup whitelist add target:users value:@user1\` *(Slash Command)*\n\n` +
        `**2. Xóa đối tượng khỏi Whitelist:**\n` +
        `• \`!wl remove user @user1\`\n` +
        `• \`!wl remove role @Role1\`\n` +
        `• \`!wl remove channel #general\`\n\n` +
        `**3. Xem danh sách Whitelist:**\n` +
        `• \`!wl list\` *(Xem toàn bộ User, Role, Kênh)*\n` +
        `• \`!wl list role\` *(Xem riêng danh sách Role)*\n\n` +
        `**4. Dọn dẹp danh sách:**\n` +
        `• \`!wl clear\` *(Xóa toàn bộ)*\n` +
        `• \`!wl clear role\` *(Xóa toàn bộ Role)*\n\n` +
        `*Lưu ý: Chỉ Quản trị viên mới có thể thực thi các lệnh này.*`,
      success: true,
    });
    await message.reply({ embeds: [helpEmbed] });
  }
}

module.exports = new WhitelistCommandHandler();


