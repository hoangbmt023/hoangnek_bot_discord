const GuildQueue = require('./GuildQueue');
const logger = require('../utils/logger');

/**
 * MusicManager
 * Quản lý các hàng đợi GuildQueue cho tất cả các Guild
 * Singleton pattern
 */
class MusicManager {
  constructor() {
    /** @type {Map<string, GuildQueue>} */
    this.queues = new Map();
  }

  /**
   * Lấy hàng đợi của Guild
   * @param {string} guildId
   * @returns {GuildQueue|undefined}
   */
  getQueue(guildId) {
    return this.queues.get(guildId);
  }

  /**
   * Kiểm tra Guild có hàng đợi đang hoạt động không
   * @param {string} guildId
   * @returns {boolean}
   */
  hasQueue(guildId) {
    return this.queues.has(guildId);
  }

  /**
   * Khởi tạo hoặc lấy hàng đợi cho Guild
   * @param {Object} options
   * @param {import('discord.js').Guild} options.guild
   * @param {import('discord.js').VoiceBasedChannel} options.voiceChannel
   * @param {import('discord.js').TextBasedChannel} options.textChannel
   * @returns {Promise<GuildQueue>}
   */
  async createQueue({ guild, voiceChannel, textChannel }) {
    let queue = this.queues.get(guild.id);

    if (queue) {
      // Cập nhật lại textChannel mới nhất nếu có thay đổi
      queue.textChannel = textChannel;
      return queue;
    }

    queue = new GuildQueue({
      guild,
      voiceChannel,
      textChannel,
      onDestroy: (guildId) => {
        this.queues.delete(guildId);
      },
    });

    await queue.init();
    this.queues.set(guild.id, queue);
    logger.info(`[MusicManager] Đã tạo mới hàng đợi phát nhạc cho Guild: ${guild.name} (${guild.id})`);
    return queue;
  }

  /**
   * Xóa hàng đợi của Guild
   * @param {string} guildId
   */
  deleteQueue(guildId) {
    const queue = this.queues.get(guildId);
    if (queue) {
      queue.destroy();
      this.queues.delete(guildId);
    }
  }
}

module.exports = new MusicManager();
