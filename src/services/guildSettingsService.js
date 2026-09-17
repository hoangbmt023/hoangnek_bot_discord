const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Danh mục tính năng có thể bật/tắt trong bot
 */
const DEFAULT_FEATURES = {
  moderation: {
    name: 'Lọc ngôn từ độc hại & Hate Speech',
    description: 'Tự động phát hiện và xử lý tin nhắn xúc phạm, thù ghét',
    defaultState: true,
  },
  welcome: {
    name: 'Thông báo Chào mừng thành viên mới',
    description: 'Gửi thiệp chào mừng khi có thành viên mới vào Server',
    defaultState: true,
  },
  leave: {
    name: 'Thông báo Tạm biệt thành viên rời đi',
    description: 'Gửi thông báo khi có thành viên rời khỏi Server',
    defaultState: true,
  },
};

/**
 * GuildSettingsService
 * Quản lý bật/tắt các tính năng theo từng Server (Guild)
 * Tuân thủ Single Responsibility Principle (SRP)
 */
class GuildSettingsService {
  constructor() {
    // Map lưu trữ: Map<guildId, Map<featureKey, boolean>>
    this.settings = new Map();
    this.storagePath = path.resolve(process.cwd(), 'data', 'guild_settings.json');
    this.loadFromDisk();
  }

  /**
   * Chuẩn hóa tên tính năng
   * @param {string} [feature]
   * @returns {string|null}
   */
  normalizeFeature(feature) {
    if (!feature || typeof feature !== 'string') return null;
    const cleaned = feature.replace(/[<>]/g, '').trim().toLowerCase();

    if (cleaned === 'all' || cleaned === 'tat_ca' || cleaned === 'tatca') {
      return 'all';
    }
    if (cleaned === 'moderation' || cleaned === 'toxic' || cleaned === 'loc_ngon_tu' || cleaned === 'kiem_duyet') {
      return 'moderation';
    }
    if (cleaned === 'welcome' || cleaned === 'chao_mung' || cleaned === 'join') {
      return 'welcome';
    }
    if (cleaned === 'leave' || cleaned === 'tam_biet' || cleaned === 'roi_di') {
      return 'leave';
    }

    return DEFAULT_FEATURES[cleaned] ? cleaned : null;
  }

  /**
   * Lấy thông tin hiển thị của tính năng
   * @param {string} feature
   * @returns {{ name: string, description: string }}
   */
  getFeatureMeta(feature) {
    const key = this.normalizeFeature(feature);
    if (key === 'all') {
      return { name: 'Tất cả các tính năng', description: 'Áp dụng cho toàn bộ tính năng của Bot' };
    }
    return DEFAULT_FEATURES[key] || { name: feature, description: 'Tính năng tùy chỉnh' };
  }

  /**
   * Tải dữ liệu cài đặt từ file JSON
   */
  loadFromDisk() {
    try {
      const dataDir = path.dirname(this.storagePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.storagePath)) {
        const rawData = fs.readFileSync(this.storagePath, 'utf8');
        const parsed = JSON.parse(rawData);

        for (const [guildId, guildSettings] of Object.entries(parsed)) {
          const map = new Map();
          for (const [feat, state] of Object.entries(guildSettings)) {
            map.set(feat, Boolean(state));
          }
          this.settings.set(guildId, map);
        }
        logger.info('[Settings] Đã nạp cấu hình tính năng các Guild từ bộ nhớ.');
      }
    } catch (error) {
      logger.warn(`[Settings] Không thể nạp file guild_settings.json: ${error.message}`);
    }
  }

  /**
   * Lưu dữ liệu cài đặt vào file JSON
   */
  saveToDisk() {
    try {
      const exportData = {};
      for (const [guildId, featMap] of this.settings.entries()) {
        exportData[guildId] = {};
        for (const [feat, state] of featMap.entries()) {
          exportData[guildId][feat] = state;
        }
      }

      fs.writeFileSync(this.storagePath, JSON.stringify(exportData, null, 2), 'utf8');
    } catch (error) {
      logger.error('[Settings] Lỗi khi lưu file guild_settings.json:', error);
    }
  }

  /**
   * Lấy Map cài đặt của Guild
   * @param {string} guildId
   * @returns {Map<string, boolean>}
   */
  getGuildMap(guildId) {
    if (!this.settings.has(guildId)) {
      this.settings.set(guildId, new Map());
    }
    return this.settings.get(guildId);
  }

  /**
   * Kiểm tra một tính năng có đang được BẬT hay không
   * @param {string} guildId
   * @param {string} feature
   * @returns {boolean}
   */
  isFeatureEnabled(guildId, feature) {
    if (!guildId) return true;
    const normKey = this.normalizeFeature(feature);
    if (!normKey || normKey === 'all') return true;

    const guildMap = this.getGuildMap(guildId);
    if (guildMap.has(normKey)) {
      return guildMap.get(normKey);
    }

    // Mặc định là true nếu chưa cấu hình
    return DEFAULT_FEATURES[normKey] ? DEFAULT_FEATURES[normKey].defaultState : true;
  }

  /**
   * Bật hoặc Tắt tính năng
   * @param {string} guildId
   * @param {string} feature
   * @param {boolean} enabled
   * @returns {{ success: boolean, feature: string, featureName: string, enabled: boolean }}
   */
  setFeatureState(guildId, feature, enabled) {
    const normKey = this.normalizeFeature(feature);
    if (!normKey) {
      return { success: false, feature, featureName: feature, enabled };
    }

    const guildMap = this.getGuildMap(guildId);

    if (normKey === 'all') {
      for (const feat of Object.keys(DEFAULT_FEATURES)) {
        guildMap.set(feat, enabled);
      }
    } else {
      guildMap.set(normKey, enabled);
    }

    this.saveToDisk();
    logger.info(`[Settings] Guild ${guildId}: Đã ${enabled ? 'BẬT' : 'TẮT'} tính năng [${normKey}]`);

    const meta = this.getFeatureMeta(normKey);
    return {
      success: true,
      feature: normKey,
      featureName: meta.name,
      enabled,
    };
  }

  /**
   * Đảo ngược trạng thái bật/tắt của tính năng
   * @param {string} guildId
   * @param {string} feature
   * @returns {{ success: boolean, feature: string, featureName: string, enabled: boolean }}
   */
  toggleFeature(guildId, feature) {
    const currentState = this.isFeatureEnabled(guildId, feature);
    return this.setFeatureState(guildId, feature, !currentState);
  }

  /**
   * Lấy toàn bộ trạng thái tính năng của Guild
   * @param {string} guildId
   * @returns {Array<{ key: string, name: string, description: string, enabled: boolean }>}
   */
  getAllFeatureStates(guildId) {
    const result = [];
    for (const [key, meta] of Object.entries(DEFAULT_FEATURES)) {
      const enabled = this.isFeatureEnabled(guildId, key);
      result.push({
        key,
        name: meta.name,
        description: meta.description,
        enabled,
      });
    }
    return result;
  }
}

module.exports = new GuildSettingsService();
