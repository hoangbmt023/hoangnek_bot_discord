const { Events, PermissionFlagsBits } = require('discord.js');
const BaseEvent = require('../BaseEvent');
const whitelistService = require('../../services/whitelistService');
const guildSettingsService = require('../../services/guildSettingsService');
const channelSetupService = require('../../services/channelSetupService');
const MusicManager = require('../../music/MusicManager');
const MusicSourceResolver = require('../../music/MusicSourceResolver');
const musicButtonHandler = require('../../services/musicButtonHandler');
const EmbedBuilderUtility = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

/**
 * InteractionCreateEvent
 * Xử lý các tương tác Slash Command (/wl, /feature, /setup, /music, /help) và Button Components
 */
class InteractionCreateEvent extends BaseEvent {
  constructor() {
    super(Events.InteractionCreate);
  }

  /**
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction) {
    if (interaction.isAutocomplete()) {
      await this.handleAutocomplete(interaction);
      return;
    }

    // Xử lý các tương tác nút bấm (Button Interactions)
    if (interaction.isButton()) {
      try {
        if (musicButtonHandler.isMusicButton(interaction.customId)) {
          await musicButtonHandler.handleButtonInteraction(interaction);
          return;
        }
      } catch (error) {
        logger.error('[InteractionCreate] Lỗi khi xử lý Button Interaction:', error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '❌ Đã xảy ra lỗi khi thực thi nút bấm. Vui lòng thử lại!',
            ephemeral: true,
          }).catch(() => {});
        }
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const { commandName, guildId, member, user } = interaction;

    if (!interaction.guild || !guildId) {
      await interaction.reply({
        content: 'Lệnh này chỉ có thể sử dụng bên trong Server Discord.',
        ephemeral: true,
      });
      return;
    }

    try {
      const subCommand = interaction.options.getSubcommand(false);
      const subGroup = interaction.options.getSubcommandGroup(false);
      const subInfo = `${subGroup ? ` [${subGroup}]` : ''}${subCommand ? ` [${subCommand}]` : ''}`;
      logger.info(
        `[SlashCommand] ${user.tag} (${user.id}) đã gọi /${commandName}${subInfo} tại Server "${interaction.guild.name}"`
      );

      if (commandName === 'setup') {
        await this.handleSetupCommand(interaction, guildId, member);
      } else if (commandName === 'music') {
        await this.handleMusicCommand(interaction, guildId, member);
      } else if (commandName === 'help') {
        await this.handleHelpCommand(interaction);
      }
    } catch (error) {
      logger.error(`[InteractionCreate] Lỗi khi xử lý Slash Command /${commandName}:`, error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Đã xảy ra lỗi trong quá trình xử lý lệnh. Vui lòng thử lại sau!',
          ephemeral: true,
        }).catch(() => {});
      }
    }
  }

  /**
   * Xử lý gợi ý tương tác thông minh (Autocomplete) cho /setup
   * @param {import('discord.js').AutocompleteInteraction} interaction
   */
  async handleAutocomplete(interaction) {
    if (interaction.commandName !== 'setup') return;

    const focusedOption = interaction.options.getFocused(true);
    const feature = interaction.options.getString('feature');
    const target = interaction.options.getString('target');

    let choices = [];

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
   * Xử lý lệnh /help
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async handleHelpCommand(interaction) {
    const feature = interaction.options.getString('feature') || 'all';
    const embed = EmbedBuilderUtility.createHelpEmbed({ feature });
    await interaction.reply({ embeds: [embed] });
  }

  /**
   * Xử lý Slash Command /setup theo Subcommand Groups:
   * 1. channel: add, remove, list, clear
   * 2. whitelist: add, remove, list, clear
   * 3. feature: enable, disable, status
   */
  async handleSetupCommand(interaction, guildId, member) {
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
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      return;
    }

    const subGroup = interaction.options.getSubcommandGroup(false);
    const subCommand = interaction.options.getSubcommand(false);

    // 1. CẤU HÌNH KÊNH (subGroup === 'channel')
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

        default: {
          const errEmbed = EmbedBuilderUtility.createChannelSetupResponseEmbed({
            title: 'Hành Động Không Hợp Lệ',
            description: `Hành động \`${action}\` không áp dụng cho cấu hình channel.`,
            success: false,
          });
          return await interaction.reply({ embeds: [errEmbed], ephemeral: true });
        }
      }
    }

    // 2. CẤU HÌNH WHITELIST (subGroup === 'whitelist')
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
              description: 'Vui lòng nhập tag (`@user`, `@role`, `#channel`) hoặc ID trong ô **value** (có thể nhập nhiều cách nhau bằng dấu phẩy)!',
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

        default: {
          const errEmbed = EmbedBuilderUtility.createWhitelistResponseEmbed({
            title: 'Hành Động Không Hợp Lệ',
            description: `Hành động \`${action}\` không áp dụng cho cấu hình whitelist.`,
            success: false,
          });
          return await interaction.reply({ embeds: [errEmbed], ephemeral: true });
        }
      }
    }

    // 3. CẤU HÌNH BẬT/TẮT TÍNH NĂNG (subGroup === 'feature')
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

        default: {
          const errEmbed = EmbedBuilderUtility.createFeatureToggleResponseEmbed({
            title: 'Hành Động Không Hợp Lệ',
            description: `Hành động \`${action}\` không áp dụng cho cấu hình feature.`,
            enabled: false,
          });
          return await interaction.reply({ embeds: [errEmbed], ephemeral: true });
        }
      }
    }

    // 4. CẤU HÌNH KÊNH THÔNG BÁO VÀO/RA (subGroup === 'notify')
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

        default: {
          const errEmbed = EmbedBuilderUtility.createNotificationSetupResponseEmbed({
            title: 'Hành Động Không Hợp Lệ',
            description: `Hành động \`${action}\` không áp dụng cho cấu hình notify.`,
            success: false,
          });
          return await interaction.reply({ embeds: [errEmbed], ephemeral: true });
        }
      }
    }
  }

  /**
   * Xử lý Slash Command /music
   */
  async handleMusicCommand(interaction, guildId, member) {
    // 1. Kiểm tra phân quyền kênh
    const check = channelSetupService.isChannelAllowed(guildId, interaction.channelId, 'music');
    if (!check.allowed) {
      if (check.reason === 'NO_CHANNELS_CONFIGURED') {
        const embed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: 'Chưa Cấu Hình Kênh Phát Nhạc',
          description:
            '⚠️ **Server chưa thiết lập kênh nào được phép phát nhạc!**\n\n' +
            '> Mặc định toàn bộ các kênh đều bị khóa lệnh nhạc.\n' +
            '> Quản trị viên vui lòng dùng `/setup channel add` để cấp phép kênh phát nhạc.',
          success: false,
        });
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

      const allowedList = check.configuredChannels.map((id) => `<#${id}>`).join(', ');
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Kênh Không Được Phép',
        description:
          `❌ Bạn không thể dùng lệnh phát nhạc tại kênh này.\n\n` +
          `**Các kênh được phép:** ${allowedList}`,
        success: false,
      });
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // 2. Kiểm tra trạng thái Voice của người dùng
    const voiceChannel = member.voice?.channel;
    if (!voiceChannel) {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Chưa Tham Gia Voice Channel',
        description: 'Bạn cần phải tham gia vào một **Kênh thoại (Voice Channel)** trước khi điều khiển nhạc!',
        success: false,
      });
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const botVoice = interaction.guild.members.me?.voice?.channel;
    if (botVoice && botVoice.id !== voiceChannel.id) {
      const queue = MusicManager.getQueue(interaction.guildId);
      const requester = queue?.currentTrack?.requestedBy;
      const userStr = requester ? (requester.tag || requester.username || `<@${requester.id || requester}>`) : 'người dùng khác';
      const currentSongStr = queue?.currentTrack ? `\n> 🎶 **Đang phát:** *"${queue.currentTrack.title}"*` : '';

      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Bot Đang Được Sử Dụng Ở Kênh Khác',
        description:
          `⚠️ **Bot hiện đang phát nhạc tại phòng thoại <#${botVoice.id}>!**\n` +
          `> 👤 **Người đang sử dụng:** ${userStr}` +
          currentSongStr +
          `\n\n*Vui lòng tham gia cùng phòng thoại <#${botVoice.id}> hoặc đợi bài hát kết thúc để sử dụng bot!*`,
        success: false,
      });
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const subCommand = interaction.options.getSubcommand();

    switch (subCommand) {
      case 'play': {
        const query = interaction.options.getString('query', true);
        await interaction.deferReply();

        try {
          const result = await MusicSourceResolver.resolve(query, interaction.user);
          const queue = await MusicManager.createQueue({
            guild: interaction.guild,
            voiceChannel,
            textChannel: interaction.channel,
          });

          if (result.isPlaylist) {
            await queue.addTracks(result.tracks);
            const playlistEmbed = EmbedBuilderUtility.createPlaylistAddedEmbed({
              tracksCount: result.tracks.length,
              playlistName: result.playlistName,
              source: result.source,
              requestedBy: interaction.user,
            });
            await interaction.editReply({ embeds: [playlistEmbed] });
          } else {
            const track = result.tracks[0];
            const isPlaying = queue.isPlaying();
            const position = queue.tracks.length + 1;

            await queue.addTrack(track);

            if (isPlaying) {
              const addedEmbed = EmbedBuilderUtility.createTrackAddedEmbed({
                track,
                position,
              });
              await interaction.editReply({ embeds: [addedEmbed] });
            } else {
              const startEmbed = EmbedBuilderUtility.createMusicStatusEmbed({
                title: 'Bắt Đầu Phát Nhạc',
                description: `🎶 Đang chuẩn bị phát: **${track.title}**`,
                success: true,
              });
              await interaction.editReply({ embeds: [startEmbed] });
            }
          }
        } catch (error) {
          const errEmbed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Không Thể Phát Nhạc',
            description: error.message || 'Lỗi không xác định khi tìm bài hát.',
            success: false,
          });
          await interaction.editReply({ embeds: [errEmbed] });
        }
        break;
      }

      case 'pause': {
        const queue = MusicManager.getQueue(guildId);
        if (!queue || !queue.isPlaying()) {
          const embed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Không Có Nhạc Đang Phát',
            description: 'Hiện không có bài hát nào đang phát.',
            success: false,
          });
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        const paused = queue.pause();
        const embed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: paused ? 'Tạm Dừng Phát Nhạc' : 'Không Thể Tạm Dừng',
          description: paused ? '⏸️ Đã tạm dừng phát nhạc.' : 'Nhạc đã tạm dừng từ trước.',
          success: paused,
        });
        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'resume': {
        const queue = MusicManager.getQueue(guildId);
        if (!queue || !queue.currentTrack) {
          const embed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Không Có Nhạc Đang Phát',
            description: 'Không có bài hát nào để tiếp tục phát.',
            success: false,
          });
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        const resumed = queue.resume();
        const embed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: resumed ? 'Tiếp Tục Phát Nhạc' : 'Không Thể Tiếp Tục',
          description: resumed ? '▶️ Đã tiếp tục phát nhạc.' : 'Nhạc đang phát bình thường.',
          success: resumed,
        });
        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'skip': {
        const queue = MusicManager.getQueue(guildId);
        if (!queue || (!queue.currentTrack && queue.tracks.length === 0)) {
          const embed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Không Có Bài Hát',
            description: 'Không có bài hát nào trong hàng đợi để bỏ qua.',
            success: false,
          });
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        const skippedTrack = queue.currentTrack;
        const embed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: 'Đã Bỏ Qua Bài Hát',
          description: `⏭️ Đã bỏ qua bài hát: **${skippedTrack?.title || 'Hiện tại'}**`,
          success: true,
        });

        // 1. Phản hồi "Đã Bỏ Qua Bài Hát" TRƯỚC để hiển thị bên trên
        await interaction.reply({ embeds: [embed] });

        // 2. Chuyển sang bài mới sau -> Thông báo "ĐANG PHÁT NHẠC" sẽ hiển thị ở DƯỚI
        await queue.skip();
        break;
      }

      case 'stop': {
        const queue = MusicManager.getQueue(guildId);
        if (!queue) {
          const embed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Không Có Hàng Đợi',
            description: 'Bot hiện không phát nhạc.',
            success: false,
          });
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        queue.stop();
        const embed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: 'Đã Dừng Phát Nhạc',
          description: '⏹️ Đã dừng phát nhạc và làm trống hàng đợi.',
          success: true,
        });
        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'queue': {
        const queue = MusicManager.getQueue(guildId);
        if (!queue || (!queue.currentTrack && queue.tracks.length === 0)) {
          const embed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Hàng Đợi Trống',
            description: 'Hiện chưa có bài hát nào trong hàng đợi.',
            success: true,
          });
          await interaction.reply({ embeds: [embed] });
          return;
        }

        const itemsPerPage = 10;
        const totalPages = Math.ceil(queue.tracks.length / itemsPerPage) || 1;
        const page = interaction.options.getInteger('page') || 1;

        if (page < 1 || page > totalPages) {
          const embed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Trang Không Tồn Tại',
            description: `⚠️ **Số trang không hợp lệ!**\n> Hàng đợi hiện chỉ có **${totalPages}** trang (từ trang 1 đến trang ${totalPages}).`,
            success: false,
          });
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        const queueEmbed = EmbedBuilderUtility.createQueueEmbed({ queue, page });
        const components = totalPages > 1 ? [EmbedBuilderUtility.createQueuePaginationRow({ currentPage: page, totalPages })] : [];
        await interaction.reply({ embeds: [queueEmbed], components });
        break;
      }

      case 'nowplaying': {
        const queue = MusicManager.getQueue(guildId);
        if (!queue || !queue.currentTrack) {
          const embed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Không Có Bài Hát Đang Phát',
            description: 'Hiện tại bot không phát bài hát nào.',
            success: false,
          });
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        const npEmbed = EmbedBuilderUtility.createNowPlayingEmbed({
          track: queue.currentTrack,
          queue,
        });
        const npRows = EmbedBuilderUtility.createMusicControlRows({ queue });
        await interaction.reply({ embeds: [npEmbed], components: npRows });
        break;
      }

      case 'volume': {
        const queue = MusicManager.getQueue(guildId);
        if (!queue) {
          const embed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Không Có Hàng Đợi',
            description: 'Bot hiện không phát nhạc.',
            success: false,
          });
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        const level = interaction.options.getInteger('level', true);
        const newVol = queue.setVolume(level);
        const embed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: 'Đã Thay Đổi Âm Lượng',
          description: `🔊 Âm lượng đã được đặt thành **${newVol}%**.`,
          success: true,
        });
        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'loop': {
        const queue = MusicManager.getQueue(guildId);
        if (!queue) {
          const embed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Không Có Hàng Đợi',
            description: 'Bot hiện không phát nhạc.',
            success: false,
          });
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        const mode = interaction.options.getString('mode', true);
        const appliedMode = queue.setLoop(mode);
        const modeNames = {
          off: '❌ Tắt lặp lại',
          track: '🔂 Lặp lại bài hát hiện tại',
          queue: '🔁 Lặp lại toàn bộ hàng đợi',
        };

        const embed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: 'Cài Đặt Lặp Lại',
          description: `Chế độ lặp lại đã được chuyển thành: **${modeNames[appliedMode]}**`,
          success: true,
        });
        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'leave': {
        const queue = MusicManager.getQueue(guildId);
        const botVoice = interaction.guild.members.me?.voice;

        if (!queue && (!botVoice || !botVoice.channel)) {
          const embed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Bot Chưa Tham Gia Kênh Thoại',
            description: 'Hiện tại bot không ở trong bất kỳ kênh thoại nào để rời đi.',
            success: false,
          });
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }

        if (!queue) {
          if (botVoice && botVoice.channel) {
            botVoice.disconnect().catch(() => {});
          }
          const embed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Đã Rời Kênh Thoại',
            description: '👋 Bot đã ngắt kết nối và rời khỏi kênh thoại.',
            success: true,
          });
          await interaction.reply({ embeds: [embed] });
          return;
        }

        queue.destroy();
        const embed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: 'Đã Rời Kênh Thoại',
          description: '👋 Đã dừng phát nhạc, giải phóng hàng đợi và rời khỏi kênh thoại.',
          success: true,
        });
        await interaction.reply({ embeds: [embed] });
        break;
      }
    }
  }
}

module.exports = InteractionCreateEvent;


