const { SlashCommandBuilder, InteractionContextType } = require('discord.js');

/**
 * Xây dựng cấu hình Slash Command cho /ask (Hỏi đáp AI Assistant)
 */
function buildAskCommand() {
  return new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Hỏi đáp với AI Assistant về kiến thức chung hoặc thông tin Server')
    .setContexts([InteractionContextType.Guild])
    .addStringOption((opt) =>
      opt
        .setName('question')
        .setDescription('Nội dung câu hỏi bạn muốn gửi tới AI Assistant')
        .setRequired(true)
    );
}

module.exports = { buildAskCommand };
