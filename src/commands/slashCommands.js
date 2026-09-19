const { SlashCommandBuilder, REST, Routes, PermissionFlagsBits } = require('discord.js');
const { config } = require('../config/env');
const logger = require('../utils/logger');

/**
 * Xây dựng cấu hình Slash Command cho /wl và /whitelist
 * @param {string} name
 */
function buildWhitelistCommand(name) {
  return new SlashCommandBuilder()
    .setName(name)
    .setDescription('Quản lý danh sách trắng (Whitelist) miễn trừ kiểm duyệt cho người dùng')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Thêm người dùng vào danh sách Whitelist cho một chức năng')
        .addStringOption((opt) =>
          opt
            .setName('feature')
            .setDescription('Chức năng được miễn trừ (ví dụ: toxic, all)')
            .setRequired(true)
            .addChoices(
              { name: 'Lọc ngôn từ độc hại (toxic)', value: 'toxic' },
              { name: 'Tất cả các tính năng (all)', value: 'all' }
            )
        )
        .addStringOption((opt) =>
          opt
            .setName('users')
            .setDescription('Tag @user hoặc ID, có thể nhập nhiều người dùng cách nhau bởi dấu phẩy (vd: @user1, @user2)')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Xóa người dùng khỏi danh sách Whitelist của một chức năng')
        .addStringOption((opt) =>
          opt
            .setName('feature')
            .setDescription('Chức năng cần xóa miễn trừ (ví dụ: toxic, all)')
            .setRequired(true)
            .addChoices(
              { name: 'Lọc ngôn từ độc hại (toxic)', value: 'toxic' },
              { name: 'Tất cả các tính năng (all)', value: 'all' }
            )
        )
        .addStringOption((opt) =>
          opt
            .setName('users')
            .setDescription('Tag @user hoặc ID cần xóa, có thể nhập nhiều người dùng cách nhau bởi dấu phẩy')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('Xem danh sách người dùng trong Whitelist')
        .addStringOption((opt) =>
          opt
            .setName('feature')
            .setDescription('Lọc theo chức năng (để trống để xem tất cả)')
            .setRequired(false)
            .addChoices(
              { name: 'Lọc ngôn từ độc hại (toxic)', value: 'toxic' },
              { name: 'Tất cả các tính năng (all)', value: 'all' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('clear')
        .setDescription('Xóa toàn bộ người dùng khỏi Whitelist của Server')
        .addStringOption((opt) =>
          opt
            .setName('feature')
            .setDescription('Chức năng cần xóa (để trống để xóa toàn bộ)')
            .setRequired(false)
            .addChoices(
              { name: 'Lọc ngôn từ độc hại (toxic)', value: 'toxic' },
              { name: 'Tất cả các tính năng (all)', value: 'all' }
            )
        )
    );
}

/**
 * Xây dựng cấu hình Slash Command cho /feature (Bật/Tắt tính năng của Bot)
 */
function buildFeatureCommand() {
  return new SlashCommandBuilder()
    .setName('feature')
    .setDescription('Bật hoặc tắt các tính năng của Bot trong Server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
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
              { name: 'Lọc ngôn từ độc hại & Hate Speech (moderation)', value: 'moderation' },
              { name: 'Thông báo Chào mừng thành viên mới (welcome)', value: 'welcome' },
              { name: 'Thông báo Tạm biệt thành viên (leave)', value: 'leave' },
              { name: 'Tất cả các tính năng (all)', value: 'all' }
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
              { name: 'Lọc ngôn từ độc hại & Hate Speech (moderation)', value: 'moderation' },
              { name: 'Thông báo Chào mừng thành viên mới (welcome)', value: 'welcome' },
              { name: 'Thông báo Tạm biệt thành viên (leave)', value: 'leave' },
              { name: 'Tất cả các tính năng (all)', value: 'all' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('Xem trạng thái các tính năng trong Server')
        .addStringOption((opt) =>
          opt
            .setName('filter')
            .setDescription('Bộ lọc trạng thái tính năng')
            .setRequired(false)
            .addChoices(
              { name: 'Tất cả tính năng (all)', value: 'all' },
              { name: 'Chỉ các tính năng ĐÃ BẬT (enabled)', value: 'enabled' },
              { name: 'Chỉ các tính năng ĐÃ TẮT (disabled)', value: 'disabled' }
            )
        )
    );
}

/**
 * Xây dựng cấu hình Slash Command cho /help (Hướng dẫn sử dụng theo từng chức năng)
 */
function buildHelpCommand() {
  return new SlashCommandBuilder()
    .setName('help')
    .setDescription('Xem hướng dẫn chi tiết về các tính năng và câu lệnh của Bot')
    .addStringOption((opt) =>
      opt
        .setName('feature')
        .setDescription('Chọn tính năng cần xem hướng dẫn cụ thể')
        .setRequired(false)
        .addChoices(
          { name: 'Tổng quan tất cả lệnh (all)', value: 'all' },
          { name: 'Hệ thống Phát nhạc (music)', value: 'music' },
          { name: 'Cấu hình Server & Kênh lệnh (setup)', value: 'setup' },
          { name: 'Danh sách trắng Whitelist (whitelist)', value: 'whitelist' },
          { name: 'Bật/Tắt tính năng Bot (feature)', value: 'feature' },
          { name: 'Hệ thống Lọc ngôn từ độc hại (moderation)', value: 'moderation' },
          { name: 'Thông báo Chào mừng & Tạm biệt (notifications)', value: 'notifications' }
        )
    );
}

/**
 * Xây dựng cấu hình Slash Command cho /setup với 3 Nhóm lệnh con (Subcommand Groups):
 * 1. /setup channel <add|remove|list|clear> [channel] [type]
 * 2. /setup whitelist <add|remove|list|clear> <feature> [users]
 * 3. /setup feature <enable|disable|status> <feature>
 */
function buildSetupCommand() {
  return new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Trung tâm cấu hình và quản lý các chức năng của Bot trong Server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    // 1. NHÓM CẤU HÌNH KÊNH (CHANNEL)
    .addSubcommandGroup((group) =>
      group
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
        )
    )
    // 2. NHÓM CẤU HÌNH WHITELIST (WHITELIST: Người dùng, Vai trò, Kênh)
    .addSubcommandGroup((group) =>
      group
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
        )
    )
    // 3. NHÓM BẬT/TẮT TÍNH NĂNG (FEATURE)
    .addSubcommandGroup((group) =>
      group
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
        )
    )
    // 4. NHÓM CẤU HÌNH THÔNG BÁO VÀO/RA (NOTIFY: Welcome & Leave)
    .addSubcommandGroup((group) =>
      group
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
            .setDescription('Đặt lại kênh thông báo về mặc định (Kênh hệ thống Server)')
            .addStringOption((opt) =>
              opt
                .setName('type')
                .setDescription('Loại thông báo cần đặt lại (mặc định tất cả)')
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
            .setDescription('Xem kênh thông báo Chào mừng & Tạm biệt hiện tại của Server')
        )
    );
}

/**
 * Xây dựng cấu hình Slash Command cho /music
 */
function buildMusicCommand() {
  return new SlashCommandBuilder()
    .setName('music')
    .setDescription('Điều khiển phát nhạc (YouTube, Spotify, Direct Audio)')
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub
        .setName('play')
        .setDescription('Phát nhạc hoặc thêm vào hàng đợi')
        .addStringOption((opt) =>
          opt
            .setName('query')
            .setDescription('Tên bài hát hoặc link (YouTube, Spotify, Direct Audio)')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('skip')
        .setDescription('Bỏ qua bài hát hiện tại')
    )
    .addSubcommand((sub) =>
      sub
        .setName('pause')
        .setDescription('Tạm dừng phát nhạc')
    )
    .addSubcommand((sub) =>
      sub
        .setName('resume')
        .setDescription('Tiếp tục phát bài hát đang tạm dừng')
    )
    .addSubcommand((sub) =>
      sub
        .setName('stop')
        .setDescription('Dừng phát và dọn sạch hàng đợi')
    )
    .addSubcommand((sub) =>
      sub
        .setName('queue')
        .setDescription('Xem danh sách bài hát trong hàng đợi')
        .addIntegerOption((opt) =>
          opt
            .setName('page')
            .setDescription('Số trang cần xem')
            .setRequired(false)
            .setMinValue(1)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('nowplaying')
        .setDescription('Xem thông tin bài hát đang phát')
    )
    .addSubcommand((sub) =>
      sub
        .setName('volume')
        .setDescription('Điều chỉnh âm lượng phát nhạc')
        .addIntegerOption((opt) =>
          opt
            .setName('level')
            .setDescription('Mức âm lượng từ 1 đến 100')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('loop')
        .setDescription('Cài đặt chế độ lặp lại')
        .addStringOption((opt) =>
          opt
            .setName('mode')
            .setDescription('Chế độ lặp lại')
            .setRequired(true)
            .addChoices(
              { name: 'Tắt lặp (off)', value: 'off' },
              { name: 'Lặp lại bài hiện tại (track)', value: 'track' },
              { name: 'Lặp lại toàn bộ hàng đợi (queue)', value: 'queue' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('leave')
        .setDescription('Ngắt kết nối bot khỏi kênh thoại')
    );
}

/**
 * Lấy mảng JSON dữ liệu các Slash Command (/setup, /music, /help)
 */
function getSlashCommandsData() {
  return [
    buildSetupCommand().toJSON(),
    buildMusicCommand().toJSON(),
    buildHelpCommand().toJSON(),
  ];
}

/**
/**
 * Đăng ký Slash Command Toàn Cầu (Global) cho tất cả Server Discord
 * Tự động xóa sạch Guild Commands cục bộ trên mọi server để chống trùng lặp lệnh (Double Slash Commands).
 * @param {import('discord.js').Client} client
 */
async function registerSlashCommands(client) {
  if (!client || !client.user) return;

  const commands = getSlashCommandsData();
  const rest = new REST({ version: '10' }).setToken(config.bot.token);

  try {
    logger.info(`[SlashCommands] Đang đồng bộ ${commands.length} Slash Command toàn cục (Global) cho tất cả Server...`);

    // 1. Dọn dẹp Guild Commands cũ trên Server test (nếu có cấu hình)
    if (config.bot.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, config.bot.guildId),
        { body: [] }
      ).catch(() => {});
    }

    // 2. Dọn dẹp Guild Commands cũ trên tất cả các server bot đang tham gia
    for (const [guildId] of client.guilds.cache) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, guildId),
        { body: [] }
      ).catch(() => {});
    }

    // 3. Đăng ký duy nhất 1 bộ Global Commands
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    logger.success(`[SlashCommands] Đã đồng bộ thành công ${commands.length} Slash Command toàn cục và dọn sạch các lệnh cục bộ cũ!`);
  } catch (error) {
    logger.error(`[SlashCommands] Lỗi khi đăng ký Slash Command:`, error);
  }
}

module.exports = {
  buildSetupCommand,
  buildMusicCommand,
  buildHelpCommand,
  getSlashCommandsData,
  registerSlashCommands,
};
