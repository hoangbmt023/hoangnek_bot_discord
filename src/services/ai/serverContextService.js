const { ChannelType, PermissionFlagsBits } = require('discord.js');

/**
 * ServerContextService
 * Thu thập và cấu trúc hóa ngữ cảnh Discord Server từ Discord.js Client/Guild
 * Phục vụ cho AI trả lời các câu hỏi liên quan đến Server mà không bịa đặt thông tin.
 */
class ServerContextService {
  /**
   * Chuyển đổi mã ChannelType thành tên dễ hiểu
   * @param {number} type
   * @returns {string}
   */
  getChannelTypeName(type) {
    switch (type) {
      case ChannelType.GuildText:
        return 'Văn bản (Text)';
      case ChannelType.GuildVoice:
        return 'Thoại (Voice)';
      case ChannelType.GuildCategory:
        return 'Chuyên mục (Category)';
      case ChannelType.GuildAnnouncement:
        return 'Thông báo (Announcement)';
      case ChannelType.GuildStageVoice:
        return 'Sân khấu (Stage)';
      case ChannelType.GuildForum:
        return 'Diễn đàn (Forum)';
      default:
        return 'Khác';
    }
  }

  /**
   * Lấy danh sách các câu lệnh bot hiện có
   * @returns {Array<{ name: string, description: string, usage: string }>}
   */
  getBotCommands() {
    return [
      {
        name: '!ask / /ask',
        description: 'Hỏi đáp với AI Assistant về kiến thức chung hoặc thông tin Server',
        usage: '!ask <câu hỏi> hoặc /ask question:<câu hỏi>',
      },
      {
        name: '!help / /help',
        description: 'Xem bảng hướng dẫn sử dụng và danh sách lệnh của bot',
        usage: '!help [tính năng] hoặc /help',
      },
      {
        name: 's!play / /music play',
        description: 'Phát nhạc từ YouTube, Spotify hoặc Direct Link',
        usage: 's!play <tên bài/link> hoặc /music play query:<tên bài/link>',
      },
      {
        name: 's!skip / /music skip',
        description: 'Bỏ qua bài hát đang phát trong danh sách phát',
        usage: 's!skip hoặc /music skip',
      },
      {
        name: 's!queue / /music queue',
        description: 'Xem danh sách các bài hát trong hàng đợi',
        usage: 's!queue [trang] hoặc /music queue',
      },
      {
        name: 's!pause / s!resume / s!stop',
        description: 'Tạm dừng, tiếp tục hoặc dừng hẳn phát nhạc và dọn dẹp hàng đợi',
        usage: 's!pause | s!resume | s!stop hoặc qua /music',
      },
      {
        name: '/setup notify',
        description: 'Cấu hình kênh gửi thông báo Chào mừng (welcome) và Tạm biệt (leave)',
        usage: '/setup notify set type:welcome channel:#kênh',
      },
      {
        name: '/setup feature',
        description: 'Bật/tắt các tính năng của bot trong server (moderation, welcome, leave)',
        usage: '/setup feature enable/disable feature:<tên tính năng>',
      },
      {
        name: '/setup whitelist',
        description: 'Quản lý danh sách trắng (Whitelist) miễn trừ kiểm duyệt ngôn từ độc hại',
        usage: '/setup whitelist add/remove/list',
      },
    ];
  }

  /**
   * Thu thập toàn bộ ngữ cảnh từ Guild Discord
   * @param {import('discord.js').Guild} guild
   * @returns {object}
   */
  collectGuildContext(guild) {
    if (!guild) {
      return {
        name: 'Không xác định',
        description: 'Không có mô tả',
        memberCount: 0,
        channels: [],
        categories: [],
        roles: [],
        commands: this.getBotCommands(),
      };
    }

    // 1. Thông tin cơ bản về Server
    const basicInfo = {
      id: guild.id,
      name: guild.name || 'Discord Server',
      description: guild.description || 'Không có mô tả',
      memberCount: guild.memberCount || 0,
      ownerId: guild.ownerId || '',
      rulesChannel: guild.rulesChannel?.name || null,
      systemChannel: guild.systemChannel?.name || null,
    };

    // 2. Danh sách Kênh và Chuyên mục (Chỉ lấy các kênh bot có quyền ViewChannel nếu có bot member)
    const channels = [];
    const categories = [];
    const botMember = guild.members?.me;

    if (guild.channels?.cache) {
      guild.channels.cache.forEach((ch) => {
        // Nếu có botMember, kiểm tra quyền xem kênh
        if (botMember && !ch.permissionsFor(botMember)?.has(PermissionFlagsBits.ViewChannel)) {
          return;
        }

        if (ch.type === ChannelType.GuildCategory) {
          categories.push({
            id: ch.id,
            name: ch.name,
            position: ch.position,
          });
        } else {
          channels.push({
            name: ch.name,
            type: this.getChannelTypeName(ch.type),
            category: ch.parent?.name || 'Không có chuyên mục',
            topic: ch.topic || '',
          });
        }
      });
    }

    // 3. Danh sách Vai trò (Roles) - Lọc role công khai, sắp xếp theo position giảm dần
    const roles = [];
    if (guild.roles?.cache) {
      const roleList = Array.isArray(guild.roles.cache)
        ? guild.roles.cache
        : Array.from(guild.roles.cache.values ? guild.roles.cache.values() : Object.values(guild.roles.cache));

      roleList
        .filter((r) => r && r.name && r.name !== '@everyone')
        .sort((a, b) => (b.position || 0) - (a.position || 0))
        .slice(0, 30) // Giới hạn tối đa 30 role quan trọng nhất để tránh tràn context
        .forEach((role) => {
          roles.push({
            name: role.name,
            position: role.position || 0,
            color: role.hexColor || '#99aab5',
          });
        });
    }

    return {
      guild: basicInfo,
      channels: channels.slice(0, 40), // Giới hạn tối đa 40 channel
      categories,
      roles,
      commands: this.getBotCommands(),
    };
  }

  /**
   * Định dạng ngữ cảnh server thành chuỗi văn bản cho Prompt Builder
   * @param {object} contextData
   * @returns {string}
   */
  formatContextForPrompt(contextData) {
    if (!contextData || !contextData.guild) return '';

    const { guild, channels, roles, commands } = contextData;

    let text = `=== THÔNG TIN CẤU TRÚC SERVER DISCORD ===\n`;
    text += `Tên Server: ${guild.name}\n`;
    if (guild.description && guild.description !== 'Không có mô tả') {
      text += `Mô tả: ${guild.description}\n`;
    }
    text += `Số lượng thành viên: ${guild.memberCount}\n`;

    if (channels && channels.length > 0) {
      text += `\n[Danh sách Kênh Chat / Thoại - Dùng khi hỏi về kênh]:\n`;
      channels.forEach((c) => {
        const topicInfo = c.topic ? ` (Chủ đề: ${c.topic})` : '';
        text += `- #${c.name} [${c.type}] thuộc mục "${c.category}"${topicInfo}\n`;
      });
    }

    if (roles && roles.length > 0) {
      text += `\n[Danh sách Vai trò (Roles) - Dùng khi hỏi về role]:\n`;
      text += roles.map((r) => `@${r.name}`).join(', ') + '\n';
    }

    if (commands && commands.length > 0) {
      text += `\n[Danh sách Lệnh Bot - Dùng khi hỏi về lệnh/tính năng bot]:\n`;
      commands.forEach((cmd) => {
        text += `- ${cmd.name}: ${cmd.description} (Cách dùng: ${cmd.usage})\n`;
      });
    }

    return text;
  }
}

module.exports = new ServerContextService();
