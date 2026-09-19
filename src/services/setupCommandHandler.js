const { PermissionFlagsBits } = require('discord.js');
const channelSetupService = require('./channelSetupService');
const guildSettingsService = require('./guildSettingsService');
const featureCommandHandler = require('./featureCommandHandler');
const whitelistCommandHandler = require('./whitelistCommandHandler');
const EmbedBuilderUtility = require('../utils/embedBuilder');
const logger = require('../utils/logger');

/**
 * SetupCommandHandler
 * Xử lý lệnh cấu hình tổng hợp đa chức năng (/setup hoặc s!setup)
 * Cấu trúc: s!setup <chức năng> <hành động/cái gì của chức năng>
 * Hỗ trợ:
 * - s!setup channel <add|remove|list|clear> ...
 * - s!setup notify <welcome|leave|all> <#channel> / s!setup notify reset / s!setup notify status
 * - s!setup welcome <#channel|reset> / s!setup leave <#channel|reset>
 * - s!setup feature <enable|disable|status> ...
 * - s!setup whitelist <add|remove|list|clear> ...
 * - s!setup <add|remove|list|clear> ... (viết tắt cấu hình kênh lệnh)
 */
class SetupCommandHandler {
  /**
   * Kiểm tra tin nhắn có phải lệnh prefix s!setup không
   * @param {string} content
   * @returns {boolean}
   */
  isSetupCommand(content) {
    if (!content || typeof content !== 'string') return false;
    const trimmed = content.trim().toLowerCase();
    return trimmed.startsWith('s!setup') || trimmed.startsWith('s!channel');
  }

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
   * Xử lý lệnh dạng Prefix (s!setup)
   * @param {import('discord.js').Message} message
   */
  async handlePrefixCommand(message) {
    const { guild, member, content } = message;

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

    // 1. CẤU HÌNH THÔNG BÁO VÀO/RA (s!setup notify / s!setup welcome / s!setup leave)
    if (firstArg === 'notify' || firstArg === 'notification' || firstArg === 'thongbao') {
      return await this.handleNotifyCommand(message, args.slice(1));
    }
    if (firstArg === 'welcome' || firstArg === 'chao_mung') {
      return await this.handleNotifyShortcut(message, 'welcome', args.slice(1));
    }
    if (firstArg === 'leave' || firstArg === 'tam_biet') {
      return await this.handleNotifyShortcut(message, 'leave', args.slice(1));
    }

    const knownFeatures = ['music', 'moderation', 'all'];
    const knownTargets = ['channel', 'kenh', 'whitelist', 'wl', 'feature', 'state', 'toggle'];

    let feature = 'music';
    let target = 'channel';
    let action = 'list';
    let actionArgs = [];

    // Trường hợp 1: s!setup <feature> <target> <action> ... (Ví dụ: s!setup music channel add #music)
    if (knownFeatures.includes(args[0]?.toLowerCase()) && knownTargets.includes(args[1]?.toLowerCase())) {
      feature = args[0].toLowerCase();
      target = args[1].toLowerCase();
      action = (args[2] || 'list').toLowerCase();
      actionArgs = args.slice(3);
    }
    // Trường hợp 2: s!setup <target> <action> ... (Ví dụ: s!setup channel add #music, s!setup whitelist add @user)
    else if (knownTargets.includes(args[0]?.toLowerCase())) {
      target = args[0].toLowerCase();
      action = (args[1] || 'list').toLowerCase();
      actionArgs = args.slice(2);
      feature = target === 'channel' ? 'music' : 'all';
    }
    // Trường hợp 3: s!setup <action> ... (Ví dụ: s!setup add #music, s!setup list)
    else {
      target = 'channel';
      action = (args[0] || 'list').toLowerCase();
      actionArgs = args.slice(1);
      feature = 'music';
    }

    // 0. KIỂM TRA TÍNH HỢP LỆ THEO TỪNG CHỨC NĂNG (CROSS-VALIDATION)
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

    // 1. CẤU HÌNH TÍNH NĂNG (feature / state / toggle)
    if (target === 'feature' || target === 'state' || target === 'toggle') {
      const featName = actionArgs[0] || feature;
      const featureContent = `!feature ${action} ${featName}`.trim();
      const fakeMsg = Object.assign(Object.create(message), { content: featureContent });
      return await featureCommandHandler.handleCommand(fakeMsg);
    }

    // 2. CẤU HÌNH WHITELIST (whitelist / wl)
    if (target === 'whitelist' || target === 'wl') {
      const wlFeat = feature === 'moderation' ? 'toxic' : feature;
      const wlContent = `!wl ${action} ${wlFeat} ${actionArgs.join(' ')}`.trim();
      const fakeMsg = Object.assign(Object.create(message), { content: wlContent });
      return await whitelistCommandHandler.handleCommand(fakeMsg);
    }

    // 3. CẤU HÌNH KÊNH (channel / kenh)
    switch (action) {
      case 'add': {
        const channelInput = actionArgs[0];
        const channelId = this.extractChannelId(channelInput);

        if (!channelId || !guild.channels.cache.has(channelId)) {
          const errEmbed = EmbedBuilderUtility.createChannelSetupResponseEmbed({
            title: 'Kênh Không Hợp Lệ',
            description: 'Vui lòng tag kênh (ví dụ: `#music-chat`) hoặc cung cấp ID kênh hợp lệ trong Server.\n\n**Cú pháp:** `s!setup channel add #channel`',
            success: false,
          });
          return await message.reply({ embeds: [errEmbed] });
        }

        const res = channelSetupService.addChannel(guild.id, channelId, 'all');
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
            description: 'Vui lòng tag kênh cần xóa (ví dụ: `#music-chat`) hoặc nhập ID kênh.\n\n**Cú pháp:** `s!setup channel remove #channel`',
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
          desc = '⚠️ **Chưa có kênh nào được cấu hình!**\n> Mặc định bot sẽ từ chối lệnh ở tất cả các kênh cho đến khi bạn cấp phép bằng `s!setup channel add #channel`.';
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

  /**
   * Xử lý lệnh cấu hình kênh thông báo dạng đầy đủ: s!setup notify <action|type> ...
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

    // Set: s!setup notify set <type> <#channel> hoặc s!setup notify <type> <#channel>
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
          '**Cú pháp:** `s!setup notify <welcome|leave|all> #channel`\n' +
          '**Đặt lại mặc định:** `s!setup notify reset`',
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
   * Xử lý lệnh viết tắt: s!setup welcome <#channel|reset> hoặc s!setup leave <#channel|reset>
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
          `**Cú pháp:** \`s!setup ${type} #channel\`\n` +
          `**Đặt lại mặc định:** \`s!setup ${type} reset\``,
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
      `*Sử dụng \`s!setup notify <welcome|leave|all> #channel\` để cấu hình hoặc \`s!setup notify reset\` để khôi phục mặc định.*`;

    const embed = EmbedBuilderUtility.createNotificationSetupResponseEmbed({
      title: `Cấu Hình Kênh Thông Báo • ${guild.name}`,
      description: desc,
      success: true,
    });
    return await message.reply({ embeds: [embed] });
  }
}

module.exports = new SetupCommandHandler();
