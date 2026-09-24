const { PermissionFlagsBits } = require('discord.js');
const aiService = require('./aiService');
const guildSettingsService = require('../settings/guildSettingsService');
const logger = require('../../utils/logger');
const EmbedBuilderUtility = require('../../utils/embedBuilder');

/**
 * AskCommandHandler
 * Xử lý các câu lệnh hỏi đáp AI từ chat prefix (!ask)
 */
class AskCommandHandler {
  /**
   * Kiểm tra xem tin nhắn có phải là lệnh !ask không
   * @param {string} content
   * @returns {boolean}
   */
  isAskCommand(content) {
    if (!content || typeof content !== 'string') return false;
    const lower = content.trim().toLowerCase();
    return lower === '!ask' || lower.startsWith('!ask ');
  }

  /**
   * Trích xuất câu hỏi từ nội dung tin nhắn
   * @param {string} content
   * @returns {string}
   */
  extractQuestion(content) {
    if (!content || typeof content !== 'string') return '';
    const trimmed = content.trim();
    if (trimmed.toLowerCase().startsWith('!ask')) {
      return trimmed.slice(4).trim();
    }
    return '';
  }

  /**
   * Phân mảnh tin nhắn dài thành mảng các chuỗi con <= maxLength (mặc định 1950 ký tự)
   * Giữ nguyên ngắt dòng tự nhiên và không cắt gãy giữa từ
   * @param {string} text
   * @param {number} [maxLength=1950]
   * @returns {string[]}
   */
  splitMessage(text, maxLength = 1950) {
    if (!text || typeof text !== 'string') return [];
    if (text.length <= maxLength) return [text];

    const chunks = [];
    let currentText = text;

    while (currentText.length > 0) {
      if (currentText.length <= maxLength) {
        chunks.push(currentText);
        break;
      }

      // Tìm vị trí ngắt dòng hợp lý gần nhất
      let splitIndex = currentText.lastIndexOf('\n', maxLength);
      if (splitIndex === -1 || splitIndex < maxLength * 0.5) {
        // Nếu không có xuống dòng tốt, tìm dấu cách
        splitIndex = currentText.lastIndexOf(' ', maxLength);
      }
      if (splitIndex === -1 || splitIndex < maxLength * 0.3) {
        // Nếu không có dấu cách hợp lý, cắt cứng
        splitIndex = maxLength;
      }

      chunks.push(currentText.slice(0, splitIndex).trim());
      currentText = currentText.slice(splitIndex).trim();
    }

    return chunks;
  }

