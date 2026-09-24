const EmbedBuilderUtility = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

/**
 * HelpCommandHandler
 * Xử lý các câu lệnh trợ giúp / hướng dẫn sử dụng từ tin nhắn chat (!help, /help, !trogiup, /trogiup)
 */
class HelpCommandHandler {
  /**
   * Kiểm tra tin nhắn có phải là lệnh trợ giúp hay không
   * @param {string} content
   * @returns {boolean}
   */
  isHelpCommand(content) {
    if (!content || typeof content !== 'string') return false;
    const lower = content.trim().toLowerCase();
    return (
      lower === '!help' ||
      lower.startsWith('!help ') ||
      lower === '/help' ||
      lower.startsWith('/help ') ||
      lower === 's!help' ||
      lower.startsWith('s!help ') ||
      lower === 's!h' ||
      lower.startsWith('s!h ') ||
      lower === '!trogiup' ||
      lower.startsWith('!trogiup ') ||
      lower === '/trogiup' ||
      lower.startsWith('/trogiup ')
    );
  }

  /**
   * Xử lý lệnh trợ giúp từ tin nhắn prefix
   * @param {import('discord.js').Message} message
   */
  async handleCommand(message) {
    if (!message || !message.guild) return;

    try {
      const rawContent = message.content.trim().toLowerCase();
      const isMusicPrefix = rawContent.startsWith('s!help') || rawContent.startsWith('s!h');

      let feature = isMusicPrefix ? 'music' : 'all';
      const firstSpaceIdx = rawContent.indexOf(' ');

      if (firstSpaceIdx !== -1) {
        const arg = rawContent.slice(firstSpaceIdx + 1).trim();
        if (arg) {
          feature = arg;
        }
      }

      const embed = EmbedBuilderUtility.createHelpEmbed({ feature });
      await message.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('[HelpCommandHandler] Lỗi khi xử lý lệnh help:', error);
    }
  }

  /**
   * Xử lý Slash Command /help
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async handleSlashCommand(interaction) {
    const feature = interaction.options.getString('feature') || 'all';
    const embed = EmbedBuilderUtility.createHelpEmbed({ feature });
    await interaction.reply({ embeds: [embed] });
  }
}

module.exports = new HelpCommandHandler();
