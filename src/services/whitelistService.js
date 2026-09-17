const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Danh sách các tính năng được hỗ trợ Whitelist
 */
const SUPPORTED_FEATURES = {
  toxic: 'Lọc ngôn từ độc hại & Hate Speech',
  all: 'Tất cả các tính năng',
};

/**
 * WhitelistService
 * Quản lý danh sách người dùng được miễn trừ kiểm duyệt (Whitelist) theo từng chức năng
 * Tuân thủ Single Responsibility Principle (SRP)
 */
class WhitelistService {
  constructor() {
    // Map lưu trữ: Map<guildId, Map<feature, Set<userId>>>
    this.whitelist = new Map();
    this.storagePath = path.resolve(process.cwd(), 'data', 'whitelist.json');
    this.loadFromDisk();
  }

  /**
   * Chuẩn hóa tên tính năng
   * @param {string} [feature]
   * @returns {string} 'toxic' hoặc 'all'
   */
  normalizeFeature(feature) {
    if (!feature || typeof feature !== 'string') return 'toxic';
    const cleaned = feature.replace(/[<>]/g, '').trim().toLowerCase();
    if (cleaned === 'all' || cleaned === 'tat_ca' || cleaned === 'tatca' || cleaned === 'toan_bo') {
      return 'all';
    }
    return 'toxic';
  }

  /**
   * Lấy tên hiển thị tiếng Việt của tính năng
   * @param {string} feature
   * @returns {string}
   */
  getFeatureDisplayName(feature) {
    const key = this.normalizeFeature(feature);
    return SUPPORTED_FEATURES[key] || SUPPORTED_FEATURES.toxic;
  }

  /**
   * Trích xuất toàn bộ User ID từ chuỗi văn bản (hỗ trợ tag @user, ID số, phân tách bằng dấu phẩy)
   * @param {string|string[]} input
   * @returns {string[]} Danh sách User ID duy nhất
   */
  extractUserIds(input) {
    if (!input) return [];
    if (Array.isArray(input)) {
      return Array.from(new Set(input.flatMap((item) => this.extractUserIds(item))));
    }

    if (typeof input !== 'string') return [];

    // Tìm tất cả các chuỗi ID số của Discord (thường từ 17-20 chữ số)
    const matches = input.match(/\d{17,20}/g);
    if (!matches) return [];

    return Array.from(new Set(matches));
  }

  /**
   * Đọc dữ liệu whitelist đã lưu từ file JSON (nếu có)
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

        for (const [guildId, guildData] of Object.entries(parsed)) {
          const featureMap = new Map();

          // Hỗ trợ tương thích ngược nếu guildData là array cũ
          if (Array.isArray(guildData)) {
            featureMap.set('toxic', new Set(guildData));
          } else if (typeof guildData === 'object' && guildData !== null) {
            for (const [feat, userIds] of Object.entries(guildData)) {
              featureMap.set(feat, new Set(Array.isArray(userIds) ? userIds : []));
            }
          }

          this.whitelist.set(guildId, featureMap);
        }
        logger.info(`[Whitelist] Đã tải danh sách Whitelist từ bộ nhớ lưu trữ.`);
      }
    } catch (error) {
      logger.warn(`[Whitelist] Không thể nạp file whitelist.json: ${error.message}`);
    }
  }

  /**
   * Lưu dữ liệu whitelist vào file JSON
   */
  saveToDisk() {
    try {
      const exportData = {};
      for (const [guildId, featureMap] of this.whitelist.entries()) {
        exportData[guildId] = {};
        for (const [feat, userSet] of featureMap.entries()) {
          if (userSet.size > 0) {
            exportData[guildId][feat] = Array.from(userSet);
          }
        }
      }

      fs.writeFileSync(this.storagePath, JSON.stringify(exportData, null, 2), 'utf8');
    } catch (error) {
      logger.error(`[Whitelist] Lỗi khi lưu file whitelist.json:`, error);
    }
  }

  /**
   * Lấy Map tính năng của 1 guild
   * @param {string} guildId
   * @returns {Map<string, Set<string>>}
   */
  getGuildMap(guildId) {
    if (!this.whitelist.has(guildId)) {
      this.whitelist.set(guildId, new Map());
    }
    return this.whitelist.get(guildId);
  }

  /**
   * Lấy Set user theo từng tính năng của 1 guild
   * @param {string} guildId
   * @param {string} feature
   * @returns {Set<string>}
   */
  getFeatureSet(guildId, feature = 'toxic') {
    const normFeature = this.normalizeFeature(feature);
    const guildMap = this.getGuildMap(guildId);
    if (!guildMap.has(normFeature)) {
      guildMap.set(normFeature, new Set());
    }
    return guildMap.get(normFeature);
  }

