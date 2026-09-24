const { EmbedBuilder } = require('discord.js');

/**
 * Tạo Embed thông báo bật/tắt hoặc xem trạng thái tính năng của Bot
 * @param {object} params
 * @param {string} params.title
 * @param {string} params.description
 * @param {boolean} [params.enabled=true]
 * @param {boolean} [params.isStatusList=false]
 * @returns {EmbedBuilder}
 */
function createFeatureToggleResponseEmbed({ title, description, enabled = true, isStatusList = false }) {
  const color = isStatusList || enabled ? 0x5865f2 : 0xed4245;

  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: 'HỆ THỐNG CẤU HÌNH • TÍNH NĂNG BOT',
    })
    .setTitle(title)
    .setDescription(description)
    .setFooter({
      text: 'Hoangnek Bot • Cài Đặt Server',
    })
    .setTimestamp();
}

/**
 * Tạo Embed thông báo kết quả cài đặt Model AI
 * @param {object} params
 * @param {string} params.title
 * @param {string} params.description
 * @param {boolean} [params.success=true]
 * @param {boolean} [params.isDestructive=false]
 * @returns {EmbedBuilder}
 */
function createAISetupResponseEmbed({ title, description, success = true, isDestructive = false }) {
  const color = !success ? 0xed4245 : isDestructive ? 0xf59e0b : 0x5865f2;

  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: 'HỆ THỐNG CẤU HÌNH • AI ASSISTANT',
    })
    .setTitle(title)
    .setDescription(description)
    .setFooter({
      text: 'Hoangnek Bot • Cấu Hình Model AI',
    })
    .setTimestamp();
}

/**
 * Tạo Embed thông báo kết quả cấu hình dữ liệu Server cho AI (Knowledge)
 * @param {object} params
 * @param {string} params.title
 * @param {string} params.description
 * @param {boolean} [params.success=true]
 * @param {boolean} [params.isDestructive=false]
 * @returns {EmbedBuilder}
 */
function createKnowledgeSetupResponseEmbed({ title, description, success = true, isDestructive = false }) {
  const color = !success ? 0xed4245 : isDestructive ? 0xf59e0b : 0x5865f2;

  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: 'HỆ THỐNG CẤU HÌNH • DỮ LIỆU SERVER (KNOWLEDGE)',
    })
    .setTitle(title)
    .setDescription(description)
    .setFooter({
      text: 'Hoangnek Bot • Cấu Hình Dữ Liệu AI',
    })
    .setTimestamp();
}

/**
 * Tạo Embed thông báo kết quả cấu hình kênh (/setup channel)
 * @param {object} params
 * @param {string} params.title
 * @param {string} params.description
 * @param {boolean} [params.success=true]
 * @param {boolean} [params.isDestructive=false]
 * @returns {EmbedBuilder}
 */
function createChannelSetupResponseEmbed({ title, description, success = true, isDestructive = false }) {
  const color = !success || isDestructive ? 0xed4245 : 0x5865f2;

  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: 'HỆ THỐNG CẤU HÌNH KÊNH • SETUP',
    })
    .setTitle(title)
    .setDescription(description)
    .setFooter({
      text: 'Hoangnek Bot • Cấu hình phân quyền kênh',
    })
    .setTimestamp();
}

/**
 * Tạo Embed thông báo kết quả cấu hình kênh thông báo (/setup notify)
 * @param {object} params
 * @param {string} params.title
 * @param {string} params.description
 * @param {boolean} [params.success=true]
 * @param {boolean} [params.isDestructive=false]
 * @returns {EmbedBuilder}
 */
function createNotificationSetupResponseEmbed({ title, description, success = true, isDestructive = false }) {
  const color = !success || isDestructive ? 0xed4245 : 0x5865f2;

  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: 'HỆ THỐNG CẤU HÌNH THÔNG BÁO • SETUP NOTIFY',
    })
    .setTitle(title)
    .setDescription(description)
    .setFooter({
      text: 'Hoangnek Bot • Thông báo Chào mừng & Tạm biệt',
    })
    .setTimestamp();
}

module.exports = {
  createFeatureToggleResponseEmbed,
  createAISetupResponseEmbed,
  createKnowledgeSetupResponseEmbed,
  createChannelSetupResponseEmbed,
  createNotificationSetupResponseEmbed,
};
