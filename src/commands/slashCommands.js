const { REST, Routes } = require('discord.js');
const { config } = require('../config/env');
const logger = require('../utils/logger');
const { buildSetupCommand } = require('./builders/setupCommandBuilder');
const { buildMusicCommand } = require('./builders/musicCommandBuilder');
const { buildHelpCommand } = require('./builders/helpCommandBuilder');
const { buildAskCommand } = require('./builders/askCommandBuilder');

/**
 * Lấy mảng JSON dữ liệu các Slash Command (/setup, /music, /help, /ask)
 */
function getSlashCommandsData() {
  return [
    buildSetupCommand().toJSON(),
    buildMusicCommand().toJSON(),
    buildHelpCommand().toJSON(),
    buildAskCommand().toJSON(),
  ];
}

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
  buildAskCommand,
  getSlashCommandsData,
  registerSlashCommands,
};
