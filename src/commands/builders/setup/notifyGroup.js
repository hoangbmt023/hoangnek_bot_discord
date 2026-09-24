/**
 * Cấu hình nhóm lệnh /setup notify
 * @param {import('discord.js').SlashCommandSubcommandGroupBuilder} group
 */
function buildNotifySubcommands(group) {
  return group
    .setName('notify')
    .setDescription('Cấu hình kênh nhận thông báo Chào mừng và Tạm biệt')
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Chỉ định kênh nhận thông báo thành viên vào/ra Server')
        .addStringOption((opt) =>
          opt
            .setName('type')
            .setDescription('Loại thông báo cần cấu hình')
            .setRequired(true)
            .addChoices(
              { name: 'Chào mừng thành viên mới (welcome)', value: 'welcome' },
              { name: 'Tạm biệt thành viên rời đi (leave)', value: 'leave' },
              { name: 'Cả Chào mừng & Tạm biệt (all)', value: 'all' }
            )
        )
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Chọn kênh văn bản nhận thông báo')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('Đặt lại kênh thông báo về kênh hệ thống mặc định của Server')
        .addStringOption((opt) =>
          opt
            .setName('type')
            .setDescription('Loại thông báo cần đặt lại')
            .setRequired(false)
            .addChoices(
              { name: 'Tất cả thông báo (all)', value: 'all' },
              { name: 'Chỉ Chào mừng (welcome)', value: 'welcome' },
              { name: 'Chỉ Tạm biệt (leave)', value: 'leave' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('Xem trạng thái các kênh thông báo hiện tại của Server')
    );
}

module.exports = { buildNotifySubcommands };
