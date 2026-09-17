/**
 * IToxicityDetector (Abstract Class / Interface)
 * Định nghĩa hợp đồng cho các bộ phân loại độc hại (DIP & OCP)
 */
class IToxicityDetector {
  constructor() {
    if (new.target === IToxicityDetector) {
      throw new TypeError('Không thể khởi tạo trực tiếp abstract class IToxicityDetector.');
    }
  }

  /**
   * Phân loại văn bản
   * @param {string} text - Văn bản cần kiểm tra
   * @returns {Promise<{ label: 'CLEAN'|'OFFENSIVE'|'HATE', score: number, matchedPatterns?: string[] }>}
   */
  async classify(text) {
    throw new Error('Method classify() phải được override bởi class con.');
  }
}

module.exports = IToxicityDetector;
