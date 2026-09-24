const { SlashCommandBuilder, InteractionContextType } = require('discord.js');

/**
 * Xây dựng cấu hình Slash Command cho /help (Hướng dẫn sử dụng)
 */
function buildHelpCommand() {
  return new SlashCommandBuilder()
    .setName('help')
    .setDescription('Xem hướng dẫn chi tiết về các tính năng và câu lệnh của Bot')
    .setContexts([InteractionContextType.Guild])
    .addStringOption((opt) =>
      opt
        .setName('feature')
        .setDescription('Chọn tính năng cần xem hướng dẫn cụ thể')
        .setRequired(false)
        .addChoices(
          { name: 'Tổng quan tất cả lệnh (all)', value: 'all' },
          { name: 'Trợ lý AI Assistant (ai)', value: 'ai' },
          { name: 'Hệ thống Phát nhạc (music)', value: 'music' },
          { name: 'Trung tâm Cấu hình Hệ thống (setup)', value: 'setup' },
          { name: 'Tri thức Server cho AI (knowledge)', value: 'knowledge' },
          { name: 'Danh sách trắng Whitelist (whitelist)', value: 'whitelist' },
          { name: 'Bật/Tắt tính năng Bot (feature)', value: 'feature' },
          { name: 'Hệ thống Lọc ngôn từ độc hại (moderation)', value: 'moderation' },
          { name: 'Thông báo Chào mừng & Tạm biệt (notifications)', value: 'notifications' }
        )
    );
}

module.exports = { buildHelpCommand };
