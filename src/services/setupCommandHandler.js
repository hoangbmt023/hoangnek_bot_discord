const { PermissionFlagsBits } = require('discord.js');
const channelSetupService = require('./channelSetupService');
const guildSettingsService = require('./guildSettingsService');
const featureCommandHandler = require('./featureCommandHandler');
const whitelistCommandHandler = require('./whitelistCommandHandler');
const EmbedBuilderUtility = require('../utils/embedBuilder');
const logger = require('../utils/logger');

/**
 * SetupCommandHandler
 * Xử lý lệnh cấu hình tổng hợp đa chức năng (/setup hoặc !setup)
 * Cấu trúc: !setup <chức năng> <hành động/cái gì của chức năng>
 * Hỗ trợ:
 * - !setup channel <add|remove|list|clear> ...
 * - !setup notify <welcome|leave|all> <#channel> / !setup notify reset / !setup notify status
 * - !setup welcome <#channel|reset> / !setup leave <#channel|reset>
 * - !setup feature <enable|disable|status> ...
 * - !setup whitelist <add|remove|list|clear> ...
 * - !setup <add|remove|list|clear> ... (viết tắt cấu hình kênh lệnh)
 */
class SetupCommandHandler {
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
   * Xử lý lệnh dạng Prefix (!setup)
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

    // 1. CẤU HÌNH THÔNG BÁO VÀO/RA (!setup notify / !setup welcome / !setup leave)
    if (firstArg === 'notify' || firstArg === 'notification' || firstArg === 'thongbao') {
      return await this.handleNotifyCommand(message, args.slice(1));
    }
    if (firstArg === 'welcome' || firstArg === 'chao_mung') {
      return await this.handleNotifyShortcut(message, 'welcome', args.slice(1));
    }
    if (firstArg === 'leave' || firstArg === 'tam_biet') {
      return await this.handleNotifyShortcut(message, 'leave', args.slice(1));
    }

    // 2. CẤU HÌNH MODEL AI (!setup ai / !setup model / !setup primary)
    if (firstArg === 'ai' || firstArg === 'model') {
      return await this.handleAICommand(message, args.slice(1));
    }
    if (firstArg === 'primary' || firstArg === 'set-primary') {
      return await this.handleAICommand(message, ['primary', ...args.slice(1)]);
    }

    // 3. CẤU HÌNH DỮ LIỆU SERVER CHO AI (!setup knowledge / !setup doc / !setup data)
    if (firstArg === 'knowledge' || firstArg === 'doc' || firstArg === 'data') {
      return await this.handleKnowledgeCommand(message, args.slice(1));
    }

    const knownFeatures = ['music', 'moderation', 'all'];
    const knownTargets = ['channel', 'kenh', 'whitelist', 'wl', 'feature', 'state', 'toggle'];

    let feature = 'music';
    let target = 'channel';
    let action = 'list';
    let actionArgs = [];

    // Trường hợp 1: !setup <feature> <target> <action> ... (Ví dụ: !setup music channel add #music)
    if (knownFeatures.includes(args[0]?.toLowerCase()) && knownTargets.includes(args[1]?.toLowerCase())) {
      feature = args[0].toLowerCase();
      target = args[1].toLowerCase();
      action = (args[2] || 'list').toLowerCase();
      actionArgs = args.slice(3);
    }
    // Trường hợp 2: !setup <target> <action> ... (Ví dụ: !setup channel add #music, !setup whitelist add @user)
    else if (knownTargets.includes(args[0]?.toLowerCase())) {
      target = args[0].toLowerCase();
      action = (args[1] || 'list').toLowerCase();
      actionArgs = args.slice(2);
      feature = target === 'channel' ? 'music' : 'all';
    }
    // Trường hợp 3: !setup <action> ... (Ví dụ: !setup add #music, !setup list)
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

    // 1. CẤU HÌNH TÍNH NĂNG (!setup feature)
    if (target === 'feature' || target === 'state' || target === 'toggle') {
      const featName = actionArgs[0] || feature;
      const featureContent = `!setup feature ${action} ${featName}`.trim();
      const fakeMsg = Object.assign(Object.create(message), { content: featureContent });
      return await featureCommandHandler.handleCommand(fakeMsg);
    }

