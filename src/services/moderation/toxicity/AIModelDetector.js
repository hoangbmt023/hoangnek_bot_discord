const IToxicityDetector = require('./IToxicityDetector');
const MODERATION_CONFIG = require('../../../config/moderation');
const logger = require('../../../utils/logger');

/**
 * AIModelDetector
 * Phân loại ngôn từ độc hại sử dụng mô hình AI (PhoBERT / ViHSD / ONNX Model).
 * Tự động chuyển đổi kết quả đầu ra về 3 nhãn: CLEAN (0), OFFENSIVE (1), HATE (2).
 */
class AIModelDetector extends IToxicityDetector {
  /**
   * @param {object} options
   * @param {string} [options.modelPath] - Đường dẫn mô hình ONNX hoặc repo HuggingFace
   */
  constructor(options = {}) {
    super();
    this.modelPath = options.modelPath || process.env.TOXIC_MODEL_PATH || 'gamusa/vietnamese-toxic-comment-classification';
    this.isLoaded = false;
    this.pipeline = null;

    // Bảng ánh xạ nhãn
    this.labelMapping = {
      0: MODERATION_CONFIG.labels.CLEAN,
      1: MODERATION_CONFIG.labels.OFFENSIVE,
      2: MODERATION_CONFIG.labels.HATE,
      'LABEL_0': MODERATION_CONFIG.labels.CLEAN,
      'LABEL_1': MODERATION_CONFIG.labels.OFFENSIVE,
      'LABEL_2': MODERATION_CONFIG.labels.HATE,
      'CLEAN': MODERATION_CONFIG.labels.CLEAN,
      'OFFENSIVE': MODERATION_CONFIG.labels.OFFENSIVE,
      'HATE': MODERATION_CONFIG.labels.HATE,
    };
  }

  /**
   * Khởi tạo và nạp mô hình vào bộ nhớ (Lazy Load)
   */
  async loadModel() {
    if (this.isLoaded) return;

    try {
      logger.info(`[AIModelDetector] Đang khởi tạo mô hình AI: ${this.modelPath}...`);
      
      // Thử nạp pipeline từ @huggingface/transformers nếu thư viện được cài đặt
      const transformers = await import('@huggingface/transformers').catch(() => null);
      if (transformers && transformers.pipeline) {
        this.pipeline = await transformers.pipeline('text-classification', this.modelPath);
        this.isLoaded = true;
        logger.info(`[AIModelDetector] Đã nạp thành công mô hình AI.`);
      } else {
        logger.warn(`[AIModelDetector] Chưa cài đặt @huggingface/transformers hoặc thiếu model local. Sẽ hoạt động ở chế độ dự phòng.`);
      }
    } catch (error) {
      logger.warn(`[AIModelDetector] Không thể nạp mô hình AI (${error.message}). Sẽ sử dụng bộ phân loại dự phòng.`);
      this.isLoaded = false;
    }
  }

  /**
   * Phân loại văn bản
   * @param {string} text
   * @returns {Promise<{ label: string, score: number }>}
   */
  async classify(text) {
    if (!this.isLoaded || !this.pipeline) {
      // Nếu model chưa sẵn sàng, trả về null để HybridDetector chuyển sang RuleBased
      return null;
    }

    try {
      const output = await this.pipeline(text);
      if (Array.isArray(output) && output.length > 0) {
        const topResult = output[0];
        const rawLabel = topResult.label;
        const normalizedLabel = this.labelMapping[rawLabel] || MODERATION_CONFIG.labels.CLEAN;
        return {
          label: normalizedLabel,
          score: topResult.score || 0.9,
        };
      }
    } catch (err) {
      logger.error('[AIModelDetector] Lỗi khi inference AI:', err);
    }

    return null;
  }
}

module.exports = AIModelDetector;
