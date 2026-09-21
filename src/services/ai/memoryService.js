const logger = require('../../utils/logger');

/**
 * MemoryService
 * Quản lý bộ nhớ ngữ cảnh hội thoại ngắn hạn (Short-term Conversation Memory).
 * Khóa phân tách độc lập theo từng guildId:userId.
 * Tự động giải phóng các phiên không hoạt động để tối ưu RAM cho hosting cPanel.
 */
class MemoryService {
  /**
   * @param {object} [options]
   * @param {number} [options.maxMessagesPerUser=10] - Số tin nhắn tối đa lưu trữ (khoảng 5 lượt hỏi-đáp)
   * @param {number} [options.ttlMs=900000] - Thời gian tồn tại bộ nhớ (15 phút không hoạt động)
   */
  constructor(options = {}) {
    this.maxMessages = options.maxMessagesPerUser || 10;
    this.ttlMs = options.ttlMs || 15 * 60 * 1000; // 15 phút
    // Map<"guildId:userId", { messages: Array<{ role: 'user'|'assistant', text: string }>, lastActive: number }>
    this.sessions = new Map();

    // Dọn dẹp định kỳ mỗi 5 phút
    this.cleanupTimer = setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Tạo khóa định danh duy nhất cho từng hội thoại
   * @param {string} guildId
   * @param {string} userId
   * @returns {string}
   */
  getSessionKey(guildId, userId) {
    return `${guildId || 'global'}:${userId}`;
  }

  /**
   * Lấy lịch sử hội thoại của người dùng trong server
   * @param {string} guildId
   * @param {string} userId
   * @returns {Array<{ role: 'user' | 'assistant', text: string }>}
   */
  getHistory(guildId, userId) {
    const key = this.getSessionKey(guildId, userId);
    const session = this.sessions.get(key);

    if (!session) return [];

    // Kiểm tra TTL
    if (Date.now() - session.lastActive > this.ttlMs) {
      this.sessions.delete(key);
      return [];
    }

    session.lastActive = Date.now();
    return [...session.messages];
  }

  /**
   * Thêm một lượt tương tác (câu hỏi hoặc câu trả lời) vào bộ nhớ
   * @param {string} guildId
   * @param {string} userId
   * @param {'user' | 'assistant' | 'model'} role
   * @param {string} text
   */
  addMessage(guildId, userId, role, text) {
    if (!text || typeof text !== 'string') return;

    const key = this.getSessionKey(guildId, userId);
    let session = this.sessions.get(key);

    if (!session || Date.now() - session.lastActive > this.ttlMs) {
      session = {
        messages: [],
        lastActive: Date.now(),
      };
      this.sessions.set(key, session);
    }

    const normalizedRole = role === 'model' || role === 'assistant' ? 'assistant' : 'user';

    session.messages.push({
      role: normalizedRole,
      text: text.trim(),
    });

    // Cắt giảm nếu vượt quá số lượng tối đa (FIFO)
    if (session.messages.length > this.maxMessages) {
      session.messages = session.messages.slice(-this.maxMessages);
    }

    session.lastActive = Date.now();
  }

  /**
   * Xóa lịch sử của một người dùng trong server
   * @param {string} guildId
   * @param {string} userId
   */
  clearSession(guildId, userId) {
    const key = this.getSessionKey(guildId, userId);
    this.sessions.delete(key);
  }

  /**
   * Dọn dẹp các phiên đã hết hạn
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, session] of this.sessions.entries()) {
      if (now - session.lastActive > this.ttlMs) {
        this.sessions.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`[MemoryService] Đã giải phóng ${cleanedCount} phiên hội thoại AI hết hạn.`);
    }
  }

  /**
   * Xóa toàn bộ bộ nhớ (dùng cho test)
   */
  clearAll() {
    this.sessions.clear();
  }
}

module.exports = new MemoryService();
