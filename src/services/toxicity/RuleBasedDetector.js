const IToxicityDetector = require('./IToxicityDetector');
const MODERATION_CONFIG = require('../../config/moderation');

/**
 * RuleBasedDetector
 * Bộ lọc phân loại ngôn từ độc hại tiếng Việt tốc độ cao (Heuristic, Regex, Dictionary)
 * Hỗ trợ chuẩn hóa teencode, leetspeak, dấu cách chèn ký tự đặc biệt.
 */
class RuleBasedDetector extends IToxicityDetector {
  constructor() {
    super();

    // Danh sách từ khóa & biểu thức chính quy nhóm HATE (Thù ghét, đe dọa bạo lực, xúc phạm cực đoan, phân biệt)
    this.hatePatterns = [
      /gi[ếe]t\s+(c[ảa]\s+)?(nh[àa]|m[ẹe]|cha|m[àa]y|h[ọo])/i,
      /ch[ếe]t\s+(ti[ệe]t|m[ẹe]\s+m[àa]y|m[ẹe]|b[àa]\s+m[àa]y)/i,
      /b[ắa]n\s+(ch[ếe]t|b[ỏo]\s+m[ẹe])/i,
      /ch[ặa]t\s+(đ[ầa]u|tay|ch[âa]n)/i,
      /b[ắa]c\s+k[ỳy]\s+(c[hóo]|ch[oó]|c[ọo]|ch[óo]\s+đ[ẻe])/i,
      /nam\s+k[ỳy]\s+(c[hóo]|ch[oó]|c[ọo])/i,
      /trung\s+k[ỳy]\s+(c[hóo]|ch[oó])/i,
      /đ[ụu]\s+m[ẹe]\s+c[ảa]\s+t[ổo]\s+t[ôo]ng/i,
      /h[iếe]p\s+(d[âa]m|ch[ếe]t)/i,
      /th[ảa]\s+bom|kh[ủu]ng\s+b[ốo]/i,
      /đồ\s+con\s+hoang/i,
      /s[úu]c\s+v[ậa]t\s+ch[ếe]t\s+ti[ệe]t/i,
    ];

    // Danh sách từ khóa & biểu thức chính quy nhóm OFFENSIVE (Xúc phạm, chửi thề, thô tục)
    this.offensivePatterns = [
      /(^|\s)(đ[cm]|dcm|đkm|dkm|đmm|dmm|đjt|djt|đyt|dyt|đm|dm)(\s|$)/i,
      /(^|\s)(vcl|vcll|vcc|vkl|vl|vloz|vlon|vloz)(\s|$)/i,
      /(^|\s)(clgt|cmnr|đb|cc)(\s|$)/i,
      /m[àa]y\s+ngu(\s+(v[ãa]i|vkl|vcl|vl|qu[áa]|đ[ầa]n))?/i,
      /ngu\s+(ng[ốo]c|v[ãa]i|vkl|vcl|vl|qu[áa]|đ[ầa]n|l[ắa]m|nh[ưuu])/i,
      /[óo]c\s+(ch[óo]|heo|b[òo]|l[ợo]n)/i,
      /đ[ụu]\s+(m[ẹe]|m[áa]|m|cha|b[àa])/i,
      /đ[ịi]t\s+(m[ẹe]|m[áa]|m|con|b[àa])/i,
      /(l[ồo]n|l[ồo]z|cac|c[ặa]c|bu[ồo]i|d[áa]i|chim\s+to)(\s|$)/i,
      /ch[óo]\s+đ[ẻe]/i,
      /r[áa]c\s+r[ưởu]/i,
      /đ[ồo]\s+(ngu|r[áa]c|kh[ốo]n|b[ệe]nh|d[ơo]|h[ãa]m|ti[ệe]n)/i,
      /th[ằa]ng\s+(ch[óo]|ngu|kh[ốo]n|kh[ùu]ng|đi[êe]n)/i,
      /con\s+(ch[óo]|ph[àa]y|ph[òo]|đ[ĩi]|di)/i,
      /m[ặa]t\s+(l[ồo]n|d[àa]y|d[áa]i)/i,
      /h[ãa]m\s+(l[ồo]n|vcl|vl|vcc)/i,
      /kh[ốo]n\s+n[ạa]n/i,
    ];
  }

  /**
   * Chuẩn hóa văn bản đầu vào: Xóa dấu cách thừa, ký tự lặp, hạ chữ thường
   * @param {string} text
   * @returns {string}
   */
  normalizeText(text) {
    if (!text || typeof text !== 'string') return '';

    return text
      .toLowerCase()
      // Chuyển ký tự lặp liên tiếp (vd: đòooo -> đò, nguuuuu -> ngu)
      .replace(/(.)\1{2,}/g, '$1$1')
      // Chuẩn hóa một số ký tự teencode phổ biến
      .replace(/[\.\-_,;:\/\\|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Phân loại văn bản
   * @param {string} text
   * @returns {Promise<{ label: string, score: number, matchedPatterns: string[] }>}
   */
  async classify(text) {
    const normalized = this.normalizeText(text);

    if (!normalized) {
      return {
        label: MODERATION_CONFIG.labels.CLEAN,
        score: 1.0,
        matchedPatterns: [],
      };
    }

    // 1. Kiểm tra nhóm HATE trước (Ưu tiên cao nhất)
    const matchedHate = [];
    for (const pattern of this.hatePatterns) {
      if (pattern.test(normalized)) {
        matchedHate.push(pattern.toString());
      }
    }

    if (matchedHate.length > 0) {
      return {
        label: MODERATION_CONFIG.labels.HATE,
        score: 0.95,
        matchedPatterns: matchedHate,
      };
    }

    // 2. Kiểm tra nhóm OFFENSIVE
    const matchedOffensive = [];
    for (const pattern of this.offensivePatterns) {
      if (pattern.test(normalized)) {
        matchedOffensive.push(pattern.toString());
      }
    }

    if (matchedOffensive.length > 0) {
      return {
        label: MODERATION_CONFIG.labels.OFFENSIVE,
        score: 0.90,
        matchedPatterns: matchedOffensive,
      };
    }

    // 3. Mặc định là CLEAN
    return {
      label: MODERATION_CONFIG.labels.CLEAN,
      score: 0.99,
      matchedPatterns: [],
    };
  }
}

module.exports = RuleBasedDetector;
