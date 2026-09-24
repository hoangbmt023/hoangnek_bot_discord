const EmbedBuilderUtility = require('../../../utils/embedBuilder');
const guildSettingsService = require('../guildSettingsService');

/**
 * NotifySetupHandler
 * Xử lý lệnh cấu hình kênh thông báo Chào mừng & Tạm biệt (!setup notify, !setup welcome, !setup leave)
 */
class NotifySetupHandler {
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
   * Xử lý lệnh cấu hình kênh thông báo dạng đầy đủ: !setup notify <action|type> ...
   * @param {import('discord.js').Message} message
   * @param {string[]} notifyArgs
   */
  async handleNotifyCommand(message, notifyArgs) {
    const { guild } = message;
    if (notifyArgs.length === 0 || notifyArgs[0].toLowerCase() === 'status' || notifyArgs[0].toLowerCase() === 'list') {
      return await this.sendNotifyStatus(message);
    }

    const first = notifyArgs[0].toLowerCase();

    // Reset
    if (first === 'reset' || first === 'clear') {
      const type = (notifyArgs[1] || 'all').toLowerCase();
      guildSettingsService.resetNotificationChannel(guild.id, type);

      let desc = '';
      if (type === 'all') {
        desc = 'Đã đặt lại toàn bộ kênh thông báo về **Kênh hệ thống mặc định (System Channel)** của Server.';
      } else if (type === 'leave' || type === 'tam_biet') {
        desc = 'Đã đặt lại kênh Tạm biệt về **Kênh hệ thống mặc định (System Channel)** của Server.';
      } else {
        desc = 'Đã đặt lại kênh Chào mừng về **Kênh hệ thống mặc định (System Channel)** của Server.';
      }

      const embed = EmbedBuilderUtility.createNotificationSetupResponseEmbed({
        title: 'Đặt Lại Kênh Thông Báo',
        description: desc,
        success: true,
        isDestructive: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    // Set: !setup notify set <type> <#channel> hoặc !setup notify <type> <#channel>
    let type = 'welcome';
    let channelArg = '';

    if (first === 'set') {
      type = notifyArgs[1] || 'welcome';
      channelArg = notifyArgs[2];
    } else {
      type = first;
      channelArg = notifyArgs[1];
    }

    const channelId = this.extractChannelId(channelArg);
    if (!channelId || !guild.channels.cache.has(channelId)) {
      const errEmbed = EmbedBuilderUtility.createNotificationSetupResponseEmbed({
        title: 'Kênh Không Hợp Lệ',
        description:
          '❌ Vui lòng tag kênh (ví dụ: `#chao-mung`) hoặc cung cấp ID kênh hợp lệ trong Server.\n\n' +
          '**Cú pháp:** `!setup notify <welcome|leave|all> #channel`\n' +
          '**Đặt lại mặc định:** `!setup notify reset`',
        success: false,
      });
      return await message.reply({ embeds: [errEmbed] });
    }

    const normType = guildSettingsService.normalizeNotificationType(type);
    guildSettingsService.setNotificationChannel(guild.id, normType, channelId);

    let desc = '';
    if (normType === 'all') {
      desc = `Đã cài đặt kênh <#${channelId}> làm kênh nhận thông báo **Chào mừng** và **Tạm biệt** thành viên.`;
    } else if (normType === 'leave') {
      desc = `Đã cài đặt kênh <#${channelId}> làm kênh nhận thông báo **Tạm biệt** thành viên rời đi.`;
    } else {
      desc = `Đã cài đặt kênh <#${channelId}> làm kênh nhận thông báo **Chào mừng** thành viên mới.`;
    }

    const embed = EmbedBuilderUtility.createNotificationSetupResponseEmbed({
      title: 'Cài Đặt Kênh Thông Báo Thành Công',
      description: `${desc}\n\n> *Nếu không cấu hình hoặc sau khi reset, bot sẽ mặc định gửi vào Kênh hệ thống.*`,
      success: true,
    });
    return await message.reply({ embeds: [embed] });
  }

  /**
   * Xử lý lệnh viết tắt: !setup welcome <#channel|reset> hoặc !setup leave <#channel|reset>
   * @param {import('discord.js').Message} message
   * @param {'welcome' | 'leave'} type
   * @param {string[]} shortcutArgs
   */
  async handleNotifyShortcut(message, type, shortcutArgs) {
    if (shortcutArgs.length === 0 || shortcutArgs[0].toLowerCase() === 'status' || shortcutArgs[0].toLowerCase() === 'list') {
      return await this.sendNotifyStatus(message);
    }

    const arg = shortcutArgs[0].toLowerCase();
    if (arg === 'reset' || arg === 'clear') {
      guildSettingsService.resetNotificationChannel(message.guild.id, type);
      const name = type === 'welcome' ? 'Chào mừng' : 'Tạm biệt';
      const embed = EmbedBuilderUtility.createNotificationSetupResponseEmbed({
        title: 'Đặt Lại Kênh Thông Báo',
        description: `Đã đặt lại kênh **${name}** về **Kênh hệ thống mặc định (System Channel)** của Server.`,
        success: true,
        isDestructive: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    const channelId = this.extractChannelId(arg);
    if (!channelId || !message.guild.channels.cache.has(channelId)) {
      const name = type === 'welcome' ? 'Chào mừng' : 'Tạm biệt';
      const errEmbed = EmbedBuilderUtility.createNotificationSetupResponseEmbed({
        title: 'Kênh Không Hợp Lệ',
        description:
          `❌ Vui lòng tag kênh (ví dụ: \`#${type}\`) hoặc cung cấp ID kênh hợp lệ trong Server.\n\n` +
          `**Cú pháp:** \`!setup ${type} #channel\`\n` +
          `**Đặt lại mặc định:** \`!setup ${type} reset\``,
        success: false,
      });
      return await message.reply({ embeds: [errEmbed] });
    }

    guildSettingsService.setNotificationChannel(message.guild.id, type, channelId);
    const desc =
      type === 'welcome'
        ? `Đã cài đặt kênh <#${channelId}> làm kênh nhận thông báo **Chào mừng** thành viên mới.`
        : `Đã cài đặt kênh <#${channelId}> làm kênh nhận thông báo **Tạm biệt** thành viên rời đi.`;

    const embed = EmbedBuilderUtility.createNotificationSetupResponseEmbed({
      title: 'Cài Đặt Kênh Thông Báo Thành Công',
      description: `${desc}\n\n> *Nếu không cấu hình hoặc sau khi reset, bot sẽ mặc định gửi vào Kênh hệ thống.*`,
      success: true,
    });
    return await message.reply({ embeds: [embed] });
  }

  /**
   * Hiển thị trạng thái kênh thông báo hiện tại
   * @param {import('discord.js').Message} message
   */
  async sendNotifyStatus(message) {
    const { guild } = message;
    const settings = guildSettingsService.getNotificationSettings(guild.id);
    const systemCh = guild.systemChannel ? `<#${guild.systemChannel.id}>` : '*Không có*';
    const welcomeCh = settings.welcomeChannelId
      ? `<#${settings.welcomeChannelId}> (\`${settings.welcomeChannelId}\`)`
      : `Mặc định (Kênh hệ thống: ${systemCh})`;
    const leaveCh = settings.leaveChannelId
      ? `<#${settings.leaveChannelId}> (\`${settings.leaveChannelId}\`)`
      : `Mặc định (Kênh hệ thống: ${systemCh})`;

    const desc =
      `• **Kênh Chào mừng (Welcome):** ${welcomeCh}\n` +
      `• **Kênh Tạm biệt (Leave):** ${leaveCh}\n` +
      `• **Kênh hệ thống Server:** ${systemCh}\n\n` +
      `*Sử dụng \`!setup notify <welcome|leave|all> #channel\` để cấu hình hoặc \`!setup notify reset\` để khôi phục mặc định.*`;

    const embed = EmbedBuilderUtility.createNotificationSetupResponseEmbed({
      title: `Cấu Hình Kênh Thông Báo • ${guild.name}`,
      description: desc,
      success: true,
    });
    return await message.reply({ embeds: [embed] });
  }
}

module.exports = new NotifySetupHandler();
