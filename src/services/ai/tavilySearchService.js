const { tavily } = require('@tavily/core');
const { config } = require('../../config/env');
const logger = require('../../utils/logger');

/**
 * TavilySearchService
 * Dịch vụ tìm kiếm và trích xuất dữ liệu Internet chuyên dụng cho AI RAG sử dụng Tavily API Platform.
 * Tài liệu tham khảo: https://docs.tavily.com / https://app.tavily.com
 * 
 * Các tính năng nổi bật:
 * 1. AI-native Search Engine: Tự động lọc sạch mã HTML, quảng cáo, SEO spam.
 * 2. High-precision Grounding: Trích xuất nội dung bài viết và tính toán điểm tương thích (score).
 * 3. Synthesized Direct Answer: Sinh câu trả lời trực tiếp từ các nguồn web uy tín.
 * 4. In-memory TTL Cache: Lưu đệm 10 phút chống trùng lặp và tiết kiệm API credits.
 */
class TavilySearchService {
  constructor() {
    this.cache = new Map();
    this.cacheTtlMs = 15 * 60 * 1000; // 15 phút
    this.client = null;
    this.initClient();
  }

  /**
   * Xóa toàn bộ cache tìm kiếm (dùng cho testing hoặc reset thủ công)
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Khởi tạo Tavily Client từ biến môi trường
   */
  initClient() {
    const apiKey = config.ai.tavilyApiKey || process.env.TAVILY_API_KEY;
    if (apiKey && apiKey.trim()) {
      try {
        this.client = tavily({ apiKey: apiKey.trim() });
        logger.info('[Tavily] Đã khởi tạo Tavily AI Search Client thành công.');
      } catch (err) {
        logger.warn(`[Tavily] Lỗi khởi tạo Tavily Client: ${err.message}`);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  /**
   * Kiểm tra xem Tavily API Key đã được cấu hình hay chưa
   * @returns {boolean}
   */
  isConfigured() {
    const apiKey = config.ai.tavilyApiKey || process.env.TAVILY_API_KEY;
    return Boolean(apiKey && apiKey.trim());
  }

  /**
   * Kiểm tra xem câu hỏi có thuộc phạm vi nội bộ Server Discord hay không
   * @param {string} question
   * @returns {boolean}
   */
  isServerSpecificQuery(question) {
    if (!question || typeof question !== 'string') return false;
    const lower = question.toLowerCase();

    const serverKeywords = [
      'server',
      'máy chủ',
      'nội quy server',
      'quy tắc server',
      'luật server',
      'luật của server',
      'kênh chat',
      'kênh voice',
      'kênh thông báo',
      'kênh bot',
      'role server',
      'vai trò trong server',
      'whitelist',
      'lọc từ',
      'chào mừng thành viên',
      '/setup',
      '/music',
      '/help',
      '/ask',
      '/feature',
    ];

    if (serverKeywords.some((kw) => lower.includes(kw))) {
      return true;
    }

    if (lower.includes('lệnh') && (lower.includes('bot') || lower.includes('phát nhạc') || lower.includes('play') || lower.includes('setup') || lower.includes('music'))) {
      return true;
    }

    return false;
  }

  /**
   * Tạo khóa cache chuẩn hóa từ câu hỏi (Loại bỏ dấu câu thừa, khoảng trắng trùng lặp để tối đa hóa cache hit)
   * @param {string} query
   * @returns {string}
   */
  getCacheKey(query) {
    return (query || '')
      .toLowerCase()
      .replace(/[?!.,;:()\[\]{}"'\\\/~`*+_\-\n\r\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Thực hiện tìm kiếm thông qua Tavily API Platform
   * @param {string} query - Câu hỏi cần tra cứu
   * @param {object} [options] - Cấu hình tùy chọn
   * @param {'basic'|'advanced'} [options.searchDepth='advanced'] - Độ sâu tìm kiếm (advanced = chất lượng cao nhất cho RAG)
   * @param {number} [options.maxResults=5] - Số lượng kết quả tối đa
   * @param {boolean} [options.includeAnswer=true] - Nhận câu trả lời tổng hợp trực tiếp từ Tavily
   * @param {string[]} [options.includeDomains] - Danh sách domain ưu tiên
   * @param {string[]} [options.excludeDomains] - Danh sách domain loại trừ
   * @returns {Promise<{ answer?: string, results: Array<{ title: string, url: string, content: string, score: number, publishedDate?: string }>, query: string }>}
   */
  /**
   * Đánh giá chất lượng của kết quả tìm kiếm để quyết định có cần nâng cấp lên 'advanced' hay không
   * @param {object} result
   * @returns {boolean}
   */
  isResultInsufficient(result) {
    if (!result || !Array.isArray(result.results) || result.results.length === 0) {
      return true;
    }

    // Nếu đã có câu trả lời tổng hợp chất lượng từ Tavily và ít nhất 1 nguồn điểm tốt
    if (result.answer && result.answer.length > 30) {
      return false;
    }

    // Kiểm tra điểm tương thích cao nhất
    const bestScore = Math.max(...result.results.map((r) => r.score || 0));
    if (bestScore < 65) {
      return true;
    }

    // Kiểm tra độ dài nội dung trích xuất tổng hợp
    const totalContentLength = result.results.reduce((sum, r) => sum + (r.content || '').length, 0);
    if (totalContentLength < 150) {
      return true;
    }

    return false;
  }

  /**
   * Thực hiện gửi yêu cầu đơn lẻ tới Tavily API (Basic hoặc Advanced)
   * @private
   */
  async executeTavilyRequest(cleanQuery, options = {}) {
    const apiKey = config.ai.tavilyApiKey || process.env.TAVILY_API_KEY;
    if (!apiKey) {
      return { answer: null, results: [], query: cleanQuery };
    }

    const searchDepth = options.searchDepth || 'basic';
    const maxResults = options.maxResults || config.ai.tavilyMaxResults || 5;
    const includeAnswer = options.includeAnswer !== false;

    logger.info(`[Tavily] Gửi yêu cầu: "${cleanQuery}" (depth=${searchDepth}, max=${maxResults})`);

    let rawResponse = null;

    if (this.client) {
      rawResponse = await this.client.search(cleanQuery, {
        searchDepth,
        maxResults,
        includeAnswer,
        includeDomains: options.includeDomains,
        excludeDomains: options.excludeDomains,
      });
    } else {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          query: cleanQuery,
          search_depth: searchDepth,
          max_results: maxResults,
          include_answer: includeAnswer,
          include_domains: options.includeDomains,
          exclude_domains: options.excludeDomains,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Tavily API HTTP ${res.status}: ${errText}`);
      }

      rawResponse = await res.json();
    }

    return {
      answer: rawResponse.answer || null,
      query: rawResponse.query || cleanQuery,
      responseTime: rawResponse.responseTime || 0,
      depth: searchDepth,
      results: (rawResponse.results || []).map((item) => ({
        title: item.title || '',
        url: item.url || '',
        content: item.content || item.rawContent || '',
        score: typeof item.score === 'number' ? Math.round(item.score * 100) : 0,
        publishedDate: item.publishedDate || null,
      })),
    };
  }

  /**
   * Thực hiện tìm kiếm thông minh đa tầng (Cascading Search):
   * 1. Thử tìm kiếm nhanh với Tavily 'basic' (tiết kiệm credits & phản hồi nhanh).
   * 2. Nếu kết quả 'basic' chưa đủ (score thấp, ít bài viết) -> Tự động nâng cấp lên 'advanced'.
   * @param {string} query - Câu hỏi cần tra cứu
   * @param {object} [options] - Cấu hình tùy chọn
   * @returns {Promise<{ answer?: string, results: Array<{ title: string, url: string, content: string, score: number, publishedDate?: string }>, query: string, depth?: string }>}
   */
  async search(query, options = {}) {
    if (!query || !query.trim()) {
      return { answer: null, results: [], query: '' };
    }

    const cleanQuery = query.trim();
    const cacheKey = this.getCacheKey(cleanQuery);
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      logger.info(`[Tavily] Sử dụng kết quả đệm Cache cho query: "${cleanQuery}"`);
      return cached.data;
    }

    if (!this.client) {
      this.initClient();
    }

    const apiKey = config.ai.tavilyApiKey || process.env.TAVILY_API_KEY;
    if (!apiKey) {
      logger.warn('[Tavily] Chưa cấu hình TAVILY_API_KEY trong file .env. Bỏ qua tìm kiếm Internet.');
      return { answer: null, results: [], query: cleanQuery };
    }

    try {
      // 1. Tầng 1: Thử tìm kiếm bằng Tavily Basic
      let finalResult = await this.executeTavilyRequest(cleanQuery, {
        ...options,
        searchDepth: 'basic',
      });

      // 2. Tầng 2: Đánh giá chất lượng kết quả Basic
      const isInsufficient = this.isResultInsufficient(finalResult);

      if (isInsufficient) {
        logger.info(`[Tavily] Kết quả 'basic' chưa đủ chi tiết. Tự động chuyển sang 'advanced' deep search...`);
        try {
          const advancedResult = await this.executeTavilyRequest(cleanQuery, {
            ...options,
            searchDepth: 'advanced',
          });

          if (advancedResult.results.length > 0 || advancedResult.answer) {
            finalResult = advancedResult;
          }
        } catch (advErr) {
          logger.warn(`[Tavily] Lỗi khi gọi 'advanced', tiếp tục sử dụng kết quả 'basic': ${advErr.message}`);
        }
      }

      // 3. Lưu Cache 10 phút
      this.cache.set(cacheKey, {
        data: finalResult,
        expiresAt: Date.now() + this.cacheTtlMs,
      });

      logger.info(
        `[Tavily] Hoàn thành tìm kiếm (depth=${finalResult.depth || 'basic'}): ${finalResult.results.length} nguồn trích xuất (tổng hợp: ${Boolean(finalResult.answer)})`
      );

      return finalResult;
    } catch (error) {
      logger.error(`[Tavily] Lỗi khi gọi Tavily Search API: ${error.message}`);
      return { answer: null, results: [], query: cleanQuery, error: error.message };
    }
  }

  /**
   * Làm sạch các trích dẫn thô dạng [1], [2], (nguồn 1, 2) khỏi văn bản trích xuất
   * @param {string} text
   * @returns {string}
   */
  cleanCitations(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/\s*\(nguồn\s*\d+(?:\s*,\s*\d+)*\)/gi, '')
      .replace(/\s*\[nguồn\s*\d+(?:\s*,\s*\d+)*\]/gi, '')
      .replace(/\s*\[\d+(?:\s*,\s*\d+)*\]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Định dạng kết quả từ Tavily thành văn bản Grounding RAG chuẩn mực cho LLM (Gemini / OpenRouter)
   * @param {object|Array} searchData
   * @returns {string}
   */
  formatSearchResults(searchData) {
    if (!searchData) return '';

    // Hỗ trợ cả object kết quả Tavily hoặc mảng truyền thống
    let answer = null;
    let results = [];

    if (Array.isArray(searchData)) {
      results = searchData;
    } else if (typeof searchData === 'object') {
      answer = searchData.answer || null;
      results = searchData.results || [];
    }

    if (!answer && results.length === 0) return '';

    let text = `THÔNG TIN TÌM KIẾM THỰC TẾ TỪ INTERNET (TAVILY AI SEARCH RAG):\n`;
    text += `(Dữ liệu thời gian thực được trích xuất và thẩm định từ các nguồn tin cậy trên Internet)\n\n`;

    if (answer) {
      const sanitizedAnswer = this.cleanCitations(answer);
      if (sanitizedAnswer) {
        text += `[TỔNG HỢP NỘI DUNG TÌM KIẾM]:\n${sanitizedAnswer}\n\n`;
      }
    }

    if (results.length > 0) {
      text += `[CHI TIẾT CÁC TÀI LIỆU THAM KHẢO]:\n`;
      results.forEach((item, index) => {
        const scoreStr = item.score ? ` | Độ tương thích: ${item.score}%` : '';
        const dateStr = item.publishedDate ? ` | Ngày xuất bản: ${item.publishedDate}` : '';
        text += `[Tài liệu ${index + 1}]${scoreStr}${dateStr}\n`;
        text += `Tiêu đề: ${item.title || 'Không có tiêu đề'}\n`;
        text += `URL: ${item.url || 'N/A'}\n`;

        const content = this.cleanCitations(item.content || item.snippet || '');
        if (content) {
          text += `Nội dung: ${content}\n`;
        }
        text += `\n`;
      });
    }

    return text.trim();
  }
}

module.exports = new TavilySearchService();
