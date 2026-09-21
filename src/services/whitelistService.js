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
 * Danh mục đối tượng hỗ trợ Whitelist
 */
const TARGET_TYPES = {
  users: 'Người dùng',
  roles: 'Vai trò (Role)',
  channels: 'Kênh văn bản',
};

/**
 * WhitelistService
 * Quản lý danh sách Người dùng (User), Vai trò (Role), và Kênh (Channel) được miễn trừ kiểm duyệt
 * Tuân thủ Single Responsibility Principle (SRP) & Domain-Driven Design (DDD)
 */
class WhitelistService {
  constructor() {
    // Map<guildId, Map<feature, { users: Set<string>, roles: Set<string>, channels: Set<string> }>>
    this.whitelist = new Map();
    this.storagePath = path.resolve(process.cwd(), 'data', 'guild_settings.json');
    this.legacyStoragePath = path.resolve(process.cwd(), 'data', 'whitelist.json');
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
   * Chuẩn hóa loại đối tượng (users | roles | channels)
   * @param {string} [target]
   * @returns {'users'|'roles'|'channels'}
   */
  normalizeTarget(target) {
    if (!target || typeof target !== 'string') return 'users';
    const cleaned = target.replace(/[<>]/g, '').trim().toLowerCase();
    if (cleaned === 'role' || cleaned === 'roles' || cleaned === 'vaitro' || cleaned === 'vai_tro') {
      return 'roles';
    }
    if (cleaned === 'channel' || cleaned === 'channels' || cleaned === 'kenh' || cleaned === 'room') {
      return 'channels';
    }
    return 'users';
  }

  /**
   * Lấy tên hiển thị tiếng Việt của đối tượng
   * @param {string} target
   * @returns {string}
   */
  getTargetDisplayName(target) {
    const key = this.normalizeTarget(target);
    return TARGET_TYPES[key] || TARGET_TYPES.users;
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
   * Trích xuất toàn bộ Snowflake ID từ chuỗi văn bản (hỗ trợ tag @user, @Role, #channel, ID số)
   * @param {string|string[]} input
   * @returns {string[]} Danh sách Snowflake ID duy nhất
   */
  extractIds(input) {
    if (!input) return [];
    if (Array.isArray(input)) {
      return Array.from(new Set(input.flatMap((item) => this.extractIds(item))));
    }

    if (typeof input !== 'string') return [];

    // Tìm tất cả các chuỗi ID số của Discord (17-20 chữ số)
    const matches = input.match(/\d{17,20}/g);
    return matches ? Array.from(new Set(matches)) : [];
  }

  /**
   * Tạo cấu trúc dữ liệu trống cho 1 tính năng
   * @returns {{ users: Set<string>, roles: Set<string>, channels: Set<string> }}
   */
  createEmptyFeatureStore() {
    return {
      users: new Set(),
      roles: new Set(),
      channels: new Set(),
    };
  }

  /**
   * Tự động nhận diện loại đối tượng dựa trên chuỗi nhập (nếu có tag)
   * @param {string} input
   * @param {string} [fallbackTarget='users']
   * @returns {'users'|'roles'|'channels'}
   */
  detectTargetType(input, fallbackTarget = 'users') {
    if (!input || typeof input !== 'string') return this.normalizeTarget(fallbackTarget);
    if (input.includes('<@&')) return 'roles';
    if (input.includes('<#')) return 'channels';
    if (input.includes('<@')) return 'users';
    return this.normalizeTarget(fallbackTarget);
  }

  /**
   * Đọc dữ liệu whitelist đã lưu từ file JSON (tự động gộp dữ liệu cũ vào kho kiểm duyệt duy nhất)
   */
  loadFromDisk() {
    try {
      const dataDir = path.dirname(this.storagePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      let hasLegacyData = false;

      // 1. Đọc và migrate từ file whitelist.json cũ (nếu có)
      if (fs.existsSync(this.legacyStoragePath)) {
        try {
          const rawLegacy = fs.readFileSync(this.legacyStoragePath, 'utf8');
          const parsedLegacy = JSON.parse(rawLegacy);
          for (const [guildId, guildData] of Object.entries(parsedLegacy)) {
            const featureMap = new Map();
            const unifiedStore = this.createEmptyFeatureStore();

            if (Array.isArray(guildData)) {
              guildData.forEach((id) => unifiedStore.users.add(id));
            } else if (typeof guildData === 'object' && guildData !== null) {
              for (const [, featData] of Object.entries(guildData)) {
                if (Array.isArray(featData)) {
                  featData.forEach((id) => unifiedStore.users.add(id));
                } else if (typeof featData === 'object' && featData !== null) {
                  if (Array.isArray(featData.users)) featData.users.forEach((id) => unifiedStore.users.add(id));
                  if (Array.isArray(featData.roles)) featData.roles.forEach((id) => unifiedStore.roles.add(id));
                  if (Array.isArray(featData.channels)) featData.channels.forEach((id) => unifiedStore.channels.add(id));
                }
              }
            }

            featureMap.set('toxic', unifiedStore);
            this.whitelist.set(guildId, featureMap);
          }
          hasLegacyData = true;
          // Xóa file legacy cũ sau khi nạp
          fs.unlinkSync(this.legacyStoragePath);
          logger.info('[Whitelist] Đã di chuyển dữ liệu từ whitelist.json sang guild_settings.json thành công.');
        } catch (e) {
          logger.warn(`[Whitelist] Không thể đọc whitelist.json cũ: ${e.message}`);
        }
      }

      // 2. Đọc dữ liệu từ file guild_settings.json chính
      if (fs.existsSync(this.storagePath)) {
        const rawData = fs.readFileSync(this.storagePath, 'utf8');
        const parsed = JSON.parse(rawData);

        for (const [guildId, guildData] of Object.entries(parsed)) {
          if (!guildData || typeof guildData !== 'object') continue;
          const wlData = guildData.whitelist;
          if (!wlData || typeof wlData !== 'object') continue;

          const featureMap = this.whitelist.get(guildId) || new Map();
          const unifiedStore = featureMap.get('toxic') || this.createEmptyFeatureStore();

          for (const [, featData] of Object.entries(wlData)) {
            if (Array.isArray(featData)) {
              featData.forEach((id) => unifiedStore.users.add(id));
            } else if (typeof featData === 'object' && featData !== null) {
              if (Array.isArray(featData.users)) featData.users.forEach((id) => unifiedStore.users.add(id));
              if (Array.isArray(featData.roles)) featData.roles.forEach((id) => unifiedStore.roles.add(id));
              if (Array.isArray(featData.channels)) featData.channels.forEach((id) => unifiedStore.channels.add(id));
            }
          }

          featureMap.set('toxic', unifiedStore);
          this.whitelist.set(guildId, featureMap);
        }
        logger.info(`[Whitelist] Đã tải danh sách Whitelist từ bộ nhớ lưu trữ.`);
      }

      // Lưu lại vào guild_settings.json nếu vừa migrate từ file cũ
      if (hasLegacyData) {
        this.saveToDisk();
      }
    } catch (error) {
      logger.warn(`[Whitelist] Không thể nạp dữ liệu whitelist: ${error.message}`);
    }
  }

  /**
   * Lưu dữ liệu whitelist vào file guild_settings.json
   */
  saveToDisk() {
    try {
      let exportData = {};
      if (fs.existsSync(this.storagePath)) {
        try {
          exportData = JSON.parse(fs.readFileSync(this.storagePath, 'utf8')) || {};
        } catch {
          exportData = {};
        }
      }

      for (const [guildId, featureMap] of this.whitelist.entries()) {
        const store = featureMap.get('toxic') || this.createEmptyFeatureStore();
        const u = Array.from(store.users);
        const r = Array.from(store.roles);
        const c = Array.from(store.channels);

        if (u.length > 0 || r.length > 0 || c.length > 0) {
          exportData[guildId] = exportData[guildId] || {};
          exportData[guildId].whitelist = {
            toxic: {
              users: u,
              roles: r,
              channels: c,
            },
          };
        } else if (exportData[guildId] && exportData[guildId].whitelist) {
          delete exportData[guildId].whitelist;
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
   * @returns {Map<string, { users: Set<string>, roles: Set<string>, channels: Set<string> }>}
   */
  getGuildMap(guildId) {
    if (!this.whitelist.has(guildId)) {
      this.whitelist.set(guildId, new Map());
    }
    return this.whitelist.get(guildId);
  }

  /**
   * Lấy cấu trúc store theo từng tính năng của 1 guild (thống nhất về 'toxic')
   * @param {string} guildId
   * @param {string} [feature='toxic']
   * @returns {{ users: Set<string>, roles: Set<string>, channels: Set<string> }}
   */
  getFeatureStore(guildId, feature = 'toxic') {
    const guildMap = this.getGuildMap(guildId);
    if (!guildMap.has('toxic')) {
      guildMap.set('toxic', this.createEmptyFeatureStore());
    }
    return guildMap.get('toxic');
  }

  /**
   * Kiểm tra xem ngữ cảnh tin nhắn (User, Role, hoặc Channel) có nằm trong Whitelist không
   * @param {string} guildId
   * @param {string|{ userId?: string, roleIds?: string[], channelId?: string }} context
   * @param {string} [feature='toxic']
   * @returns {boolean}
   */
  isWhitelisted(guildId, context, feature = 'toxic') {
    if (!guildId || !context) return false;

    // Hỗ trợ truyền thẳng userId dạng string cho tương thích ngược
    const userId = typeof context === 'string' ? context : context.userId;
    const roleIds = typeof context === 'object' && Array.isArray(context.roleIds) ? context.roleIds : [];
    const channelId = typeof context === 'object' ? context.channelId : null;

    const store = this.getFeatureStore(guildId, 'toxic');

    // 1. Kiểm tra User ID
    if (userId && store.users.has(userId)) return true;

    // 2. Kiểm tra Role IDs của thành viên
    if (roleIds.length > 0) {
      for (const roleId of roleIds) {
        if (store.roles.has(roleId)) return true;
      }
    }

    // 3. Kiểm tra Channel ID
    if (channelId && store.channels.has(channelId)) return true;

    return false;
  }

  /**
   * Thêm đối tượng (Users, Roles, hoặc Channels) vào danh sách Whitelist
   * @param {string} guildId
   * @param {'users'|'roles'|'channels'|string} targetType
   * @param {string|string[]} input
   * @param {string} [feature='toxic']
   * @returns {{ targetType: string, targetName: string, feature: string, featureName: string, added: string[], alreadyExists: string[] }}
   */
  addTargets(guildId, targetType, input, feature = 'toxic') {
    const normTarget = this.normalizeTarget(targetType);
    const normFeature = this.normalizeFeature(feature);
    const ids = this.extractIds(input);
    const store = this.getFeatureStore(guildId, normFeature);

    const targetSet = store[normTarget];
    const added = [];
    const alreadyExists = [];

    for (const id of ids) {
      if (targetSet.has(id)) {
        alreadyExists.push(id);
      } else {
        targetSet.add(id);
        added.push(id);
      }
    }

    if (added.length > 0) {
      this.saveToDisk();
      logger.info(
        `[Whitelist] Guild ${guildId}: Đã thêm ${added.length} ${normTarget} vào Whitelist [${normFeature}]`
      );
    }

    return {
      targetType: normTarget,
      targetName: this.getTargetDisplayName(normTarget),
      feature: normFeature,
      featureName: this.getFeatureDisplayName(normFeature),
      added,
      alreadyExists,
    };
  }

  /**
   * Xóa đối tượng khỏi danh sách Whitelist
   * @param {string} guildId
   * @param {'users'|'roles'|'channels'|string} targetType
   * @param {string|string[]} input
   * @param {string} [feature='toxic']
   * @returns {{ targetType: string, targetName: string, feature: string, featureName: string, removed: string[], notFound: string[] }}
   */
  removeTargets(guildId, targetType, input, feature = 'toxic') {
    const normTarget = this.normalizeTarget(targetType);
    const normFeature = this.normalizeFeature(feature);
    const ids = this.extractIds(input);
    const store = this.getFeatureStore(guildId, normFeature);

    const targetSet = store[normTarget];
    const removed = [];
    const notFound = [];

    for (const id of ids) {
      if (targetSet.has(id)) {
        targetSet.delete(id);
        removed.push(id);
      } else {
        notFound.push(id);
      }
    }

    if (removed.length > 0) {
      this.saveToDisk();
      logger.info(
        `[Whitelist] Guild ${guildId}: Đã xóa ${removed.length} ${normTarget} khỏi Whitelist [${normFeature}]`
      );
    }

    return {
      targetType: normTarget,
      targetName: this.getTargetDisplayName(normTarget),
      feature: normFeature,
      featureName: this.getFeatureDisplayName(normFeature),
      removed,
      notFound,
    };
  }

  /**
   * Lấy danh sách Whitelist của Guild theo loại đối tượng và tính năng
   * @param {string} guildId
   * @param {'all'|'users'|'roles'|'channels'|string} [targetType='all']
   * @param {string} [feature='toxic']
   * @returns {{ users: string[], roles: string[], channels: string[] } | string[]}
   */
  getList(guildId, targetType = 'all', feature = 'toxic') {
    let resolvedTarget = 'all';

    if (targetType === 'toxic' || targetType === 'moderation') {
      resolvedTarget = feature && feature !== 'toxic' ? feature : 'all';
    } else {
      resolvedTarget = targetType || 'all';
    }

    const normTarget = String(resolvedTarget).toLowerCase();
    const store = this.getFeatureStore(guildId, 'toxic');

    if (normTarget === 'users' || normTarget === 'user') {
      return Array.from(store.users);
    }
    if (normTarget === 'roles' || normTarget === 'role') {
      return Array.from(store.roles);
    }
    if (normTarget === 'channels' || normTarget === 'channel') {
      return Array.from(store.channels);
    }

    return {
      users: Array.from(store.users),
      roles: Array.from(store.roles),
      channels: Array.from(store.channels),
    };
  }

  /**
   * Xóa danh sách Whitelist của Guild
   * @param {string} guildId
   * @param {'all'|'users'|'roles'|'channels'|string} [targetType='all']
   * @param {string} [feature=null]
   */
  clearList(guildId, targetType = 'all', feature = null) {
    let resolvedTarget = 'all';

    if (targetType === 'toxic' || targetType === 'moderation') {
      resolvedTarget = feature || 'all';
    } else {
      resolvedTarget = targetType || 'all';
    }

    const normTarget = String(resolvedTarget).toLowerCase();
    const store = this.getFeatureStore(guildId, 'toxic');

    if (normTarget === 'all') {
      store.users.clear();
      store.roles.clear();
      store.channels.clear();
    } else if (normTarget === 'users' || normTarget === 'user') {
      store.users.clear();
    } else if (normTarget === 'roles' || normTarget === 'role') {
      store.roles.clear();
    } else if (normTarget === 'channels' || normTarget === 'channel') {
      store.channels.clear();
    }

    this.saveToDisk();
    logger.info(`[Whitelist] Guild ${guildId}: Đã dọn dẹp Whitelist mục [${normTarget}]`);
  }

  // --- Các hàm tiện ích tương thích ngược (Backward Compatibility) ---
  extractUserIds(input) {
    return this.extractIds(input);
  }

  addUser(guildId, userId, feature = 'toxic') {
    return this.addTargets(guildId, 'users', [userId], feature).added.length > 0;
  }

  addUsers(guildId, usersInput, feature = 'toxic') {
    return this.addTargets(guildId, 'users', usersInput, feature);
  }

  removeUser(guildId, userId, feature = 'toxic') {
    return this.removeTargets(guildId, 'users', [userId], feature).removed.length > 0;
  }

  removeUsers(guildId, usersInput, feature = 'toxic') {
    return this.removeTargets(guildId, 'users', usersInput, feature);
  }
}

module.exports = new WhitelistService();
