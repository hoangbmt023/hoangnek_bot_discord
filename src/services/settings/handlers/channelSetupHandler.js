const EmbedBuilderUtility = require('../../../utils/embedBuilder');
const channelSetupService = require('../channelSetupService');

/**
 * ChannelSetupHandler
 * Xử lý lệnh cấu hình kênh được cấp phép dùng bot (!setup channel add/remove/list/clear và viết tắt !setup add/remove...)
 */
class ChannelSetupHandler {
  /**
   * Trích xuất Channel ID từ cú pháp tag hoặc ID
   * @param {string} input
   * @returns {string|null}
   */
  extractChannelId(input) {
    if (!input) return null;
    const match = input.match(/^<#(\d+)>$/) || input.match(/^(\d{17,20})$/);
    return match ? match[1] : null;
  }

  /**
   * @param {import('discord.js').Message} message
   * @param {string} action
   * @param {string[]} actionArgs
   */
  async handle(message, action, actionArgs) {
    const { guild } = message;

    switch (action) {
      case 'add': {
        const channelInput = actionArgs[0];
        const channelId = this.extractChannelId(channelInput);

        if (!channelId || !guild.channels.cache.has(channelId)) {
          const errEmbed = EmbedBuilderUtility.createChannelSetupResponseEmbed({
            title: 'Kênh Không Hợp Lệ',
            description: 'Vui lòng tag kênh (ví dụ: `#music-chat`) hoặc cung cấp ID kênh hợp lệ trong Server.\n\n**Cú pháp:** `!setup channel add #channel`',
            success: false,
          });
          return await message.reply({ embeds: [errEmbed] });
        }

        channelSetupService.addChannel(guild.id, channelId, 'all');
        const embed = EmbedBuilderUtility.createChannelSetupResponseEmbed({
          title: 'Cấp Phép Kênh Thành Công',
          description: `Đã cho phép kênh <#${channelId}> sử dụng các lệnh Bot và Phát nhạc.`,
          success: true,
        });
        return await message.reply({ embeds: [embed] });
      }

      case 'remove':
      case 'del': {
        const channelInput = actionArgs[0];
        const channelId = this.extractChannelId(channelInput);

        if (!channelId) {
          const errEmbed = EmbedBuilderUtility.createChannelSetupResponseEmbed({
            title: 'Kênh Không Hợp Lệ',
            description: 'Vui lòng tag kênh cần xóa (ví dụ: `#music-chat`) hoặc nhập ID kênh.\n\n**Cú pháp:** `!setup channel remove #channel`',
            success: false,
          });
          return await message.reply({ embeds: [errEmbed] });
        }

        const res = channelSetupService.removeChannel(guild.id, channelId, 'all');
        const embed = EmbedBuilderUtility.createChannelSetupResponseEmbed({
          title: 'Xóa Phân Quyền Kênh',
          description: res.removed
            ? `Đã xóa kênh <#${channelId}> khỏi danh sách được phép dùng lệnh Bot & Phát nhạc.`
            : `Kênh <#${channelId}> không nằm trong danh sách được phép trước đó.`,
          success: res.removed,
          isDestructive: true,
        });
        return await message.reply({ embeds: [embed] });
      }

      case 'list':
      case 'show': {
        const channels = channelSetupService.getAllowedChannels(guild.id, 'all');

        let desc = '';
        if (channels.length === 0) {
          desc = '⚠️ **Chưa có kênh nào được cấu hình!**\n> Mặc định bot sẽ từ chối lệnh ở tất cả các kênh cho đến khi bạn cấp phép bằng `!setup channel add #channel`.';
        } else {
          const listStr = channels.map((id) => `• <#${id}> (\`${id}\`)`).join('\n');
          desc = `**🎵 Kênh Được Cấp Phép Lệnh & Phát Nhạc:**\n${listStr}`;
        }

        const embed = EmbedBuilderUtility.createChannelSetupResponseEmbed({
          title: `Danh Sách Kênh Được Cấp Phép • ${guild.name}`,
          description: desc,
          success: true,
        });
        return await message.reply({ embeds: [embed] });
      }

      case 'clear':
      case 'reset': {
        channelSetupService.clearChannels(guild.id, 'all');

        const embed = EmbedBuilderUtility.createChannelSetupResponseEmbed({
          title: 'Dọn Dẹp Phân Quyền Kênh',
          description: 'Đã xóa toàn bộ cấu hình kênh. Tất cả các kênh sẽ bị khóa lệnh cho đến khi thiết lập lại.',
          success: true,
          isDestructive: true,
        });
        return await message.reply({ embeds: [embed] });
      }

      case 'help':
      default: {
        const helpEmbed = EmbedBuilderUtility.createHelpEmbed({ feature: 'setup' });
        return await message.reply({ embeds: [helpEmbed] });
      }
    }
  }
}

module.exports = new ChannelSetupHandler();
