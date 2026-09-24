/**
 * Cấu hình nhóm lệnh /setup whitelist
 * @param {import('discord.js').SlashCommandSubcommandGroupBuilder} group
 */
function buildWhitelistSubcommands(group) {
  return group
    .setName('whitelist')
    .setDescription('Quản lý danh sách trắng (User, Role, Kênh) miễn trừ kiểm duyệt ngôn từ')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Thêm Người dùng, Vai trò (Role) hoặc Kênh vào danh sách Whitelist')
        .addStringOption((opt) =>
          opt
            .setName('target')
            .setDescription('Chọn loại đối tượng cần thêm vào Whitelist')
            .setRequired(true)
            .addChoices(
              { name: 'Người dùng (User)', value: 'users' },
              { name: 'Vai trò (Role)', value: 'roles' },
              { name: 'Kênh văn bản (Channel)', value: 'channels' }
            )
        )
        .addStringOption((opt) =>
          opt
            .setName('value')
            .setDescription('Tag @user, @role, #channel hoặc ID (phân cách bằng dấu phẩy)')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Xóa Người dùng, Vai trò (Role) hoặc Kênh khỏi danh sách Whitelist')
        .addStringOption((opt) =>
          opt
            .setName('target')
            .setDescription('Chọn loại đối tượng cần xóa')
            .setRequired(true)
            .addChoices(
              { name: 'Người dùng (User)', value: 'users' },
              { name: 'Vai trò (Role)', value: 'roles' },
              { name: 'Kênh văn bản (Channel)', value: 'channels' }
            )
        )
        .addStringOption((opt) =>
          opt
            .setName('value')
            .setDescription('Tag hoặc ID cần xóa khỏi danh sách (phân cách bằng dấu phẩy)')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('Xem danh sách Whitelist (Người dùng, Vai trò, Kênh)')
        .addStringOption((opt) =>
          opt
            .setName('target')
            .setDescription('Lọc theo loại đối tượng (để trống để xem tất cả)')
            .setRequired(false)
            .addChoices(
              { name: 'Tất cả đối tượng (all)', value: 'all' },
              { name: 'Người dùng (users)', value: 'users' },
              { name: 'Vai trò (roles)', value: 'roles' },
              { name: 'Kênh văn bản (channels)', value: 'channels' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('clear')
        .setDescription('Dọn dẹp danh sách Whitelist trong Server')
        .addStringOption((opt) =>
          opt
            .setName('target')
            .setDescription('Chọn loại đối tượng cần xóa (để trống xóa tất cả)')
            .setRequired(false)
            .addChoices(
              { name: 'Tất cả đối tượng (all)', value: 'all' },
              { name: 'Chỉ Người dùng (users)', value: 'users' },
              { name: 'Chỉ Vai trò (roles)', value: 'roles' },
              { name: 'Chỉ Kênh văn bản (channels)', value: 'channels' }
            )
        )
    );
}

module.exports = { buildWhitelistSubcommands };