  /**
   * Kiểm tra người dùng có nằm trong Whitelist của tính năng không
   * @param {string} guildId
   * @param {string} userId
   * @param {string} [feature='toxic']
   * @returns {boolean}
   */
  isWhitelisted(guildId, userId, feature = 'toxic') {
    if (!guildId || !userId) return false;
    const normFeature = this.normalizeFeature(feature);
    const guildMap = this.getGuildMap(guildId);

    // Nếu nằm trong danh sách 'all' (tất cả tính năng) hoặc nằm trong tính năng cụ thể
    const allSet = guildMap.get('all');
    if (allSet && allSet.has(userId)) return true;

    const featSet = guildMap.get(normFeature);
    if (featSet && featSet.has(userId)) return true;

    return false;
  }

  /**
   * Thêm 1 người dùng vào danh sách Whitelist của một tính năng
   * @param {string} guildId
   * @param {string} userId
   * @param {string} [feature='toxic']
   * @returns {boolean}
   */
  addUser(guildId, userId, feature = 'toxic') {
    const res = this.addUsers(guildId, [userId], feature);
    return res.added.length > 0;
  }

  /**
   * Thêm nhiều người dùng vào danh sách Whitelist của một tính năng
   * @param {string} guildId
   * @param {string|string[]} usersInput
   * @param {string} [feature='toxic']
   * @returns {{ feature: string, featureName: string, added: string[], alreadyExists: string[] }}
   */
  addUsers(guildId, usersInput, feature = 'toxic') {
    const normFeature = this.normalizeFeature(feature);
    const userIds = this.extractUserIds(usersInput);
    const featSet = this.getFeatureSet(guildId, normFeature);

    const added = [];
    const alreadyExists = [];

    for (const userId of userIds) {
      if (featSet.has(userId)) {
        alreadyExists.push(userId);
      } else {
        featSet.add(userId);
        added.push(userId);
      }
    }

    if (added.length > 0) {
      this.saveToDisk();
      logger.info(`[Whitelist] Đã thêm ${added.length} người dùng vào [${normFeature}] cho Guild ${guildId}`);
    }

    return {
      feature: normFeature,
      featureName: this.getFeatureDisplayName(normFeature),
      added,
      alreadyExists,
    };
  }

  /**
   * Xóa 1 người dùng khỏi danh sách Whitelist
   * @param {string} guildId
   * @param {string} userId
   * @param {string} [feature='toxic']
   * @returns {boolean}
   */
  removeUser(guildId, userId, feature = 'toxic') {
    const res = this.removeUsers(guildId, [userId], feature);
    return res.removed.length > 0;
  }

  /**
   * Xóa nhiều người dùng khỏi danh sách Whitelist của một tính năng
   * @param {string} guildId
   * @param {string|string[]} usersInput
   * @param {string} [feature='toxic']
   * @returns {{ feature: string, featureName: string, removed: string[], notFound: string[] }}
   */
  removeUsers(guildId, usersInput, feature = 'toxic') {
    const normFeature = this.normalizeFeature(feature);
    const userIds = this.extractUserIds(usersInput);
    const featSet = this.getFeatureSet(guildId, normFeature);

    const removed = [];
    const notFound = [];

    for (const userId of userIds) {
      if (featSet.has(userId)) {
        featSet.delete(userId);
        removed.push(userId);
      } else {
        notFound.push(userId);
      }
    }

    if (removed.length > 0) {
      this.saveToDisk();
      logger.info(`[Whitelist] Đã xóa ${removed.length} người dùng khỏi [${normFeature}] cho Guild ${guildId}`);
    }

    return {
      feature: normFeature,
      featureName: this.getFeatureDisplayName(normFeature),
      removed,
      notFound,
    };
  }

  /**
   * Lấy danh sách ID người dùng trong Whitelist
   * @param {string} guildId
   * @param {string} [feature] Nếu không truyền sẽ trả về tất cả tính năng
   * @returns {Record<string, string[]> | string[]}
   */
  getList(guildId, feature = null) {
    const guildMap = this.getGuildMap(guildId);

    if (feature) {
      const normFeature = this.normalizeFeature(feature);
      const set = guildMap.get(normFeature);
      return set ? Array.from(set) : [];
    }

    const result = {};
    for (const [feat, set] of guildMap.entries()) {
      if (set.size > 0) {
        result[feat] = Array.from(set);
      }
    }
    return result;
  }

  /**
   * Xóa toàn bộ danh sách Whitelist của Guild
   * @param {string} guildId
   * @param {string} [feature] Nếu không truyền sẽ xóa sạch tất cả tính năng
   */
  clearList(guildId, feature = null) {
    const guildMap = this.getGuildMap(guildId);
    if (feature) {
      const normFeature = this.normalizeFeature(feature);
      guildMap.delete(normFeature);
    } else {
      this.whitelist.set(guildId, new Map());
    }
    this.saveToDisk();
  }
}

module.exports = new WhitelistService();
