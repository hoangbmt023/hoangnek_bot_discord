const IToxicityDetector = require('./IToxicityDetector');
const RuleBasedDetector = require('./RuleBasedDetector');
const AIModelDetector = require('./AIModelDetector');
const MODERATION_CONFIG = require('../../config/moderation');

/**
 * HybridToxicityDetector
 * Bộ phân loại kết hợp (Strategy & Composite):
 * - Dùng RuleBasedDetector kiểm tra nhanh các mẫu câu thù ghét/chửi bới rõ ràng.
 * - Dùng AIModelDetector (khi đã nạp) để phân tích các câu ngữ cảnh phức tạp.
 */
class HybridToxicityDetector extends IToxicityDetector {
  constructor(options = {}) {
    super();
    this.ruleDetector = new RuleBasedDetector();
    this.aiDetector = new AIModelDetector(options);
  }

  /**
   * Khởi tạo bộ phân loại
   */
  async init() {
    await this.aiDetector.loadModel();
  }

  /**
   * Phân loại nội dung văn bản
   * @param {string} text
   * @returns {Promise<{ label: 'CLEAN'|'OFFENSIVE'|'HATE', score: number, matchedPatterns?: string[] }>}
   */
  async classify(text) {
    // 1. Kiểm tra nhanh bằng Rule-based trước
    const ruleResult = await this.ruleDetector.classify(text);

    // Nếu Rule-based phát hiện ra vi phạm rõ ràng (HATE hoặc OFFENSIVE), trả về ngay lập tức để tiết kiệm CPU
    if (ruleResult && ruleResult.label !== MODERATION_CONFIG.labels.CLEAN) {
      return ruleResult;
    }

    // 2. Nếu Rule-based coi là CLEAN, kiểm tra thêm bằng AI Model nếu model đã sẵn sàng
    if (this.aiDetector.isLoaded) {
      const aiResult = await this.aiDetector.classify(text);
      if (aiResult) {
        return aiResult;
      }
    }

    // 3. Trả về kết quả CLEAN
    return ruleResult;
  }
}

module.exports = HybridToxicityDetector;
