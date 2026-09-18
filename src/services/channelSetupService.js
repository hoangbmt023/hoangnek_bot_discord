const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * ChannelSetupService
 * Quản lý danh sách các kênh văn bản được phép sử dụng lệnh Bot (đặc biệt là lệnh Music).
 * Mặc định: Nếu chưa cấu hình, không có kênh nào được phép sử dụng lệnh nhạc (ngoại trừ lệnh /setup bởi Admin).
 */
class ChannelSetupService {
  constructor() {
    // Map<guildId, { music: Set<channelId>, commands: Set<channelId> }>
    this.guildChannels = new Map();
    this.storagePath = path.resolve(process.cwd(), 'data', 'channel_setup.json');
    this.loadFromDisk();
  }

  /**
   * Đọc cấu hình từ file JSON
   */
  loadFromDisk() {
    try {
      const dataDir = path.dirname(this.storagePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        const parsed = JSON.parse(raw);

        for (const [guildId, config] of Object.entries(parsed)) {
          this.guildChannels.set(guildId, {
            music: new Set(config.music || []),
            commands: new Set(config.commands || []),
          });
        }
        logger.info('[ChannelSetup] Đã nạp danh sách kênh cho phép từ bộ nhớ.');
      }
    } catch (error) {
      logger.warn(`[ChannelSetup] Lỗi khi nạp file channel_setup.json: ${error.message}`);
    }
  }

  /**
   * Lưu cấu hình vào file JSON
   */
  saveToDisk() {
    try {
      const exportData = {};
      for (const [guildId, config] of this.guildChannels.entries()) {
        exportData[guildId] = {
          music: Array.from(config.music),
          commands: Array.from(config.commands),
        };
      }
      fs.writeFileSync(this.storagePath, JSON.stringify(exportData, null, 2), 'utf8');
    } catch (error) {
      logger.error('[ChannelSetup] Lỗi khi lưu file channel_setup.json:', error);
    }
  }

  /**
   * Lấy hoặc khởi tạo cấu hình cho Guild
   * @param {string} guildId
   * @returns {{ music: Set<string>, commands: Set<string> }}
   */
  getGuildConfig(guildId) {
    if (!this.guildChannels.has(guildId)) {
      this.guildChannels.set(guildId, {
        music: new Set(),
        commands: new Set(),
      });
    }
    return this.guildChannels.get(guildId);
  }

  /**
   * Chuẩn hóa loại kênh (music | commands | all)
   * @param {string} type
   * @returns {string}
   */
  normalizeType(type = 'music') {
    const t = String(type).toLowerCase().trim();
    if (t === 'music' || t === 'nhac' || t === 'audio') return 'music';
    if (t === 'commands' || t === 'cmd' || t === 'lenh') return 'commands';
    if (t === 'all' || t === 'tatca') return 'all';
    return 'music';
  }

  /**
   * Thêm kênh vào danh sách cho phép
   * @param {string} guildId
   * @param {string} channelId
   * @param {string} type
   * @returns {{ added: boolean, type: string }}
   */
  addChannel(guildId, channelId, type = 'music') {
    const normType = this.normalizeType(type);
    const config = this.getGuildConfig(guildId);
    let added = false;

    if (normType === 'all') {
      const addMusic = !config.music.has(channelId);
      const addCmd = !config.commands.has(channelId);
      config.music.add(channelId);
      config.commands.add(channelId);
      added = addMusic || addCmd;
    } else {
      if (!config[normType].has(channelId)) {
        config[normType].add(channelId);
        added = true;
      }
    }

    if (added) {
      this.saveToDisk();
      logger.info(`[ChannelSetup] Guild ${guildId}: Đã thêm kênh ${channelId} vào danh sách [${normType}]`);
    }

    return { added, type: normType };
  }

  /**
   * Xóa kênh khỏi danh sách cho phép
   * @param {string} guildId
   * @param {string} channelId
   * @param {string} type
   * @returns {{ removed: boolean, type: string }}
   */
  removeChannel(guildId, channelId, type = 'music') {
    const normType = this.normalizeType(type);
    const config = this.getGuildConfig(guildId);
    let removed = false;

    if (normType === 'all') {
      const remMusic = config.music.delete(channelId);
      const remCmd = config.commands.delete(channelId);
      removed = remMusic || remCmd;
    } else {
      removed = config[normType].delete(channelId);
    }

    if (removed) {
      this.saveToDisk();
      logger.info(`[ChannelSetup] Guild ${guildId}: Đã xóa kênh ${channelId} khỏi danh sách [${normType}]`);
    }

    return { removed, type: normType };
  }

  /**
   * Xóa toàn bộ cấu hình kênh của Guild
   * @param {string} guildId
   * @param {string} type
   */
  clearChannels(guildId, type = 'all') {
    const normType = this.normalizeType(type);
    const config = this.getGuildConfig(guildId);

    if (normType === 'all') {
      config.music.clear();
      config.commands.clear();
    } else {
      config[normType].clear();
    }

    this.saveToDisk();
    logger.info(`[ChannelSetup] Guild ${guildId}: Đã dọn dẹp danh sách kênh [${normType}]`);
  }

  /**
   * Lấy danh sách các channelId được phép theo loại
   * @param {string} guildId
   * @param {string} type
   * @returns {string[]}
   */
  getAllowedChannels(guildId, type = 'music') {
    const normType = this.normalizeType(type);
    const config = this.getGuildConfig(guildId);

    if (normType === 'all') {
      const union = new Set([...config.music, ...config.commands]);
      return Array.from(union);
    }
    return Array.from(config[normType] || []);
  }

  /**
   * Kiểm tra xem kênh có được phép thực thi lệnh không
   * Mặc định: Nếu chưa cấu hình bất kỳ kênh nào, chặn và yêu cầu Admin cấu hình trước qua /setup
   * @param {string} guildId
   * @param {string} channelId
   * @param {string} type
   * @returns {{ allowed: boolean, reason?: 'NO_CHANNELS_CONFIGURED' | 'CHANNEL_NOT_ALLOWED', configuredChannels: string[] }}
   */
  isChannelAllowed(guildId, channelId, type = 'music') {
    const normType = this.normalizeType(type);
    const allowedList = this.getAllowedChannels(guildId, normType);

    if (allowedList.length === 0) {
      return {
        allowed: false,
        reason: 'NO_CHANNELS_CONFIGURED',
        configuredChannels: [],
      };
    }

    if (allowedList.includes(channelId)) {
      return {
        allowed: true,
        configuredChannels: allowedList,
      };
    }

    return {
      allowed: false,
      reason: 'CHANNEL_NOT_ALLOWED',
      configuredChannels: allowedList,
    };
  }
}

module.exports = new ChannelSetupService();
