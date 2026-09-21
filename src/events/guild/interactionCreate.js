const { Events, PermissionFlagsBits } = require('discord.js');
const BaseEvent = require('../BaseEvent');
const whitelistService = require('../../services/whitelistService');
const guildSettingsService = require('../../services/guildSettingsService');
const channelSetupService = require('../../services/channelSetupService');
const MusicManager = require('../../music/MusicManager');
const MusicSourceResolver = require('../../music/MusicSourceResolver');
const musicButtonHandler = require('../../services/musicButtonHandler');
const EmbedBuilderUtility = require('../../utils/embedBuilder');
const aiService = require('../../services/ai/aiService');
const askCommandHandler = require('../../services/askCommandHandler');
const setupCommandHandler = require('../../services/setupCommandHandler');
const logger = require('../../utils/logger');

/**
 * InteractionCreateEvent
 * Xử lý các tương tác Slash Command (/wl, /feature, /setup, /music, /help, /ask) và Button Components
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
      } else if (commandName === 'ask') {
        await this.handleAskCommand(interaction);
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
   * Xử lý Slash Command /ask
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async handleAskCommand(interaction) {
    const isAiEnabled = guildSettingsService.isFeatureEnabled(interaction.guildId, 'ai');
    if (!isAiEnabled) {
      const embed = EmbedBuilderUtility.createWarningEmbed(
        'Tính Năng Đang Bị Tắt',
        '⚠️ Tính năng **Trợ lý AI (AI Assistant)** hiện đang bị tắt bởi Quản trị viên trên máy chủ này.\n\n' +
        '> Quản trị viên có thể bật lại bằng lệnh `/setup feature enable feature:ai` hoặc `!feature enable ai`.'
      );
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const question = interaction.options.getString('question');

    const thinkingTexts = [
      '● ⚬ ⚬ *Đang suy nghĩ để trả lời câu hỏi của bạn*',
      '⚬ ● ⚬ *Đang suy nghĩ để trả lời câu hỏi của bạn*',
      '⚬ ⚬ ● *Đang suy nghĩ để trả lời câu hỏi của bạn*',
    ];

    let animStep = 0;
    let animTimer = null;

    await interaction.reply({ content: thinkingTexts[0] });

    animTimer = setInterval(() => {
      animStep = (animStep + 1) % thinkingTexts.length;
      interaction.editReply({ content: thinkingTexts[animStep] }).catch(() => {});
    }, 1000);

    try {
      const response = await aiService.ask({
        question,
        userId: interaction.user.id,
        userName: interaction.user.tag,
        guild: interaction.guild,
      });

      if (animTimer) clearInterval(animTimer);

      const fullAnswer = response.text || 'Không có câu trả lời từ AI.';
      const maxLen = 3900;

      if (fullAnswer.length <= maxLen) {
        const answerEmbed = EmbedBuilderUtility.createAIAnswerEmbed({
          answer: fullAnswer,
          model: response.model,
          responseTime: response.responseTime,
          user: interaction.user,
        });

        await interaction.editReply({ content: '', embeds: [answerEmbed] });
      } else {
        const firstChunk = fullAnswer.slice(0, maxLen);
        const remaining = fullAnswer.slice(maxLen);

        const answerEmbed = EmbedBuilderUtility.createAIAnswerEmbed({
          answer: firstChunk,
          model: response.model,
          responseTime: response.responseTime,
          user: interaction.user,
        });

        await interaction.editReply({ content: '', embeds: [answerEmbed] });

        const chunks = askCommandHandler.splitMessage(remaining, 1950);
        for (const chunk of chunks) {
          await interaction.followUp({ content: chunk });
        }
      }
    } catch (error) {
      if (animTimer) clearInterval(animTimer);
      logger.error('[InteractionCreate] Lỗi khi xử lý /ask:', error);
      const errorEmbed = EmbedBuilderUtility.createAIErrorEmbed({
        errorMessage: error.message,
        user: interaction.user,
      });
      await interaction.editReply({ content: '', embeds: [errorEmbed] }).catch(() => {});
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

    if (focusedOption.name === 'model') {
      const rawProvider = interaction.options.getString('provider') || '';
      const provider = rawProvider.trim().toLowerCase();

      if (provider === 'gemini') {
        choices = [
          { name: 'gemini-3.6-flash [Mặc định Google - Tối ưu nhất]', value: 'gemini-3.6-flash' },
          { name: 'gemini-3.5-flash-lite [Google - Siêu nhanh 1s]', value: 'gemini-3.5-flash-lite' },
        ];
      } else if (provider === 'openrouter') {
        choices = [
          { name: 'openrouter/free [Mặc định OpenRouter - Auto Free]', value: 'openrouter/free' },
          { name: 'google/gemma-4-31b-it:free [Google Gemma 4 Free]', value: 'google/gemma-4-31b-it:free' },
          { name: 'google/gemma-4-26b-a4b-it:free [Google Gemma 26B Free]', value: 'google/gemma-4-26b-a4b-it:free' },
          { name: 'qwen/qwen3.8-27b:free [Qwen 3.8 27B Free]', value: 'qwen/qwen3.8-27b:free' },
          { name: 'nvidia/nemotron-3-super-120b-a12b:free [NVIDIA Nemotron 120B Free]', value: 'nvidia/nemotron-3-super-120b-a12b:free' },
          { name: 'z-ai/glm-5.2:free [GLM 5.2 Free]', value: 'z-ai/glm-5.2:free' },
        ];
      } else {
        // Chưa chọn provider hoặc đang gõ
        choices = [
          { name: 'gemini-3.6-flash [Gemini - Mặc định]', value: 'gemini-3.6-flash' },
          { name: 'gemini-3.5-flash-lite [Gemini - Siêu nhanh]', value: 'gemini-3.5-flash-lite' },
          { name: 'openrouter/free [OpenRouter - Mặc định]', value: 'openrouter/free' },
          { name: 'google/gemma-4-31b-it:free [OpenRouter Free]', value: 'google/gemma-4-31b-it:free' },
          { name: 'qwen/qwen3.8-27b:free [OpenRouter Free]', value: 'qwen/qwen3.8-27b:free' },
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

    // 5. CẤU HÌNH AI MODEL (subGroup === 'ai')
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

        default: {
          const errEmbed = EmbedBuilderUtility.createAISetupResponseEmbed({
            title: 'Hành Động Không Hợp Lệ',
            description: `Hành động \`${action}\` không áp dụng cho cấu hình AI.`,
            success: false,
          });
          return await interaction.reply({ embeds: [errEmbed], ephemeral: true });
        }
      }
    }

    // 6. CẤU HÌNH DỮ LIỆU SERVER CHO AI (subGroup === 'knowledge')
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

          const msgInfo = setupCommandHandler.extractMessageInfo(messageInput, fallbackChannelId);

          if (!msgInfo) {
            const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
              title: 'Tin Nhắn Không Hợp Lệ',
              description:
                '❌ Vui lòng cung cấp **Link tin nhắn Discord** hoặc **ID tin nhắn**.\n\n' +
                '**Cách lấy link tin nhắn:** Click chuột phải vào tin nhắn -> chọn *Copy Message Link* (Sao chép liên kết tin nhắn).\n\n' +
                '**Ví dụ:** `https://discord.com/channels/123.../456.../789...`\n' +
                '*(Nếu chỉ nhập ID, vui lòng chọn thêm kênh ở mục `channel`)*',
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
              title: 'Kênh Không Tồn Tại Hoặc Không Hợp Lệ',
              description: `❌ Không tìm thấy kênh văn bản chứa tin nhắn ID \`${msgInfo.messageId}\`. Vui lòng kiểm tra lại quyền truy cập!`,
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
              description: `❌ Không thể tìm thấy tin nhắn với ID \`${msgInfo.messageId}\` trong kênh <#${msgInfo.channelId}>. Vui lòng kiểm tra lại link hoặc quyền xem lịch sử tin nhắn của Bot!`,
              success: false,
            });
            return await interaction.reply({ embeds: [errEmbed], ephemeral: true });
          }

          const addRes = guildSettingsService.addKnowledgeMessage(guildId, msgInfo.channelId, msgInfo.messageId);

          if (addRes.alreadyExists) {
            const warnEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
              title: 'Tin Nhắn Đã Tồn Tại',
              description: `Tin nhắn \`${msgInfo.messageId}\` tại kênh <#${msgInfo.channelId}> đã có trong danh sách tri thức của Server rồi.`,
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
          const msgInfo = setupCommandHandler.extractMessageInfo(messageInput, interaction.channelId);
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

        case 'add-text':
        case 'set-text': {
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

        default: {
          const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
            title: 'Hành Động Không Hợp Lệ',
            description: `Hành động \`${action}\` không áp dụng cho cấu hình Knowledge.`,
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
    // 0. Kiểm tra tính năng nhạc có đang bật không
    const isMusicEnabled = guildSettingsService.isFeatureEnabled(guildId, 'music');
    if (!isMusicEnabled) {
      const embed = EmbedBuilderUtility.createWarningEmbed(
        'Tính Năng Đang Bị Tắt',
        '⚠️ Tính năng **Phát nhạc (Music System)** hiện đang bị tắt bởi Quản trị viên trên máy chủ này.\n\n' +
        '> Quản trị viên có thể bật lại bằng lệnh `/setup feature enable feature:music` hoặc `!feature enable music`.'
      );
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

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


