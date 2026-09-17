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
          { name: 'Danh sách trắng Whitelist (whitelist)', value: 'whitelist' },
          { name: 'Bật/Tắt tính năng Bot (feature)', value: 'feature' },
          { name: 'Hệ thống Lọc ngôn từ độc hại (moderation)', value: 'moderation' },
          { name: 'Thông báo Chào mừng & Tạm biệt (notifications)', value: 'notifications' }
        )
    );
}

/**
 * Lấy mảng JSON dữ liệu các Slash Command (/wl, /feature, /help)
 */
function getSlashCommandsData() {
  return [
    buildWhitelistCommand('wl').toJSON(),
    buildFeatureCommand().toJSON(),
    buildHelpCommand().toJSON(),
  ];
}

/**
 * Đăng ký Slash Command với Discord API
 * @param {import('discord.js').Client} client
 */
async function registerSlashCommands(client) {
  if (!client || !client.user) return;

  const commands = getSlashCommandsData();
  const rest = new REST({ version: '10' }).setToken(config.bot.token);

  try {
    logger.info(`[SlashCommands] Đang đăng ký ${commands.length} lệnh Slash Command lên Discord...`);

    // 1. Đăng ký toàn cục (Global)
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    logger.success(`[SlashCommands] Đã đăng ký thành công Slash Command toàn cục!`);

    // 2. Nếu có cấu hình GUILD_ID trong môi trường dev, đăng ký trực tiếp vào Guild để cập nhật tức thì
    if (config.bot.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, config.bot.guildId),
        { body: commands }
      );
      logger.info(`[SlashCommands] Đã đồng bộ tức thì Slash Command cho Guild ID: ${config.bot.guildId}`);
    }
  } catch (error) {
    logger.error(`[SlashCommands] Lỗi khi đăng ký Slash Command:`, error);
  }
}

module.exports = {
  buildWhitelistCommand,
  getSlashCommandsData,
  registerSlashCommands,
};