    // 2. CẤU HÌNH WHITELIST (!setup whitelist)
    if (target === 'whitelist' || target === 'wl') {
      const wlFeat = feature === 'moderation' ? 'toxic' : feature;
      const wlContent = `!setup whitelist ${action} ${wlFeat} ${actionArgs.join(' ')}`.trim();
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
            description: 'Vui lòng tag kênh (ví dụ: `#music-chat`) hoặc cung cấp ID kênh hợp lệ trong Server.\n\n**Cú pháp:** `!setup channel add #channel`',
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

  /**
   * Xử lý lệnh cấu hình AI Model (!setup ai set/primary/reset/status)
   * @param {import('discord.js').Message} message
   * @param {string[]} aiArgs
   */
  async handleAICommand(message, aiArgs) {
    const { guild } = message;
    const action = (aiArgs[0] || 'status').toLowerCase();

    // 1. Cài đặt Provider chính: !setup ai set-primary <gemini|openrouter> hoặc !setup ai primary <gemini|openrouter>
    if (action === 'set-primary' || action === 'primary') {
      const provider = (aiArgs[1] || '').toLowerCase();

      if (!provider || (provider !== 'gemini' && provider !== 'openrouter')) {
        const errEmbed = EmbedBuilderUtility.createAISetupResponseEmbed({
          title: 'Nhà Cung Cấp Không Hợp Lệ',
          description:
            '❌ Vui lòng chọn nhà cung cấp AI muốn làm chính: `gemini` (Google Gemini) hoặc `openrouter` (OpenRouter).\n\n' +
            '**Cú pháp:** `!setup ai primary <gemini|openrouter>`\n' +
            '**Ví dụ:** `!setup ai primary openrouter` hoặc `!setup primary gemini`',
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      guildSettingsService.setAIPrimaryProvider(guild.id, provider);
      const providerName = provider === 'openrouter' ? 'OpenRouter' : 'Google Gemini';
      const fallbackName = provider === 'openrouter' ? 'Google Gemini' : 'OpenRouter';

      const embed = EmbedBuilderUtility.createAISetupResponseEmbed({
        title: 'Cài Đặt Nhà Cung Cấp AI Chính Thành Công',
        description:
          `Đã chuyển **${providerName}** thành **Nhà cung cấp AI Chính (Primary)** cho Server:\n\n` +
          `• 🌟 **Chính (Ưu tiên gọi trước):** \`${providerName}\`\n` +
          `• 🔄 **Dự phòng (Fallback):** \`${fallbackName}\`\n\n` +
          `> *Mỗi khi gọi \`!ask\` hoặc \`/ask\`, bot sẽ ưu tiên gọi ${providerName} trước, nếu có sự cố sẽ tự động fallback sang ${fallbackName}.*`,
        success: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    // 2. Cài đặt model: !setup ai set <gemini|openrouter> <model_name>
    if (action === 'set' || action === 'set-model') {
      const provider = (aiArgs[1] || '').toLowerCase();
      const model = aiArgs.slice(2).join(' ').trim();

      if (!provider || (provider !== 'gemini' && provider !== 'openrouter')) {
        const errEmbed = EmbedBuilderUtility.createAISetupResponseEmbed({
          title: 'Nhà Cung Cấp Không Hợp Lệ',
          description:
            '❌ Vui lòng chọn nhà cung cấp AI là `gemini` (Google Gemini) hoặc `openrouter` (OpenRouter).\n\n' +
            '**Cú pháp:** `!setup ai set <gemini|openrouter> <tên_model>`\n' +
            '**Ví dụ:** `!setup ai set gemini gemini-3.6-flash`',
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      if (!model) {
        const errEmbed = EmbedBuilderUtility.createAISetupResponseEmbed({
          title: 'Thiếu Tên Model AI',
          description:
            '❌ Vui lòng nhập tên model AI bạn muốn sử dụng.\n\n' +
            '**Ví dụ Gemini:** `gemini-3.6-flash`, `gemini-3.5-flash-lite`\n' +
            '**Ví dụ OpenRouter:** `openrouter/free`, `nex-agi/nex-n2.5-mini:free`, `liquid/lfm-2.5-2.6b:free`',
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      guildSettingsService.setAIModel(guild.id, provider, model);
      const providerName = provider === 'gemini' ? 'Google Gemini' : 'OpenRouter';

      const embed = EmbedBuilderUtility.createAISetupResponseEmbed({
        title: 'Cài Đặt AI Model Thành Công',
        description:
          `Đã cấu hình Model cho **${providerName}** tại Server:\n` +
          `• **Model:** \`${model}\`\n\n` +
          `> *Model này sẽ được ưu tiên sử dụng mỗi khi thành viên gọi lệnh \`!ask\` hoặc \`/ask\`.*`,
        success: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    // 3. Đặt lại model: !setup ai reset [gemini|openrouter|primary|all]
    if (action === 'reset' || action === 'clear' || action === 'reset-model') {
      const provider = (aiArgs[1] || 'all').toLowerCase();
      guildSettingsService.resetAIModel(guild.id, provider);

      let provText = 'toàn bộ cấu hình AI (Gemini, OpenRouter & Provider chính)';
      if (provider === 'gemini') provText = 'Google Gemini';
      else if (provider === 'openrouter') provText = 'OpenRouter';
      else if (provider === 'primary') provText = 'Nhà cung cấp AI chính (Primary Provider)';

      const embed = EmbedBuilderUtility.createAISetupResponseEmbed({
        title: 'Đặt Lại AI Model Về Mặc Định',
        description:
          `Đã khôi phục Model của **${provText}** về cấu hình mặc định của Bot.\n\n` +
          `> *Sử dụng \`!setup ai status\` để kiểm tra Model hiện tại.*`,
        success: true,
        isDestructive: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    // 4. Xem trạng thái: !setup ai status / !setup ai
    const aiSettings = guildSettingsService.getAISettings(guild.id);

    const primaryName = aiSettings.primaryProvider === 'openrouter' ? 'OpenRouter' : 'Google Gemini';
    const primaryStatus = aiSettings.isCustomPrimary
      ? `\`${primaryName}\` *(Tùy chỉnh riêng Server)*`
      : `\`${primaryName}\` *(Mặc định hệ thống)*`;

    const geminiStatus = aiSettings.isCustomGemini
      ? `\`${aiSettings.geminiModel}\` *(Tùy chỉnh riêng Server)*`
      : `\`${aiSettings.geminiModel}\` *(Mặc định hệ thống)*`;

    const openrouterStatus = aiSettings.isCustomOpenrouter
      ? `\`${aiSettings.openrouterModel}\` *(Tùy chỉnh riêng Server)*`
      : `\`${aiSettings.openrouterModel}\` *(Mặc định hệ thống)*`;

    const desc =
      `Thông tin mô hình AI đang phục vụ cho Server **${guild.name}**:\n\n` +
      `• 🌟 **Nhà cung cấp chính (Primary):** ${primaryStatus}\n` +
      `• 🔷 **Google Gemini:** ${geminiStatus}\n` +
      `• 🔶 **OpenRouter:** ${openrouterStatus}\n\n` +
      `**Các câu lệnh tùy chỉnh:**\n` +
      `• Đổi provider chính: \`!setup ai primary <gemini|openrouter>\` *(hoặc \`!setup primary <gemini|openrouter>\`)*\n` +
      `• Đổi model: \`!setup ai set <gemini|openrouter> <tên_model>\`\n` +
      `• Đặt lại mặc định: \`!setup ai reset [gemini|openrouter|primary|all]\``;

    const embed = EmbedBuilderUtility.createAISetupResponseEmbed({
      title: `Cấu Hình AI Model • ${guild.name}`,
      description: desc,
      success: true,
    });
    return await message.reply({ embeds: [embed] });
  }

  /**
   * Trích xuất Channel ID và Message ID từ link tin nhắn hoặc ID
   * @param {string} input
   * @param {string} [fallbackChannelId]
   * @returns {{ channelId: string, messageId: string } | null}
   */
  extractMessageInfo(input, fallbackChannelId) {
    if (!input) return null;
    const linkMatch = input.match(/discord(?:app)?\.com\/channels\/(?:\d+|@me)\/(\d+)\/(\d+)/i);
    if (linkMatch) {
      return { channelId: linkMatch[1], messageId: linkMatch[2] };
    }
    const idMatch = input.match(/^(\d{17,20})$/);
    if (idMatch && fallbackChannelId) {
      return { channelId: fallbackChannelId, messageId: idMatch[1] };
    }
    return null;
  }

  /**
   * Xử lý lệnh cấu hình dữ liệu Server cho AI (!setup knowledge channel/message/text/reset/status)
   * @param {import('discord.js').Message} message
   * @param {string[]} knowledgeArgs
   */
  async handleKnowledgeCommand(message, knowledgeArgs) {
    const { guild } = message;
    const action = (knowledgeArgs[0] || 'status').toLowerCase();

    // 1. Thêm kênh dữ liệu: !setup knowledge channel <#channel> hoặc !setup knowledge add-channel <#channel>
    if (action === 'channel' || action === 'add-channel' || action === 'set-channel') {
      const channelArg = knowledgeArgs[1];
      const channelId = this.extractChannelId(channelArg);

      if (!channelId || !guild.channels.cache.has(channelId)) {
        const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Kênh Không Hợp Lệ',
          description:
            '❌ Vui lòng tag kênh (ví dụ: `#noi-quy`) hoặc cung cấp ID kênh hợp lệ trong Server.\n\n' +
            '**Cú pháp:** `!setup knowledge channel #channel`',
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      const addResult = guildSettingsService.addKnowledgeChannel(guild.id, channelId);

      if (addResult.alreadyExists) {
        const warnEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Kênh Đã Tồn Tại',
          description: `Kênh <#${channelId}> đã có trong danh sách kênh tri thức rồi.`,
          success: false,
        });
        return await message.reply({ embeds: [warnEmbed] });
      }

      const channelListDisplay = addResult.channelIds.map((id) => `<#${id}>`).join('\n• ') || '*Trống*';
      const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
        title: 'Thêm Kênh Tri Thức Thành Công',
        description:
          `Đã thêm kênh <#${channelId}> vào danh sách **Kênh dữ liệu máy chủ** cho AI.\n\n` +
          `**Danh sách kênh tri thức hiện tại (${addResult.channelIds.length} kênh):**\n• ${channelListDisplay}\n\n` +
          `> *AI sẽ đọc tin nhắn ghim từ tất cả các kênh này khi trả lời câu hỏi.*`,
        success: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    // 1b. Xóa kênh dữ liệu: !setup knowledge remove-channel <#channel>
    if (action === 'remove-channel' || action === 'remove') {
      const channelArg = knowledgeArgs[1];
      const channelId = this.extractChannelId(channelArg);

      if (!channelId) {
        const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Thiếu Kênh',
          description:
            '❌ Vui lòng tag kênh hoặc cung cấp ID kênh cần xóa.\n\n' +
            '**Cú pháp:** `!setup knowledge remove-channel #channel`',
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      const removeResult = guildSettingsService.removeKnowledgeChannel(guild.id, channelId);

      if (removeResult.notFound) {
        const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Kênh Không Có Trong Danh Sách',
          description: `Kênh <#${channelId}> không nằm trong danh sách kênh tri thức.`,
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      const remainingDisplay = removeResult.channelIds.length
        ? removeResult.channelIds.map((id) => `<#${id}>`).join('\n• ')
        : '*Không có kênh nào*';
      const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
        title: 'Xóa Kênh Tri Thức Thành Công',
        description:
          `Đã xóa kênh <#${channelId}> khỏi danh sách.\n\n` +
          `**Kênh còn lại (${removeResult.channelIds.length} kênh):**\n• ${remainingDisplay}`,
        success: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    // 2. Thêm tin nhắn dữ liệu cụ thể: !setup knowledge message <link_or_id> [#channel]
    if (action === 'message' || action === 'add-message' || action === 'set-message' || action === 'msg') {
      const msgArg = knowledgeArgs[1];
      const channelArg = knowledgeArgs[2];
      const fallbackChannelId = this.extractChannelId(channelArg) || message.channelId;
      const msgInfo = this.extractMessageInfo(msgArg, fallbackChannelId);

      if (!msgInfo) {
        const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Tin Nhắn Không Hợp Lệ',
          description:
            '❌ Vui lòng cung cấp **Link tin nhắn Discord** hoặc **ID tin nhắn kèm kênh**.\n\n' +
            '**Cách lấy link tin nhắn:** Click chuột phải vào tin nhắn -> chọn *Copy Message Link* (Sao chép liên kết tin nhắn).\n\n' +
            '**Cú pháp:** `!setup knowledge message <link_tin_nhắn>`\n' +
            '**Hoặc:** `!setup knowledge message <message_id> #channel`',
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      let targetChannel = guild.channels.cache.get(msgInfo.channelId);
      if (!targetChannel) {
        targetChannel = await guild.channels.fetch(msgInfo.channelId).catch(() => null);
      }

      if (!targetChannel || !targetChannel.isTextBased()) {
        const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Kênh Không Tồn Tại',
          description: `❌ Không tìm thấy kênh văn bản chứa tin nhắn ID \`${msgInfo.messageId}\`. Vui lòng kiểm tra lại quyền truy cập!`,
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      let fetchedMsg = null;
      try {
        fetchedMsg = await targetChannel.messages.fetch(msgInfo.messageId);
      } catch {
        fetchedMsg = null;
      }

      if (!fetchedMsg) {
        const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Không Tìm Thấy Tin Nhắn',
          description: `❌ Không thể tìm thấy tin nhắn với ID \`${msgInfo.messageId}\` trong kênh <#${msgInfo.channelId}>. Vui lòng kiểm tra lại link hoặc ID!`,
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      const addRes = guildSettingsService.addKnowledgeMessage(guild.id, msgInfo.channelId, msgInfo.messageId);

      if (addRes.alreadyExists) {
        const warnEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Tin Nhắn Đã Tồn Tại',
          description: `Tin nhắn \`${msgInfo.messageId}\` tại kênh <#${msgInfo.channelId}> đã có trong danh sách tri thức của Server rồi.`,
          success: false,
        });
        return await message.reply({ embeds: [warnEmbed] });
      }

      const snippet =
        fetchedMsg.content && fetchedMsg.content.length > 250
          ? fetchedMsg.content.slice(0, 247) + '...'
          : fetchedMsg.content || '*(Tin nhắn chứa embed/tệp tin)*';

      const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
        title: 'Thêm Tin Nhắn Tri Thức Thành Công',
        description:
          `Đã thêm tin nhắn vào **Nguồn tri thức máy chủ** cho AI:\n\n` +
          `• 💬 **Kênh:** <#${msgInfo.channelId}>\n` +
          `• 👤 **Tác giả:** ${fetchedMsg.author?.tag || fetchedMsg.author?.username || 'Admin'}\n` +
          `• 📜 **Nội dung trích đoạn:**\n> *${snippet}*\n\n` +
          `• 📚 **Tổng số tin nhắn tri thức:** \`${addRes.messages.length} tin nhắn\`\n\n` +
          `> *AI sẽ tự động đọc nội dung tin nhắn này khi trả lời câu hỏi.*`,
        success: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    // 2b. Xóa tin nhắn dữ liệu: !setup knowledge remove-message <link_or_id>
    if (action === 'remove-message' || action === 'del-message' || action === 'rm-message') {
      const msgArg = knowledgeArgs[1];
      if (!msgArg) {
        const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Thiếu Tham Số',
          description: '❌ Vui lòng nhập link tin nhắn hoặc ID tin nhắn cần xóa.\n\n**Cú pháp:** `!setup knowledge remove-message <link_hoặc_id>`',
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      const msgInfo = this.extractMessageInfo(msgArg, message.channelId);
      const targetMsgId = msgInfo ? msgInfo.messageId : msgArg.trim();

      const removeRes = guildSettingsService.removeKnowledgeMessage(guild.id, targetMsgId);

      if (removeRes.notFound) {
        const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Không Tìm Thấy Tin Nhắn',
          description: `❌ Tin nhắn \`${targetMsgId}\` không nằm trong danh sách tri thức của Server.`,
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
        title: 'Xóa Tin Nhắn Tri Thức Thành Công',
        description:
          `Đã xóa tin nhắn \`${targetMsgId}\` khỏi danh sách nguồn tri thức.\n\n` +
          `• 📚 **Tin nhắn còn lại:** \`${removeRes.messages.length} tin nhắn\``,
        success: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    // 3. Thêm văn bản dữ liệu: !setup knowledge text <nội dung>
    if (action === 'text' || action === 'add-text' || action === 'set-text') {
      const text = knowledgeArgs.slice(1).join(' ').trim();

      if (!text) {
        const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Thiếu Nội Dung Văn Bản',
          description:
            '❌ Vui lòng nhập nội dung thông tin / quy định server bạn muốn AI nắm bắt.\n\n' +
            '**Cú pháp:** `!setup knowledge text <nội dung>`',
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      const addTextRes = guildSettingsService.addKnowledgeText(guild.id, text);

      const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
        title: 'Thêm Văn Bản Tri Thức Thành Công',
        description:
          `Đã lưu thêm đoạn văn bản tùy chỉnh cho Server:\n\n` +
          `> *${text.length > 300 ? text.substring(0, 300) + '...' : text}*\n\n` +
          `• 📝 **Tổng số đoạn văn bản:** \`${addTextRes.customTexts.length} đoạn\`\n\n` +
          `> *AI Assistant sẽ ưu tiên dùng kiến thức này để giải đáp thắc mắc.*`,
        success: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    // 3b. Xóa văn bản dữ liệu: !setup knowledge remove-text <số thứ tự>
    if (action === 'remove-text' || action === 'del-text' || action === 'rm-text') {
      const indexArg = knowledgeArgs[1];
      if (!indexArg) {
        const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Thiếu Số Thứ Tự',
          description: '❌ Vui lòng nhập số thứ tự của đoạn văn bản cần xóa.\n\n**Cú pháp:** `!setup knowledge remove-text <số_thứ_tự>`\n*(Xem số thứ tự qua `!setup knowledge status`)*',
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      const removeTextRes = guildSettingsService.removeKnowledgeText(guild.id, indexArg);

      if (removeTextRes.notFound) {
        const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Không Tìm Thấy Văn Bản',
          description: `❌ Không tìm thấy đoạn văn bản số \`#${indexArg}\`. Vui lòng dùng \`!setup knowledge status\` để xem danh sách số thứ tự.`,
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
        title: 'Xóa Văn Bản Tri Thức Thành Công',
        description:
          `Đã xóa đoạn văn bản số \`#${indexArg}\` khỏi danh sách tri thức.\n\n` +
          `• 📝 **Số đoạn văn bản còn lại:** \`${removeTextRes.customTexts.length} đoạn\``,
        success: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    // 4. Đặt lại mặc định: !setup knowledge reset / !setup knowledge clear
    if (action === 'reset' || action === 'clear') {
      guildSettingsService.resetKnowledgeConfig(guild.id);

      const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
        title: 'Đặt Lại Dữ Liệu Server Cho AI',
        description:
          'Đã xóa toàn bộ cấu hình kênh kiến thức, tin nhắn chỉ định và văn bản tùy chỉnh. AI sẽ dùng thông tin kênh/vai trò mặc định của Server.',
        success: true,
        isDestructive: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    // 5. Xem trạng thái: !setup knowledge status / !setup knowledge
    const kConfig = guildSettingsService.getKnowledgeConfig(guild.id);
    const channelIds = kConfig.channelIds || [];
    const channelDisplay =
      channelIds.length > 0
        ? channelIds.map((id) => `<#${id}> (\`${id}\`)`).join('\n  • ')
        : '*Chưa thiết lập*';

    const messages = kConfig.messages || [];
    let messageDisplay = '*Chưa thiết lập*';
    if (messages.length > 0) {
      messageDisplay = messages
        .map(
          (m, idx) =>
            `[${idx + 1}] Tin nhắn \`${m.messageId}\` tại <#${m.channelId}> ([Mở link](https://discord.com/channels/${guild.id}/${m.channelId}/${m.messageId}))`
        )
        .join('\n  • ');
    }

    const customTexts = kConfig.customTexts || [];
    let textDisplay = '*Chưa thiết lập*';
    if (customTexts.length > 0) {
      textDisplay = customTexts
        .map((t, idx) => `**[#${idx + 1}]** ${t.length > 150 ? t.substring(0, 147) + '...' : t}`)
        .join('\n\n');
    }

    const desc =
      `Cấu hình nguồn kiến thức máy chủ cho AI Assistant tại **${guild.name}**:\n\n` +
      `• 📜 **Kênh kiến thức (${channelIds.length} kênh):**\n  • ${channelDisplay}\n\n` +
      `• 💬 **Tin nhắn chỉ định (${messages.length} tin nhắn):**\n  • ${messageDisplay}\n\n` +
      `• 📝 **Văn bản tùy chỉnh (${customTexts.length} đoạn):**\n${textDisplay}\n\n` +
      `**Các lệnh cấu hình:**\n` +
      `• Thêm kênh: \`!setup knowledge channel #channel\`\n` +
      `• Xóa kênh: \`!setup knowledge remove-channel #channel\`\n` +
      `• Thêm tin nhắn: \`!setup knowledge add-message <link_hoặc_id> [#kênh]\`\n` +
      `• Xóa tin nhắn: \`!setup knowledge remove-message <link_hoặc_id>\`\n` +
      `• Thêm văn bản: \`!setup knowledge text <nội dung>\`\n` +
      `• Xóa văn bản: \`!setup knowledge remove-text <số_thứ_tự>\`\n` +
      `• Đặt lại mặc định: \`!setup knowledge reset\``;

    const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
      title: `Dữ Liệu Server Cho AI • ${guild.name}`,
      description: desc,
      success: true,
    });
    return await message.reply({ embeds: [embed] });
  }
}

module.exports = new SetupCommandHandler();
