/**
 * Cấu hình nhóm lệnh /setup feature
 * @param {import('discord.js').SlashCommandSubcommandGroupBuilder} group
 */
function buildFeatureSubcommands(group) {
  return group
    .setName('feature')
    .setDescription('Bật hoặc tắt các tính năng của Bot')
    .addSubcommand((sub) =>
      sub
        .setName('enable')
        .setDescription('Bật một tính năng của Bot')
        .addStringOption((opt) =>
          opt
            .setName('feature')
            .setDescription('Tính năng cần bật')
            .setRequired(true)
            .addChoices(
              { name: 'Lọc ngôn từ độc hại (moderation)', value: 'moderation' },
              { name: 'Thông báo Chào mừng thành viên (welcome)', value: 'welcome' },
              { name: 'Thông báo Tạm biệt thành viên (leave)', value: 'leave' },
              { name: 'Trợ lý AI Assistant (ai)', value: 'ai' },
              { name: 'Hệ thống Phát nhạc (music)', value: 'music' },
              { name: 'Tất cả tính năng (all)', value: 'all' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('disable')
        .setDescription('Tắt một tính năng của Bot')
        .addStringOption((opt) =>
          opt
            .setName('feature')
            .setDescription('Tính năng cần tắt')
            .setRequired(true)
            .addChoices(
              { name: 'Lọc ngôn từ độc hại (moderation)', value: 'moderation' },
              { name: 'Thông báo Chào mừng thành viên (welcome)', value: 'welcome' },
              { name: 'Thông báo Tạm biệt thành viên (leave)', value: 'leave' },
              { name: 'Trợ lý AI Assistant (ai)', value: 'ai' },
              { name: 'Hệ thống Phát nhạc (music)', value: 'music' },
              { name: 'Tất cả tính năng (all)', value: 'all' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('Xem trạng thái BẬT/TẮT của các tính năng')
        .addStringOption((opt) =>
          opt
            .setName('feature')
            .setDescription('Chọn tính năng cụ thể để xem (mặc định xem tất cả)')
            .setRequired(false)
            .addChoices(
              { name: 'Lọc ngôn từ độc hại (moderation)', value: 'moderation' },
              { name: 'Thông báo Chào mừng thành viên (welcome)', value: 'welcome' },
              { name: 'Thông báo Tạm biệt thành viên (leave)', value: 'leave' },
              { name: 'Tất cả tính năng (all)', value: 'all' }
            )
        )
    );
}

module.exports = { buildFeatureSubcommands };
