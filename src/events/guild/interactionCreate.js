const { Events, PermissionFlagsBits } = require('discord.js');
const BaseEvent = require('../BaseEvent');
const whitelistService = require('../../services/whitelistService');
const guildSettingsService = require('../../services/guildSettingsService');
const EmbedBuilderUtility = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

/**
 * InteractionCreateEvent
 * Xử lý các tương tác Slash Command (/wl, /feature)
 */
class InteractionCreateEvent extends BaseEvent {
  constructor() {
    super(Events.InteractionCreate);
  }

  /**
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction) {
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
      const subInfo = subCommand ? ` [${subCommand}]` : '';
      logger.info(
        `[SlashCommand] ${user.tag} (${user.id}) đã gọi /${commandName}${subInfo} tại Server "${interaction.guild.name}"`
      );

      if (commandName === 'wl' || commandName === 'whitelist') {
        await this.handleWhitelistCommand(interaction, guildId, member);
      } else if (commandName === 'feature' || commandName === 'toggle') {
        await this.handleFeatureCommand(interaction, guildId, member);
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
   * Xử lý lệnh /help
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async handleHelpCommand(interaction) {
    const feature = interaction.options.getString('feature') || 'all';
    const embed = EmbedBuilderUtility.createHelpEmbed({ feature });
    await interaction.reply({ embeds: [embed] });
  }

  /**
   * Xử lý lệnh /wl
   */
  async handleWhitelistCommand(interaction, guildId, member) {
    const hasPermission =
      member.permissions.has(PermissionFlagsBits.Administrator) ||
      member.permissions.has(PermissionFlagsBits.ManageGuild) ||
      member.permissions.has(PermissionFlagsBits.ManageMessages);

    if (!hasPermission) {
      const errorEmbed = EmbedBuilderUtility.createWhitelistResponseEmbed({
        title: 'Quyền Hạn Không Đủ',
        description: 'Bạn cần có quyền **Quản trị viên (Administrator)** hoặc **Quản lý máy chủ (Manage Server)** để quản lý Whitelist.',
        success: false,
      });
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      return;
    }

    const subCommand = interaction.options.getSubcommand();

    switch (subCommand) {
      case 'add': {
        const feature = interaction.options.getString('feature', true);
        const usersInput = interaction.options.getString('users', true);

        const result = whitelistService.addUsers(guildId, usersInput, feature);

        if (result.added.length === 0 && result.alreadyExists.length === 0) {
          const emptyEmbed = EmbedBuilderUtility.createWhitelistResponseEmbed({
            title: 'Không Tìm Thấy Người Dùng Hợp Lệ',
            description: 'Vui lòng tag `@user` hoặc nhập ID người dùng hợp lệ (có thể nhập nhiều người cách nhau bởi dấu phẩy).',
            success: false,
          });
          await interaction.reply({ embeds: [emptyEmbed], ephemeral: true });
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

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'remove': {
        const feature = interaction.options.getString('feature', true);
        const usersInput = interaction.options.getString('users', true);

        const result = whitelistService.removeUsers(guildId, usersInput, feature);

        if (result.removed.length === 0 && result.notFound.length === 0) {
          const emptyEmbed = EmbedBuilderUtility.createWhitelistResponseEmbed({
            title: 'Không Tìm Thấy Người Dùng Hợp Lệ',
            description: 'Vui lòng tag `@user` hoặc nhập ID người dùng hợp lệ.',
            success: false,
          });
          await interaction.reply({ embeds: [emptyEmbed], ephemeral: true });
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

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'list': {
        const feature = interaction.options.getString('feature');
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

        await interaction.reply({ embeds: [listEmbed] });
        break;
      }

      case 'clear': {
        const feature = interaction.options.getString('feature');
        whitelistService.clearList(guildId, feature);

        const featName = feature ? whitelistService.getFeatureDisplayName(feature) : 'Tất cả chức năng';
        const clearEmbed = EmbedBuilderUtility.createWhitelistResponseEmbed({
          title: 'Dọn Dẹp Danh Sách Whitelist',
          description: `Đã xóa toàn bộ danh sách thành viên Whitelist cho **${featName}** trong Server này.`,
          success: true,
          isDestructive: true,
        });

        await interaction.reply({ embeds: [clearEmbed] });
        break;
      }

      case 'help':
      default: {
        const helpEmbed = EmbedBuilderUtility.createWhitelistResponseEmbed({
          title: 'Hướng Dẫn Quản Lý Whitelist',
          description:
            `Hệ thống hỗ trợ miễn trừ kiểm duyệt theo từng tính năng và nhiều người dùng cùng lúc:\n\n` +
            `**1. Thêm thành viên vào Whitelist:**\n` +
            `• \`/wl add feature:toxic users:@user1, @user2\`\n` +
            `• \`/wl add feature:all users:123456789, 987654321\`\n\n` +
            `**2. Xóa thành viên khỏi Whitelist:**\n` +
            `• \`/wl remove feature:toxic users:@user1, @user2\`\n\n` +
            `**3. Xem danh sách thành viên:**\n` +
            `• \`/wl list\` *(hoặc lọc theo \`feature\`)*\n\n` +
            `**4. Dọn dẹp danh sách:**\n` +
            `• \`/wl clear\`\n\n` +
            `*Lưu ý: Chỉ Quản trị viên mới có thể thực thi các lệnh này.*`,
          success: true,
        });

        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
        break;
      }
    }
  }

  /**
   * Xử lý lệnh /feature
   */
  async handleFeatureCommand(interaction, guildId, member) {
    const hasPermission =
      member.permissions.has(PermissionFlagsBits.Administrator) ||
      member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (!hasPermission) {
      const errorEmbed = EmbedBuilderUtility.createFeatureToggleResponseEmbed({
        title: 'Quyền Hạn Không Đủ',
        description: 'Bạn cần có quyền **Quản trị viên (Administrator)** hoặc **Quản lý máy chủ (Manage Server)** để bật/tắt tính năng.',
        enabled: false,
      });
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      return;
    }

    const subCommand = interaction.options.getSubcommand();

    switch (subCommand) {
      case 'enable': {
        const feature = interaction.options.getString('feature', true);
        const result = guildSettingsService.setFeatureState(guildId, feature, true);

        const embed = EmbedBuilderUtility.createFeatureToggleResponseEmbed({
          title: 'Bật Tính Năng Thành Công',
          description:
            `• **Tính năng:** \`${result.featureName}\`\n` +
            `• **Trạng thái:** \`BẬT\`\n\n` +
            `*Tính năng đã được kích hoạt ngay lập tức cho Server.*`,
          enabled: true,
        });

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'disable': {
        const feature = interaction.options.getString('feature', true);
        const result = guildSettingsService.setFeatureState(guildId, feature, false);

        const embed = EmbedBuilderUtility.createFeatureToggleResponseEmbed({
          title: 'Tắt Tính Năng Thành Công',
          description:
            `• **Tính năng:** \`${result.featureName}\`\n` +
            `• **Trạng thái:** \`TẮT\`\n\n` +
            `*Tính năng đã tạm ngưng hoạt động trong Server.*`,
          enabled: false,
        });

        await interaction.reply({ embeds: [embed] });
        break;
      }

      case 'status':
      default: {
        const filter = interaction.options.getString('filter') || 'all';
        let states = guildSettingsService.getAllFeatureStates(guildId);

        let filterTitle = 'Trạng Thái Tính Năng Server';
        if (filter === 'enabled') {
          states = states.filter((item) => item.enabled);
          filterTitle = 'Các Tính Năng Đang BẬT';
        } else if (filter === 'disabled') {
          states = states.filter((item) => !item.enabled);
          filterTitle = 'Các Tính Năng Đang TẮT';
        }

        let desc = '';
        if (states.length === 0) {
          if (filter === 'disabled') {
            desc = 'Hiện tại không có tính năng nào đang bị **TẮT** trong Server này.';
          } else if (filter === 'enabled') {
            desc = 'Hiện tại không có tính năng nào đang được **BẬT** trong Server này.';
          } else {
            desc = 'Không có dữ liệu tính năng.';
          }
        } else {
          desc = states
            .map((item) => {
              const badge = item.enabled ? '`BẬT`' : '`TẮT`';
              return `• **${item.name}:** ${badge}\n  *${item.description}*`;
            })
            .join('\n\n');
        }

        const embed = EmbedBuilderUtility.createFeatureToggleResponseEmbed({
          title: filterTitle,
          description:
            `${desc}\n\n` +
            `*Sử dụng \`/feature enable\` hoặc \`/feature disable\` để thay đổi cấu hình.*`,
          isStatusList: true,
        });

        await interaction.reply({ embeds: [embed] });
        break;
      }
    }
  }
}

module.exports = InteractionCreateEvent;


