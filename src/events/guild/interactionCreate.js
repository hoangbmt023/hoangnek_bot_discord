const { Events } = require('discord.js');
const BaseEvent = require('../BaseEvent');
const musicButtonHandler = require('../../services/music/musicButtonHandler');
const musicSlashHandler = require('../../services/music/musicSlashHandler');
const setupSlashHandler = require('../../services/settings/setupSlashHandler');
const askCommandHandler = require('../../services/ai/askCommandHandler');
const helpCommandHandler = require('../../services/help/helpCommandHandler');
const logger = require('../../utils/logger');

/**
 * InteractionCreateEvent
 * Bộ điều phối trung tâm cho mọi tương tác từ Discord:
 * - Gợi ý tự động (Autocomplete Interaction)
 * - Tương tác nút bấm (Button Interaction)
 * - Lệnh Slash Commands (/setup, /music, /help, /ask)
 * Tuân thủ Single Responsibility Principle (SRP) & Clean Architecture.
 */
class InteractionCreateEvent extends BaseEvent {
  constructor() {
    super(Events.InteractionCreate);
  }

  /**
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction) {
    // 1. Xử lý gợi ý tương tác thông minh (Autocomplete)
    if (interaction.isAutocomplete()) {
      try {
        if (interaction.commandName === 'setup') {
          await setupSlashHandler.handleAutocomplete(interaction);
        }
      } catch (error) {
        logger.error(`[InteractionCreate] Lỗi khi xử lý Autocomplete /${interaction.commandName}:`, error);
      }
      return;
    }

    // 2. Xử lý các tương tác nút bấm (Button Components)
    if (interaction.isButton()) {
      try {
        if (musicButtonHandler.isMusicButton(interaction.customId)) {
          await musicButtonHandler.handleButtonInteraction(interaction);
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

    // 3. Xử lý Slash Commands (Chat Input Commands)
    if (!interaction.isChatInputCommand()) return;

    const { commandName, guildId, user } = interaction;

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

      switch (commandName) {
        case 'setup':
          await setupSlashHandler.handleSlashCommand(interaction);
          break;
        case 'music':
          await musicSlashHandler.handleSlashCommand(interaction);
          break;
        case 'help':
          await helpCommandHandler.handleSlashCommand(interaction);
          break;
        case 'ask':
          await askCommandHandler.handleSlashCommand(interaction);
          break;
        default:
          logger.warn(`[InteractionCreate] Nhận được Slash Command chưa được đăng ký xử lý: /${commandName}`);
          break;
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
}

module.exports = InteractionCreateEvent;
