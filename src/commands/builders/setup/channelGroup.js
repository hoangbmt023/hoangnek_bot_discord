/**
 * Cấu hình nhóm lệnh /setup channel
 * @param {import('discord.js').SlashCommandSubcommandGroupBuilder} group
 */
function buildChannelSubcommands(group) {
  return group
    .setName('channel')
    .setDescription('Quản lý phân quyền kênh cho phép bot hoạt động')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Thêm kênh cho phép sử dụng lệnh Bot & Phát nhạc')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Chọn kênh cần cấp phép')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Xóa kênh khỏi danh sách được phép dùng lệnh')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Chọn kênh cần xóa quyền')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('Xem danh sách các kênh đang được cấp phép')
    )
    .addSubcommand((sub) =>
      sub
        .setName('clear')
        .setDescription('Xóa toàn bộ phân quyền kênh (khóa lệnh toàn server cho đến khi thêm lại)')
    );
}

module.exports = { buildChannelSubcommands };