  /**
   * Xử lý lệnh hỏi đáp AI từ tin nhắn chat
   * @param {import('discord.js').Message} message
   */
  async handleCommand(message) {
    if (!message || !message.guild) return;

    // Kiểm tra tính năng AI có được bật trong Server không
    if (!guildSettingsService.isFeatureEnabled(message.guild.id, 'ai')) {
      const disabledEmbed = EmbedBuilderUtility.createFeatureToggleResponseEmbed({
        title: 'Tính Năng Đã Bị Tắt',
        description:
          '⚠️ Tính năng **Trợ lý AI Assistant** hiện đang bị tắt trong Server này bởi Quản trị viên.\n' +
          'Quản trị viên có thể bật lại bằng `/setup feature enable feature:ai` hoặc `!setup feature enable ai`.',
        enabled: false,
      });
      await message.reply({ embeds: [disabledEmbed] }).catch(() => {});
      return;
    }

    // Kiểm tra quyền cơ bản của bot trong channel
    const botMember = message.guild.members?.me;
    if (botMember && message.channel?.permissionsFor) {
      const perms = message.channel.permissionsFor(botMember);
      if (perms && !perms.has(PermissionFlagsBits.SendMessages)) {
        logger.warn(`[AskCommandHandler] Bot không có quyền SendMessages tại channel ${message.channel.name}`);
        return;
      }
    }

    let question = this.extractQuestion(message.content);

    if (!question) {
      await message.reply({
        content:
          '💡 **Cách sử dụng AI Assistant:**\n' +
          '• `!ask <câu hỏi>`: Đặt câu hỏi kiến thức hoặc thắc mắc về Server.\n' +
          '• Ví dụ:\n' +
          '  - `!ask JavaScript là gì?`\n' +
          '  - `!ask Server có những kênh nào?`\n' +
          '  - `!ask Nội quy server là gì?`\n' +
          '  - `!ask Làm sao để nghe nhạc?`',
      }).catch(() => {});
      return;
    }

    // Giới hạn độ dài câu hỏi tối đa 1,000 ký tự để bảo vệ tài nguyên và chống DoS payload
    if (question.length > 1000) {
      question = question.slice(0, 1000).trim();
    }

    // Gửi hiệu ứng đang soạn tin nhắn và gửi thông báo đang suy nghĩ với 3 chấm
    if (message.channel?.sendTyping) {
      message.channel.sendTyping().catch(() => {});
    }

    const thinkingTexts = [
      '● ⚬ ⚬ *Đang suy nghĩ để trả lời câu hỏi của bạn*',
      '⚬ ● ⚬ *Đang suy nghĩ để trả lời câu hỏi của bạn*',
      '⚬ ⚬ ● *Đang suy nghĩ để trả lời câu hỏi của bạn*',
    ];

    let replyMsg = null;
    let animTimer = null;
    let animStep = 0;

    try {
      replyMsg = await message.reply({ content: thinkingTexts[0] });
      animTimer = setInterval(() => {
        if (!replyMsg) return;
        animStep = (animStep + 1) % thinkingTexts.length;
        replyMsg.edit({ content: thinkingTexts[animStep] }).catch(() => {});
      }, 1000);
    } catch (e) {
      logger.warn('[AskCommandHandler] Không thể gửi thông báo thinking, tiếp tục xử lý:', e);
    }

    try {
      const response = await aiService.ask({
        question,
        userId: message.author.id,
        userName: message.author.tag,
        guild: message.guild,
      });

      if (animTimer) clearInterval(animTimer);

      const fullAnswer = response.text || 'Không có câu trả lời từ AI.';
      const maxLen = 3900;

      if (fullAnswer.length <= maxLen) {
        const answerEmbed = EmbedBuilderUtility.createAIAnswerEmbed({
          answer: fullAnswer,
          model: response.model,
          responseTime: response.responseTime,
          user: message.author,
        });

        if (replyMsg) {
          await replyMsg.edit({ content: '', embeds: [answerEmbed] });
        } else {
          await message.reply({ embeds: [answerEmbed] });
        }
      } else {
        const firstChunk = fullAnswer.slice(0, maxLen);
        const remaining = fullAnswer.slice(maxLen);

        const answerEmbed = EmbedBuilderUtility.createAIAnswerEmbed({
          answer: firstChunk,
          model: response.model,
          responseTime: response.responseTime,
          user: message.author,
        });

        if (replyMsg) {
          await replyMsg.edit({ content: '', embeds: [answerEmbed] });
        } else {
          await message.reply({ embeds: [answerEmbed] });
        }

        const chunks = this.splitMessage(remaining, 1950);
        for (const chunk of chunks) {
          await message.channel.send({ content: chunk });
        }
      }
    } catch (error) {
      if (animTimer) clearInterval(animTimer);
      logger.error('[AskCommandHandler] Lỗi khi xử lý câu hỏi AI:', error);
      const errorEmbed = EmbedBuilderUtility.createAIErrorEmbed({
        errorMessage: error.message,
        user: message.author,
      });

      if (replyMsg) {
        await replyMsg.edit({ content: '', embeds: [errorEmbed] }).catch(() => {});
      } else {
        await message.reply({ embeds: [errorEmbed] }).catch(() => {});
      }
    }
  }

  /**
   * Xử lý Slash Command /ask
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async handleSlashCommand(interaction) {
    const isAiEnabled = guildSettingsService.isFeatureEnabled(interaction.guildId, 'ai');
    if (!isAiEnabled) {
      const embed = EmbedBuilderUtility.createWarningEmbed(
        'Tính Năng Đang Bị Tắt',
        '⚠️ Tính năng **Trợ lý AI (AI Assistant)** hiện đang bị tắt bởi Quản trị viên trên máy chủ này.\n\n' +
        '> Quản trị viên có thể bật lại bằng lệnh `/setup feature enable feature:ai` hoặc `!setup feature enable ai`.'
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

        const chunks = this.splitMessage(remaining, 1950);
        for (const chunk of chunks) {
          await interaction.followUp({ content: chunk });
        }
      }
    } catch (error) {
      if (animTimer) clearInterval(animTimer);
      logger.error('[AskCommandHandler] Lỗi khi xử lý /ask:', error);
      const errorEmbed = EmbedBuilderUtility.createAIErrorEmbed({
        errorMessage: error.message,
        user: interaction.user,
      });
      await interaction.editReply({ content: '', embeds: [errorEmbed] }).catch(() => {});
    }
  }
}

module.exports = new AskCommandHandler();
