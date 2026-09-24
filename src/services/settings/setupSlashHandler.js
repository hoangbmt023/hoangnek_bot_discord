const { PermissionFlagsBits } = require('discord.js');
const EmbedBuilderUtility = require('../../utils/embedBuilder');
const guildSettingsService = require('./guildSettingsService');
const channelSetupService = require('./channelSetupService');
const whitelistService = require('../moderation/whitelistService');
const setupCommandHandler = require('./setupCommandHandler');
const knowledgeSetupHandler = require('./handlers/knowledgeSetupHandler');

/**
 * SetupSlashHandler
 * Xử lý các tương tác Slash Command (/setup) và Gợi ý tự động (Autocomplete)
 */
class SetupSlashHandler {
  /**
   * Xử lý Autocomplete cho /setup
   * @param {import('discord.js').AutocompleteInteraction} interaction
   */
  async handleAutocomplete(interaction) {
    if (interaction.commandName !== 'setup') return;

    const focusedOption = interaction.options.getFocused(true);
    const feature = interaction.options.getString('feature');
    const target = interaction.options.getString('target');

    let choices = [];

    if (focusedOption.name === 'model') {
      const rawProvider = interaction.options.getString('provider') || '';
      const provider = rawProvider.trim().toLowerCase();

      if (provider === 'gemini') {
        choices = [
          { name: 'gemini-3.6-flash [Google Gemini Flash - Mặc định & Tối ưu]', value: 'gemini-3.6-flash' },
          { name: 'gemini-3.5-flash-lite [Google Gemini Lite - Tốc độ cao]', value: 'gemini-3.5-flash-lite' },
        ];
      } else if (provider === 'openrouter') {
        choices = [
          { name: 'openrouter/free [OpenRouter Auto Router Free - Mặc định]', value: 'openrouter/free' },
          { name: 'nex-agi/nex-n2.5-mini:free [Nex-AGI Mini 2.5 Free - Siêu nhanh ~0.5s]', value: 'nex-agi/nex-n2.5-mini:free' },
          { name: 'nex-agi/nex-n2.5-pro:free [Nex-AGI Pro 2.5 Free - Chất lượng cao]', value: 'nex-agi/nex-n2.5-pro:free' },
          { name: 'liquid/lfm-2.5-2.6b:free [Liquid LFM 2.5 Free - Nhanh ~1.3s]', value: 'liquid/lfm-2.5-2.6b:free' },
          { name: 'inclusionai/ling-3.0-flash-vl:free [InclusionAI Flash 3.0 Free]', value: 'inclusionai/ling-3.0-flash-vl:free' },
          { name: 'dots-studio/dots-3-note-preview:free [Dots Studio Preview Free]', value: 'dots-studio/dots-3-note-preview:free' },
        ];
      } else {
        choices = [
          { name: 'gemini-3.6-flash [Gemini - Mặc định]', value: 'gemini-3.6-flash' },
          { name: 'gemini-3.5-flash-lite [Gemini - Siêu nhanh]', value: 'gemini-3.5-flash-lite' },
          { name: 'openrouter/free [OpenRouter - Mặc định Auto]', value: 'openrouter/free' },
          { name: 'nex-agi/nex-n2.5-mini:free [OpenRouter - Siêu nhanh ~0.5s]', value: 'nex-agi/nex-n2.5-mini:free' },
          { name: 'liquid/lfm-2.5-2.6b:free [OpenRouter - Nhanh ~1.3s]', value: 'liquid/lfm-2.5-2.6b:free' },
        ];
      }

      const query = (focusedOption.value || '').trim().toLowerCase();
      let filtered = choices.filter(
        (c) => c.name.toLowerCase().includes(query) || c.value.toLowerCase().includes(query)
      );

      if (query && !filtered.some((c) => c.value.toLowerCase() === query)) {
        filtered.unshift({
          name: `Sử dụng model: "${focusedOption.value.trim()}"`,
          value: focusedOption.value.trim(),
        });
      }

      return await interaction.respond(filtered.slice(0, 25)).catch(() => {});
    }

    if (focusedOption.name === 'feature') {
      if (target === 'channel') {
        choices = [
          { name: 'Âm nhạc (music)', value: 'music' },
          { name: 'Tất cả các tính năng (all)', value: 'all' },
        ];
      } else if (target === 'whitelist') {
        choices = [
          { name: 'Lọc ngôn từ độc hại (moderation)', value: 'moderation' },
          { name: 'Tất cả các tính năng (all)', value: 'all' },
        ];
      } else if (target === 'feature') {
        choices = [
          { name: 'Lọc ngôn từ độc hại (moderation)', value: 'moderation' },
          { name: 'Thông báo Chào mừng (welcome)', value: 'welcome' },
          { name: 'Thông báo Tạm biệt (leave)', value: 'leave' },
          { name: 'Tất cả các tính năng (all)', value: 'all' },
        ];
      } else {
        choices = [
          { name: 'Âm nhạc (music)', value: 'music' },
          { name: 'Lọc ngôn từ độc hại (moderation)', value: 'moderation' },
          { name: 'Thông báo Chào mừng (welcome)', value: 'welcome' },
          { name: 'Thông báo Tạm biệt (leave)', value: 'leave' },
          { name: 'Tất cả các tính năng (all)', value: 'all' },
        ];
      }
    } else if (focusedOption.name === 'target') {
      if (feature === 'music') {
        choices = [{ name: 'Kênh cho phép (channel)', value: 'channel' }];
      } else if (feature === 'moderation') {
        choices = [
          { name: 'Danh sách trắng (whitelist)', value: 'whitelist' },
          { name: 'Bật / Tắt tính năng (feature)', value: 'feature' },
        ];
      } else if (feature === 'welcome' || feature === 'leave') {
        choices = [{ name: 'Bật / Tắt tính năng (feature)', value: 'feature' }];
      } else {
        choices = [
          { name: 'Kênh cho phép (channel)', value: 'channel' },
          { name: 'Danh sách trắng (whitelist)', value: 'whitelist' },
          { name: 'Bật / Tắt tính năng (feature)', value: 'feature' },
        ];
      }
    } else if (focusedOption.name === 'action') {
      if (target === 'channel') {
        choices = [
          { name: 'Thêm mới (add)', value: 'add' },
          { name: 'Xóa bớt (remove)', value: 'remove' },
          { name: 'Xem danh sách (list)', value: 'list' },
          { name: 'Dọn dẹp / Xóa hết (clear)', value: 'clear' },
        ];
      } else if (target === 'whitelist') {
        choices = [
          { name: 'Thêm mới (add)', value: 'add' },
          { name: 'Xóa bớt (remove)', value: 'remove' },
          { name: 'Xem danh sách (list)', value: 'list' },
          { name: 'Dọn dẹp / Xóa hết (clear)', value: 'clear' },
        ];
      } else if (target === 'feature') {
        choices = [
          { name: 'Bật tính năng (enable)', value: 'enable' },
          { name: 'Tắt tính năng (disable)', value: 'disable' },
          { name: 'Xem trạng thái (status)', value: 'status' },
        ];
      } else {
        choices = [
          { name: 'Thêm mới (add)', value: 'add' },
          { name: 'Xóa bớt (remove)', value: 'remove' },
          { name: 'Xem danh sách (list)', value: 'list' },
          { name: 'Dọn dẹp / Xóa hết (clear)', value: 'clear' },
          { name: 'Bật tính năng (enable)', value: 'enable' },
          { name: 'Tắt tính năng (disable)', value: 'disable' },
          { name: 'Xem trạng thái (status)', value: 'status' },
        ];
      }
    }

    const query = (focusedOption.value || '').toLowerCase();
    const filtered = choices.filter(
      (c) => c.name.toLowerCase().includes(query) || c.value.toLowerCase().includes(query)
    );

    await interaction.respond(filtered.slice(0, 25)).catch(() => {});
  }

