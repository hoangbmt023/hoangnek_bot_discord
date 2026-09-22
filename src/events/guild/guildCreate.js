const { Events, ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const BaseEvent = require('../BaseEvent');
const logger = require('../../utils/logger');

/**
 * GuildCreateEvent
 * Lắng nghe sự kiện khi Bot được thêm vào một Server mới.
 */
class GuildCreateEvent extends BaseEvent {
  constructor() {
    super(Events.GuildCreate, false);
  }

  /**
   * @param {import('discord.js').Guild} guild
   */
  async execute(guild) {
    if (!guild) return;

    logger.info(
      `[GuildCreate] Bot đã được mời vào Server mới: "${guild.name}" (ID: ${guild.id}, Thành viên: ${guild.memberCount})`
    );

    try {
      // Tìm kênh phù hợp để gửi tin nhắn chào mừng và hướng dẫn thiết lập ban đầu
      const targetChannel =
        (guild.systemChannel && guild.systemChannel.isTextBased() && this.hasPermissions(guild.systemChannel, guild))
          ? guild.systemChannel
          : guild.channels.cache.find(
              (ch) =>
                ch.type === ChannelType.GuildText &&
                ch.permissionsFor(guild.client.user)?.has([
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.EmbedLinks,
                ])
            );

      if (!targetChannel) return;

      const welcomeEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setAuthor({
          name: 'HOANGNEK DISCORD BOT • XIN CHÀO!',
          iconURL: guild.client.user.displayAvatarURL(),
        })
        .setTitle(`Cảm ơn bạn đã mời Bot vào server ${guild.name}! 🎉`)
        .setDescription(
          'Bot đã sẵn sàng phục vụ server của bạn với các tính năng cao cấp:\n\n' +
          '• 🎵 **Phát Nhạc Cao Cấp:** Dùng lệnh `s!play <tên bài | link>` hoặc `/music play`\n' +
          '• 🔒 **Phân Quyền Kênh Nhạc:** Quản trị viên dùng `/setup channel add` hoặc `!setup channel add #kênh` để cấp phép kênh dùng lệnh\n' +
          '• 🌟 **Thông Báo Vào/Ra:** Mặc định gửi vào Kênh hệ thống này. Có thể tùy chỉnh bằng `/setup notify set` hoặc `!setup notify <welcome|leave> #kênh`\n' +
          '• 🤖 **Trợ Lý AI:** Gõ `!ask <câu hỏi>` hoặc `/ask` để hỏi đáp thông minh\n' +
          '• 🛡️ **Lọc Ngôn Từ Độc Hại:** Tự động bảo vệ server khỏi ngôn từ xúc phạm & thù ghét\n' +
          '• 📖 **Hướng Dẫn Sử Dụng:** Gõ `/help` hoặc `!help` để xem toàn bộ danh sách lệnh (gõ `s!help` để xem lệnh nhạc)'
        )
        .setFooter({
          text: 'Hoangnek Bot • Chúc cộng đồng của bạn phát triển vững mạnh!',
        })
        .setTimestamp();

      await targetChannel.send({ embeds: [welcomeEmbed] }).catch(() => {});
    } catch (error) {
      logger.warn(`[GuildCreate] Không thể gửi tin nhắn chào mừng tại ${guild.name}: ${error.message}`);
    }
  }

  /**
   * Kiểm tra quyền của bot tại kênh
   * @param {import('discord.js').TextChannel} channel
   * @param {import('discord.js').Guild} guild
   * @returns {boolean}
   */
  hasPermissions(channel, guild) {
    const perms = channel.permissionsFor(guild.client.user);
    if (!perms) return false;
    return perms.has([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
    ]);
  }
}

module.exports = GuildCreateEvent;
