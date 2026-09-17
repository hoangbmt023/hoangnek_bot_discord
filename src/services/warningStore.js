const MODERATION_CONFIG = require('../config/moderation');

/**
 * WarningStore
 * Quản lý điểm cảnh cáo của người dùng theo từng Guild (Server)
 * Hỗ trợ tự động xóa/hết hạn điểm phạt sau thời gian quy định (Decay / Expiration)
 */
class WarningStore {
  constructor() {
    // Map lưu trữ: key = `${guildId}:${userId}`, value = { points: number, lastUpdated: number, history: Array }
    this.store = new Map();
  }

  /**
   * Tạo key định danh duy nhất cho người dùng trong guild
   * @param {string} guildId
   * @param {string} userId
   * @returns {string}
   */
  getKey(guildId, userId) {
    return `${guildId}:${userId}`;
  }

  /**
   * Lấy bản ghi cảnh cáo hiện tại của người dùng (tự động kiểm tra hết hạn)
   * @param {string} guildId
   * @param {string} userId
   * @returns {{ points: number, lastUpdated: number, history: Array }}
   */
  getRecord(guildId, userId) {
    const key = this.getKey(guildId, userId);
    const record = this.store.get(key);

    if (!record) {
      return { points: 0, lastUpdated: Date.now(), history: [] };
    }

    // Kiểm tra nếu điểm cảnh cáo đã hết hạn theo thời gian quy định
    const now = Date.now();
    if (now - record.lastUpdated > MODERATION_CONFIG.warningExpirationMs) {
      this.store.delete(key);
      return { points: 0, lastUpdated: now, history: [] };
    }

    return record;
  }

  /**
   * Lấy tổng điểm cảnh cáo của người dùng
   * @param {string} guildId
   * @param {string} userId
   * @returns {number}
   */
  getWarnings(guildId, userId) {
    return this.getRecord(guildId, userId).points;
  }

  /**
   * Cộng điểm cảnh cáo cho người dùng
   * @param {string} guildId
   * @param {string} userId
   * @param {number} points - Số điểm cộng thêm
   * @param {object} [metadata] - Thông tin chi tiết về lần vi phạm
   * @returns {number} Tổng số điểm sau khi cộng
   */
  addWarning(guildId, userId, points = 1, metadata = {}) {
    const key = this.getKey(guildId, userId);
    const record = this.getRecord(guildId, userId);

    const updatedPoints = record.points + points;
    const updatedRecord = {
      points: updatedPoints,
      lastUpdated: Date.now(),
      history: [
        ...record.history,
        {
          pointsAdded: points,
          timestamp: Date.now(),
          ...metadata,
        },
      ],
    };

    this.store.set(key, updatedRecord);
    return updatedPoints;
  }

  /**
   * Đặt lại (reset) điểm cảnh cáo của người dùng về 0
   * @param {string} guildId
   * @param {string} userId
   */
  resetWarnings(guildId, userId) {
    const key = this.getKey(guildId, userId);
    this.store.delete(key);
  }
}

module.exports = new WarningStore();