  /**
   * Xử lý Slash Command /setup
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async handleSlashCommand(interaction) {
    const { guildId, member } = interaction;

    const hasPermission =
      member.permissions.has(PermissionFlagsBits.Administrator) ||
      member.permissions.has(PermissionFlagsBits.ManageGuild) ||
      member.permissions.has(PermissionFlagsBits.ManageChannels);

    if (!hasPermission) {
      const errorEmbed = EmbedBuilderUtility.createChannelSetupResponseEmbed({
        title: 'Quyền Hạn Không Đủ',
        description: 'Bạn cần có quyền **Quản trị viên (Administrator)** hoặc **Quản lý máy chủ (Manage Server)** để cấu hình Bot.',
        success: false,
      });
      return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    const subGroup = interaction.options.getSubcommandGroup(false);
    const subCommand = interaction.options.getSubcommand(false);

    // 1. CẤU HÌNH KÊNH
    if (subGroup === 'channel') {
      const action = subCommand;
      const targetChannel = interaction.options.getChannel('channel');

      switch (action) {
        case 'add': {
          if (!targetChannel) {
            const errEmbed = EmbedBuilderUtility.createChannelSetupResponseEmbed({
              title: 'Thiếu Kênh Chỉ Định',
              description: 'Vui lòng chọn kênh trong ô **channel** khi thực hiện thêm kênh!',
              success: false,
            });
            return await interaction.reply({ embeds: [errEmbed], ephemeral: true });
          }

          const res = channelSetupService.addChannel(guildId, targetChannel.id, 'all');
          const embed = EmbedBuilderUtility.createChannelSetupResponseEmbed({
            title: 'Cấp Phép Kênh Thành Công',
            description: `Đã cho phép kênh <#${targetChannel.id}> sử dụng các lệnh Bot và Phát nhạc.`,
            success: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }

        case 'remove': {
          if (!targetChannel) {
            const errEmbed = EmbedBuilderUtility.createChannelSetupResponseEmbed({
              title: 'Thiếu Kênh Chỉ Định',
              description: 'Vui lòng chọn kênh trong ô **channel** khi thực hiện xóa quyền kênh!',
              success: false,
            });
            return await interaction.reply({ embeds: [errEmbed], ephemeral: true });
          }

          const res = channelSetupService.removeChannel(guildId, targetChannel.id, 'all');
          const embed = EmbedBuilderUtility.createChannelSetupResponseEmbed({
            title: 'Xóa Phân Quyền Kênh',
            description: res.removed
              ? `Đã xóa kênh <#${targetChannel.id}> khỏi danh sách được phép dùng lệnh Bot & Phát nhạc.`
              : `Kênh <#${targetChannel.id}> không nằm trong danh sách được phép trước đó.`,
            success: res.removed,
            isDestructive: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }

        case 'list': {
          const channels = channelSetupService.getAllowedChannels(guildId, 'all');

          let desc = '';
          if (channels.length === 0) {
            desc = '⚠️ **Chưa có kênh nào được cấu hình!**\n> Mặc định bot sẽ từ chối lệnh ở tất cả các kênh cho đến khi bạn cấp phép bằng `/setup channel add`.';
          } else {
            const listStr = channels.map((id) => `• <#${id}> (\`${id}\`)`).join('\n');
            desc = `**🎵 Kênh Được Cấp Phép Lệnh & Phát Nhạc:**\n${listStr}`;
          }

          const embed = EmbedBuilderUtility.createChannelSetupResponseEmbed({
            title: `Danh Sách Kênh Được Cấp Phép • ${interaction.guild.name}`,
            description: desc,
            success: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }

        case 'clear': {
          channelSetupService.clearChannels(guildId, 'all');
          const embed = EmbedBuilderUtility.createChannelSetupResponseEmbed({
            title: 'Dọn Dẹp Phân Quyền Kênh',
            description: 'Đã xóa toàn bộ cấu hình kênh. Tất cả các kênh sẽ bị khóa lệnh cho đến khi thiết lập lại.',
            success: true,
            isDestructive: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }
      }
    }

    // 2. CẤU HÌNH WHITELIST
    if (subGroup === 'whitelist') {
      const action = subCommand;
      const rawTarget = interaction.options.getString('target') || 'users';
      const valueInput = interaction.options.getString('value') || interaction.options.getString('users');

      const formatMention = (id, targetType) => {
        if (targetType === 'roles') return `<@&${id}> (\`${id}\`)`;
        if (targetType === 'channels') return `<#${id}> (\`${id}\`)`;
        return `<@${id}> (\`${id}\`)`;
      };

      switch (action) {
        case 'add': {
          if (!valueInput) {
            const errEmbed = EmbedBuilderUtility.createWhitelistResponseEmbed({
              title: 'Thiếu Dữ Liệu Cần Thêm',
              description: 'Vui lòng nhập tag (`@user`, `@role`, `#channel`) hoặc ID trong ô **value**!',
              success: false,
            });
            return await interaction.reply({ embeds: [errEmbed], ephemeral: true });
          }

          const result = whitelistService.addTargets(guildId, rawTarget, valueInput, 'toxic');
          let desc = `• **Đối tượng:** \`${result.targetName}\`\n• **Chức năng áp dụng:** \`Lọc ngôn từ độc hại & Hate Speech\`\n\n`;
          if (result.added.length > 0) {
            const addedList = result.added.map((id) => `• ${formatMention(id, result.targetType)}`).join('\n');
            desc += `**Đã thêm vào Whitelist (${result.added.length}):**\n${addedList}\n\n`;
          }
          if (result.alreadyExists.length > 0) {
            const existList = result.alreadyExists.map((id) => `• ${formatMention(id, result.targetType)}`).join('\n');
            desc += `**Đã có sẵn trong Whitelist (${result.alreadyExists.length}):**\n${existList}\n\n`;
          }
          desc += `*Các đối tượng trên sẽ được miễn trừ kiểm duyệt ngôn từ.*`;

          const embed = EmbedBuilderUtility.createWhitelistResponseEmbed({
            title: 'Cập Nhật Danh Sách Whitelist',
            description: desc,
            success: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }

        case 'remove': {
          if (!valueInput) {
            const errEmbed = EmbedBuilderUtility.createWhitelistResponseEmbed({
              title: 'Thiếu Dữ Liệu Cần Xóa',
              description: 'Vui lòng nhập tag hoặc ID trong ô **value** cần xóa khỏi Whitelist!',
              success: false,
            });
            return await interaction.reply({ embeds: [errEmbed], ephemeral: true });
          }

          const result = whitelistService.removeTargets(guildId, rawTarget, valueInput, 'toxic');
          let desc = `• **Đối tượng:** \`${result.targetName}\`\n• **Chức năng áp dụng:** \`Lọc ngôn từ độc hại & Hate Speech\`\n\n`;
          if (result.removed.length > 0) {
            const removedList = result.removed.map((id) => `• ${formatMention(id, result.targetType)}`).join('\n');
            desc += `**Đã xóa khỏi Whitelist (${result.removed.length}):**\n${removedList}\n\n`;
          }
          if (result.notFound.length > 0) {
            const notFoundList = result.notFound.map((id) => `• ${formatMention(id, result.targetType)}`).join('\n');
            desc += `**Không có trong danh sách (${result.notFound.length}):**\n${notFoundList}\n\n`;
          }
          desc += `*Các đối tượng bị xóa sẽ tiếp tục được kiểm duyệt ngôn từ bình thường.*`;

          const embed = EmbedBuilderUtility.createWhitelistResponseEmbed({
            title: 'Xóa Khỏi Danh Sách Whitelist',
            description: desc,
            success: result.removed.length > 0,
            isDestructive: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }

        case 'list': {
          const targetFilter = rawTarget || 'all';
          const listData = whitelistService.getList(guildId, targetFilter, 'toxic');
          let desc = `• **Chức năng áp dụng:** \`Lọc ngôn từ độc hại & Hate Speech\`\n\n`;

          if (Array.isArray(listData)) {
            const targetDisplayName = whitelistService.getTargetDisplayName(targetFilter);
            if (listData.length === 0) {
              desc += `Chưa có **${targetDisplayName}** nào trong Whitelist.`;
            } else {
              const listStr = listData.map((id, idx) => `  ${idx + 1}. ${formatMention(id, targetFilter)}`).join('\n');
              desc += `**${targetDisplayName} (${listData.length}):**\n${listStr}`;
            }
          } else {
            const { users, roles, channels } = listData;
            const totalCount = (users?.length || 0) + (roles?.length || 0) + (channels?.length || 0);

            if (totalCount === 0) {
              desc += `Danh sách Whitelist hiện đang trống.`;
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

          const embed = EmbedBuilderUtility.createWhitelistResponseEmbed({
            title: 'Danh Sách Whitelist Kiểm Duyệt',
            description: desc,
            success: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }

        case 'clear': {
          whitelistService.clearList(guildId, rawTarget, 'toxic');
          const targetName = rawTarget === 'all' ? 'tất cả đối tượng (User, Role, Kênh)' : whitelistService.getTargetDisplayName(rawTarget);
          const embed = EmbedBuilderUtility.createWhitelistResponseEmbed({
            title: 'Dọn Dẹp Danh Sách Whitelist',
            description: `Đã xóa toàn bộ **${targetName}** trong danh sách Whitelist tại Server này.`,
            success: true,
            isDestructive: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }
      }
    }

    // 3. CẤU HÌNH TÍNH NĂNG
    if (subGroup === 'feature') {
      const action = subCommand;
      const feature = (interaction.options.getString('feature') || 'all').toLowerCase();

      switch (action) {
        case 'enable': {
          const result = guildSettingsService.setFeatureState(guildId, feature, true);
          const embed = EmbedBuilderUtility.createFeatureToggleResponseEmbed({
            title: 'Bật Tính Năng Thành Công',
            description:
              `• **Tính năng:** \`${result.featureName}\`\n` +
              `• **Trạng thái:** \`BẬT\`\n\n` +
              `*Tính năng đã được kích hoạt ngay lập tức cho Server.*`,
            enabled: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }

        case 'disable': {
          const result = guildSettingsService.setFeatureState(guildId, feature, false);
          const embed = EmbedBuilderUtility.createFeatureToggleResponseEmbed({
            title: 'Tắt Tính Năng Thành Công',
            description:
              `• **Tính năng:** \`${result.featureName}\`\n` +
              `• **Trạng thái:** \`TẮT\`\n\n` +
              `*Tính năng đã tạm dừng hoạt động trên toàn Server.*`,
            enabled: false,
          });
          return await interaction.reply({ embeds: [embed] });
        }

        case 'status':
        case 'list': {
          if (feature && feature !== 'all') {
            const isEnabled = guildSettingsService.isFeatureEnabled(guildId, feature);
            const meta = guildSettingsService.getFeatureMeta(feature);
            const badge = isEnabled ? '`BẬT`' : '`TẮT`';
            const desc = `• **${meta.name}:** ${badge}\n  *${meta.description}*`;

            const embed = EmbedBuilderUtility.createFeatureToggleResponseEmbed({
              title: `Trạng Thái Tính Năng • ${meta.name}`,
              description: `${desc}\n\n*Sử dụng \`/setup feature\` để thay đổi cấu hình.*`,
              isStatusList: true,
            });
            return await interaction.reply({ embeds: [embed] });
          }

          const states = guildSettingsService.getAllFeatureStates(guildId);
          const desc = states
            .map((item) => {
              const badge = item.enabled ? '`BẬT`' : '`TẮT`';
              return `• **${item.name}:** ${badge}\n  *${item.description}*`;
            })
            .join('\n\n');

          const embed = EmbedBuilderUtility.createFeatureToggleResponseEmbed({
            title: 'Trạng Thái Tính Năng Server',
            description: `${desc}\n\n*Sử dụng \`/setup feature\` để thay đổi cấu hình.*`,
            isStatusList: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }
      }
    }

    // 4. CẤU HÌNH THÔNG BÁO VÀO/RA
    if (subGroup === 'notify') {
      const action = subCommand;

      switch (action) {
        case 'set': {
          const type = interaction.options.getString('type', true);
          const targetChannel = interaction.options.getChannel('channel', true);

          if (!targetChannel.isTextBased()) {
            const errEmbed = EmbedBuilderUtility.createNotificationSetupResponseEmbed({
              title: 'Kênh Không Hợp Lệ',
              description: '❌ Vui lòng chọn một **kênh văn bản (Text Channel)** để nhận thông báo.',
              success: false,
            });
            return await interaction.reply({ embeds: [errEmbed], ephemeral: true });
          }

          guildSettingsService.setNotificationChannel(guildId, type, targetChannel.id);

          let desc = '';
          if (type === 'all') {
            desc = `Đã cài đặt kênh <#${targetChannel.id}> làm kênh nhận thông báo **Chào mừng** và **Tạm biệt** thành viên.`;
          } else if (type === 'leave') {
            desc = `Đã cài đặt kênh <#${targetChannel.id}> làm kênh nhận thông báo **Tạm biệt** thành viên rời đi.`;
          } else {
            desc = `Đã cài đặt kênh <#${targetChannel.id}> làm kênh nhận thông báo **Chào mừng** thành viên mới.`;
          }

          const embed = EmbedBuilderUtility.createNotificationSetupResponseEmbed({
            title: 'Cài Đặt Kênh Thông Báo Thành Công',
            description: `${desc}\n\n> *Nếu không cấu hình hoặc sau khi reset, bot sẽ mặc định gửi vào Kênh hệ thống.*`,
            success: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }

        case 'reset': {
          const type = interaction.options.getString('type') || 'all';
          guildSettingsService.resetNotificationChannel(guildId, type);

          let desc = '';
          if (type === 'all') {
            desc = 'Đã đặt lại toàn bộ kênh thông báo về **Kênh hệ thống mặc định (System Channel)** của Server.';
          } else if (type === 'leave') {
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
          return await interaction.reply({ embeds: [embed] });
        }

        case 'status':
        case 'list': {
          const settings = guildSettingsService.getNotificationSettings(guildId);
          const systemCh = interaction.guild.systemChannel ? `<#${interaction.guild.systemChannel.id}>` : '*Không có*';
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
            `*Sử dụng \`/setup notify set\` để chỉ định kênh riêng hoặc \`/setup notify reset\` để đặt lại về mặc định.*`;

          const embed = EmbedBuilderUtility.createNotificationSetupResponseEmbed({
            title: `Cấu Hình Kênh Thông Báo • ${interaction.guild.name}`,
            description: desc,
            success: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }
      }
    }

    // 5. CẤU HÌNH AI MODEL
    if (subGroup === 'ai') {
      const action = subCommand;

      switch (action) {
        case 'set-primary':
        case 'primary': {
          const provider = interaction.options.getString('provider', true);
          guildSettingsService.setAIPrimaryProvider(guildId, provider);
          const providerName = provider === 'openrouter' ? 'OpenRouter' : 'Google Gemini';
          const fallbackName = provider === 'openrouter' ? 'Google Gemini' : 'OpenRouter';

          const embed = EmbedBuilderUtility.createAISetupResponseEmbed({
            title: 'Cài Đặt Nhà Cung Cấp AI Chính Thành Công',
            description:
              `Đã chuyển **${providerName}** thành **Nhà cung cấp AI Chính (Primary)** cho Server:\n\n` +
              `• 🌟 **Chính (Ưu tiên gọi trước):** \`${providerName}\`\n` +
              `• 🔄 **Dự phòng (Fallback):** \`${fallbackName}\`\n\n` +
              `> *Mỗi khi gọi \`/ask\` hoặc \`!ask\`, bot sẽ ưu tiên gọi ${providerName} trước, nếu có sự cố sẽ tự động fallback sang ${fallbackName}.*`,
            success: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }

        case 'set-model':
        case 'set': {
          const provider = interaction.options.getString('provider', true);
          const model = interaction.options.getString('model', true);

          guildSettingsService.setAIModel(guildId, provider, model);

          const providerName = provider === 'gemini' ? 'Google Gemini' : 'OpenRouter';
          const embed = EmbedBuilderUtility.createAISetupResponseEmbed({
            title: 'Cài Đặt AI Model Thành Công',
            description:
              `Đã cấu hình Model cho **${providerName}** tại Server:\n` +
              `• **Model:** \`${model}\`\n\n` +
              `> *Model này sẽ được ưu tiên sử dụng mỗi khi thành viên gọi lệnh \`!ask\` hoặc \`/ask\`.*`,
            success: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }

        case 'reset-model':
        case 'reset': {
          const provider = interaction.options.getString('provider') || 'all';
          guildSettingsService.resetAIModel(guildId, provider);

          let provText = 'toàn bộ cấu hình AI (Gemini, OpenRouter & Provider chính)';
          if (provider === 'gemini') provText = 'Google Gemini';
          else if (provider === 'openrouter') provText = 'OpenRouter';
          else if (provider === 'primary') provText = 'Nhà cung cấp AI chính (Primary Provider)';

          const embed = EmbedBuilderUtility.createAISetupResponseEmbed({
            title: 'Đặt Lại AI Model Về Mặc Định',
            description:
              `Đã khôi phục Model của **${provText}** về cấu hình mặc định của Bot.\n\n` +
              `> *Sử dụng \`/setup ai status\` để kiểm tra Model hiện tại.*`,
            success: true,
            isDestructive: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }

        case 'status':
        case 'list': {
          const aiSettings = guildSettingsService.getAISettings(guildId);

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
            `Thông tin mô hình AI đang phục vụ cho Server **${interaction.guild.name}**:\n\n` +
            `• 🌟 **Nhà cung cấp chính (Primary):** ${primaryStatus}\n` +
            `• 🔷 **Google Gemini:** ${geminiStatus}\n` +
            `• 🔶 **OpenRouter:** ${openrouterStatus}\n\n` +
            `**Các câu lệnh tùy chỉnh:**\n` +
            `• Đổi provider chính: \`/setup ai set-primary provider:<gemini|openrouter>\`\n` +
            `• Đổi model: \`/setup ai set-model provider:<gemini|openrouter> model:<tên_model>\`\n` +
            `• Đặt lại mặc định: \`/setup ai reset-model provider:<gemini|openrouter|primary|all>\``;

          const embed = EmbedBuilderUtility.createAISetupResponseEmbed({
            title: `Cấu Hình AI Model • ${interaction.guild.name}`,
            description: desc,
            success: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }
      }
    }

    // 6. CẤU HÌNH DỮ LIỆU SERVER CHO AI
    if (subGroup === 'knowledge') {
      const action = subCommand;

      switch (action) {
        case 'add-channel': {
          const targetChannel = interaction.options.getChannel('channel', true);

          if (!targetChannel.isTextBased()) {
            const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
              title: 'Kênh Không Hợp Lệ',
              description: '❌ Vui lòng chọn một **kênh văn bản (Text Channel)** để làm nguồn dữ liệu cho AI.',
              success: false,
            });
            return await interaction.reply({ embeds: [errEmbed], ephemeral: true });
          }

          const addResult = guildSettingsService.addKnowledgeChannel(guildId, targetChannel.id);

          if (addResult.alreadyExists) {
            const warnEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
              title: 'Kênh Đã Tồn Tại',
              description: `Kênh <#${targetChannel.id}> đã có trong danh sách kênh tri thức rồi.`,
              success: false,
            });
            return await interaction.reply({ embeds: [warnEmbed], ephemeral: true });
          }

          const channelListDisplay = addResult.channelIds.map((id) => `<#${id}>`).join('\n• ') || '*Trống*';
          const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
            title: 'Thêm Kênh Tri Thức Thành Công',
            description:
              `Đã thêm kênh <#${targetChannel.id}> vào danh sách **Kênh dữ liệu máy chủ** cho AI.\n\n` +
              `**Danh sách kênh tri thức hiện tại (${addResult.channelIds.length} kênh):**\n• ${channelListDisplay}\n\n` +
              `> *AI sẽ đọc tin nhắn ghim từ tất cả các kênh này khi trả lời câu hỏi.*`,
            success: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }

        case 'remove-channel': {
          const targetChannel = interaction.options.getChannel('channel', true);
          const removeResult = guildSettingsService.removeKnowledgeChannel(guildId, targetChannel.id);

          if (removeResult.notFound) {
            const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
              title: 'Kênh Không Có Trong Danh Sách',
              description: `Kênh <#${targetChannel.id}> không nằm trong danh sách kênh tri thức.`,
              success: false,
            });
            return await interaction.reply({ embeds: [errEmbed], ephemeral: true });
          }

          const remainingDisplay = removeResult.channelIds.length
            ? removeResult.channelIds.map((id) => `<#${id}>`).join('\n• ')
            : '*Không có kênh nào*';
          const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
            title: 'Xóa Kênh Tri Thức Thành Công',
            description:
              `Đã xóa kênh <#${targetChannel.id}> khỏi danh sách.\n\n` +
              `**Kênh còn lại (${removeResult.channelIds.length} kênh):**\n• ${remainingDisplay}`,
            success: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }

        case 'add-message':
        case 'set-message': {
          const messageInput = interaction.options.getString('message', true);
          const optionalChannel = interaction.options.getChannel('channel');
          const fallbackChannelId = optionalChannel?.id || interaction.channelId;

          const msgInfo = knowledgeSetupHandler.extractMessageInfo(messageInput, fallbackChannelId);

          if (!msgInfo) {
            const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
              title: 'Tin Nhắn Không Hợp Lệ',
              description:
                '❌ Vui lòng cung cấp **Link tin nhắn Discord** hoặc **ID tin nhắn**.\n\n' +
                '**Cách lấy link tin nhắn:** Click chuột phải vào tin nhắn -> chọn *Copy Message Link*.\n\n' +
                '**Ví dụ:** `https://discord.com/channels/123.../456.../789...`',
              success: false,
            });
            return await interaction.reply({ embeds: [errEmbed], ephemeral: true });
          }

          let targetChannel = interaction.guild.channels.cache.get(msgInfo.channelId);
          if (!targetChannel) {
            targetChannel = await interaction.guild.channels.fetch(msgInfo.channelId).catch(() => null);
          }

          if (!targetChannel || !targetChannel.isTextBased()) {
            const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
              title: 'Kênh Không Tồn Tại',
              description: `❌ Không tìm thấy kênh văn bản chứa tin nhắn ID \`${msgInfo.messageId}\`.`,
              success: false,
            });
            return await interaction.reply({ embeds: [errEmbed], ephemeral: true });
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
              description: `❌ Không thể tìm thấy tin nhắn ID \`${msgInfo.messageId}\` trong kênh <#${msgInfo.channelId}>.`,
              success: false,
            });
            return await interaction.reply({ embeds: [errEmbed], ephemeral: true });
          }

          const addRes = guildSettingsService.addKnowledgeMessage(guildId, msgInfo.channelId, msgInfo.messageId);

          if (addRes.alreadyExists) {
            const warnEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
              title: 'Tin Nhắn Đã Tồn Tại',
              description: `Tin nhắn \`${msgInfo.messageId}\` tại kênh <#${msgInfo.channelId}> đã có trong danh sách tri thức rồi.`,
              success: false,
            });
            return await interaction.reply({ embeds: [warnEmbed], ephemeral: true });
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
          return await interaction.reply({ embeds: [embed] });
        }

        case 'remove-message': {
          const messageInput = interaction.options.getString('message', true);
          const msgInfo = knowledgeSetupHandler.extractMessageInfo(messageInput, interaction.channelId);
          const targetMsgId = msgInfo ? msgInfo.messageId : messageInput.trim();

          const removeRes = guildSettingsService.removeKnowledgeMessage(guildId, targetMsgId);

          if (removeRes.notFound) {
            const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
              title: 'Không Tìm Thấy Tin Nhắn',
              description: `❌ Tin nhắn \`${targetMsgId}\` không nằm trong danh sách tri thức của Server.`,
              success: false,
            });
            return await interaction.reply({ embeds: [errEmbed], ephemeral: true });
          }

          const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
            title: 'Xóa Tin Nhắn Tri Thức Thành Công',
            description:
              `Đã xóa tin nhắn \`${targetMsgId}\` khỏi danh sách nguồn tri thức.\n\n` +
              `• 📚 **Tin nhắn còn lại:** \`${removeRes.messages.length} tin nhắn\``,
            success: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }

        case 'add-text': {
          const content = interaction.options.getString('content', true);
          const addTextRes = guildSettingsService.addKnowledgeText(guildId, content);

          const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
            title: 'Thêm Văn Bản Tri Thức Thành Công',
            description:
              `Đã lưu thêm đoạn văn bản tùy chỉnh cho Server:\n\n` +
              `> *${content.length > 300 ? content.substring(0, 300) + '...' : content}*\n\n` +
              `• 📝 **Tổng số đoạn văn bản:** \`${addTextRes.customTexts.length} đoạn\`\n\n` +
              `> *AI Assistant sẽ ưu tiên dùng kiến thức này để giải đáp thắc mắc.*`,
            success: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }

        case 'remove-text': {
          const index = interaction.options.getInteger('index', true);
          const removeTextRes = guildSettingsService.removeKnowledgeText(guildId, index);

          if (removeTextRes.notFound) {
            const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
              title: 'Không Tìm Thấy Văn Bản',
              description: `❌ Không tìm thấy đoạn văn bản số \`#${index}\`. Vui lòng dùng \`/setup knowledge status\` để xem danh sách số thứ tự.`,
              success: false,
            });
            return await interaction.reply({ embeds: [errEmbed], ephemeral: true });
          }

          const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
            title: 'Xóa Văn Bản Tri Thức Thành Công',
            description:
              `Đã xóa đoạn văn bản số \`#${index}\` khỏi danh sách tri thức.\n\n` +
              `• 📝 **Số đoạn văn bản còn lại:** \`${removeTextRes.customTexts.length} đoạn\``,
            success: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }

        case 'reset': {
          guildSettingsService.resetKnowledgeConfig(guildId);

          const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
            title: 'Đặt Lại Dữ Liệu Server Cho AI',
            description:
              'Đã xóa toàn bộ cấu hình kênh kiến thức, tin nhắn chỉ định và văn bản tùy chỉnh. AI sẽ dùng thông tin kênh/vai trò mặc định của Server.',
            success: true,
            isDestructive: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }

        case 'status':
        case 'list': {
          const kConfig = guildSettingsService.getKnowledgeConfig(guildId);
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
                  `[${idx + 1}] Tin nhắn \`${m.messageId}\` tại <#${m.channelId}> ([Mở link](https://discord.com/channels/${guildId}/${m.channelId}/${m.messageId}))`
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
            `Cấu hình nguồn kiến thức máy chủ cho AI Assistant tại **${interaction.guild.name}**:\n\n` +
            `• 📜 **Kênh kiến thức (${channelIds.length} kênh):**\n  • ${channelDisplay}\n\n` +
            `• 💬 **Tin nhắn chỉ định (${messages.length} tin nhắn):**\n  • ${messageDisplay}\n\n` +
            `• 📝 **Văn bản tùy chỉnh (${customTexts.length} đoạn):**\n${textDisplay}\n\n` +
            `**Các câu lệnh tùy chỉnh:**\n` +
            `• Thêm kênh: \`/setup knowledge add-channel channel:#channel\`\n` +
            `• Xóa kênh: \`/setup knowledge remove-channel channel:#channel\`\n` +
            `• Thêm tin nhắn: \`/setup knowledge add-message message:<link_hoặc_id> [channel:#channel]\`\n` +
            `• Xóa tin nhắn: \`/setup knowledge remove-message message:<link_hoặc_id>\`\n` +
            `• Thêm văn bản: \`/setup knowledge add-text content:<nội dung>\`\n` +
            `• Xóa văn bản: \`/setup knowledge remove-text index:<số_thứ_tự>\`\n` +
            `• Đặt lại mặc định: \`/setup knowledge reset\``;

          const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
            title: `Dữ Liệu Server Cho AI • ${interaction.guild.name}`,
            description: desc,
            success: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }
      }
    }
  }
}

module.exports = new SetupSlashHandler();
