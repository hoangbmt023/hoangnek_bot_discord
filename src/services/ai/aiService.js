const { config } = require('../../config/env');
const logger = require('../../utils/logger');
const geminiService = require('./geminiService');
const openrouterService = require('./openrouterService');
const serverContextService = require('./serverContextService');
const serverKnowledgeService = require('./serverKnowledgeService');
const memoryService = require('./memoryService');
const promptService = require('./promptService');
const tavilySearchService = require('./tavilySearchService');
const guildSettingsService = require('../guildSettingsService');

/**
 * AIService
 * Bộ điều phối trung tâm cho AI Assistant.
 * Xử lý: Rate Limit, Context Gathering, Memory, Gemini Primary Call, OpenRouter Fallback và Logging.
 */
class AIService {
  constructor() {
    // Map lưu thời điểm request cuối của từng user: Map<"userId", timestamp>
    this.userCooldowns = new Map();
    this.cooldownMs = config.ai.rateLimitCooldownMs || 5000;
  }

  /**
   * Kiểm tra và cập nhật Rate Limit cho người dùng
   * @param {string} userId
   * @returns {{ limited: boolean, remainingSec?: number }}
   */
  checkRateLimit(userId) {
    if (!userId) return { limited: false };

    const now = Date.now();
    const lastRequest = this.userCooldowns.get(userId) || 0;
    const diff = now - lastRequest;

    if (diff < this.cooldownMs) {
      const remainingSec = Math.ceil((this.cooldownMs - diff) / 1000);
      return { limited: true, remainingSec };
    }

    // Tự động dọn dẹp bộ nhớ các session cooldown đã hết hạn
    if (this.userCooldowns.size > 50) {
      for (const [uid, timestamp] of this.userCooldowns.entries()) {
        if (now - timestamp > this.cooldownMs * 2) {
          this.userCooldowns.delete(uid);
        }
      }
    }

    this.userCooldowns.set(userId, now);
    return { limited: false };
  }

  /**
   * Xử lý câu hỏi của người dùng và sinh câu trả lời thông minh
   * @param {object} params
   * @param {string} params.question - Câu hỏi từ người dùng
   * @param {string} params.userId - ID người hỏi
   * @param {string} [params.userName] - Tên người hỏi
   * @param {import('discord.js').Guild} [params.guild] - Guild Discord (nếu có)
   * @returns {Promise<{ text: string, provider: string, model: string, responseTime: number }>}
   */
  async ask({ question, userId, userName = 'User', guild = null }) {
    const startTime = Date.now();
    const guildId = guild?.id || 'dm';
    const serverName = guild?.name || 'Discord';

    // 1. Kiểm tra Rate Limit
    const rateCheck = this.checkRateLimit(userId);
    if (rateCheck.limited) {
      return {
        text: `⏳ Bạn đang hỏi AI quá nhanh. Vui lòng đợi **${rateCheck.remainingSec} giây** nữa trước khi gửi câu hỏi tiếp theo.`,
        provider: 'rate_limit',
        model: 'none',
        responseTime: 0,
      };
    }

    // 2. Thu thập Ngữ cảnh Server và Tri thức động (Discord Channel / Custom Text / Markdown)
    let serverContextText = '';
    if (guild) {
      const contextData = serverContextService.collectGuildContext(guild);
      serverContextText = serverContextService.formatContextForPrompt(contextData);
    }
    const knowledgeText = await serverKnowledgeService.getKnowledgeForGuild(guild);

    // 2.1. Phân luồng Tri thức Thông minh (Smart Knowledge & RAG Routing):
    // Luồng: Server Knowledge Base -> Có dữ liệu? -> Dùng Gemini/OpenRouter
    // Không có dữ liệu? -> Tavily Basic -> Không đủ? -> Tavily Advanced -> Gemini/OpenRouter
    let searchResultsText = '';
    let tavilyDirectAnswer = '';

    const hasLocalKnowledge =
      tavilySearchService.isServerSpecificQuery(question) ||
      serverKnowledgeService.hasDirectKnowledge(question, guild, knowledgeText);

    if (hasLocalKnowledge) {
      logger.info(`[AI] Câu hỏi khớp với Server Knowledge Base / Ngữ cảnh Server -> Trả lời trực tiếp bằng tri thức nội bộ.`);
    } else {
      try {
        const searchResults = await tavilySearchService.search(question);
        if (searchResults && (searchResults.answer || (searchResults.results && searchResults.results.length > 0))) {
          searchResultsText = tavilySearchService.formatSearchResults(searchResults);
          tavilyDirectAnswer = searchResults.answer || '';
        }
      } catch (searchError) {
        logger.warn(`[AI] Tavily search thất bại (${searchError.message}), tiếp tục với tri thức nội bộ.`);
      }
    }

    // 3. Xây dựng System Prompt & User Prompt
    const systemInstruction = promptService.buildSystemPrompt({ serverName });
    const userPrompt = promptService.buildUserPrompt({
      question,
      serverContextText,
      knowledgeText,
      searchResultsText,
    });

    // 4. Lấy lịch sử hội thoại ngắn hạn
    const history = memoryService.getHistory(guildId, userId);

    // 5. Xác định Provider chính & Model cấu hình theo Guild (hoặc mặc định)
    const primaryProvider = guildSettingsService.getAIPrimaryProvider(guild?.id);
    const targetGeminiModel = guildSettingsService.getAIModel(guild?.id, 'gemini');
    const targetOpenRouterModel = guildSettingsService.getAIModel(guild?.id, 'openrouter');

    let result = null;
    let usedProvider = '';
    let usedModel = '';

    const firstProvider = primaryProvider === 'openrouter' ? 'openrouter' : 'gemini';
    const fallbackProvider = firstProvider === 'gemini' ? 'openrouter' : 'gemini';

    const invokeProvider = async (provider) => {
      if (provider === 'gemini') {
        const res = await geminiService.generate({
          prompt: userPrompt,
          systemInstruction,
          history,
          model: targetGeminiModel,
        });
        return { result: res, provider: 'gemini' };
      } else {
        const res = await openrouterService.generate({
          prompt: userPrompt,
          systemInstruction,
          history,
          model: targetOpenRouterModel,
        });
        return { result: res, provider: 'openrouter' };
      }
    };

    // 6. Thử gọi Primary Provider
    try {
      const exec = await invokeProvider(firstProvider);
      result = exec.result;
      usedProvider = exec.provider;
      usedModel = result.model;
    } catch (firstError) {
      const firstName = firstProvider === 'gemini' ? 'Google Gemini' : 'OpenRouter';
      const fallbackName = fallbackProvider === 'gemini' ? 'Google Gemini' : 'OpenRouter';
      logger.warn(`[AI] ${firstName} thất bại (${firstError.message}). Đang chuyển sang ${fallbackName} fallback...`);

      // 7. Thử gọi Fallback Provider
      try {
        const fallbackExec = await invokeProvider(fallbackProvider);
        result = fallbackExec.result;
        usedProvider = fallbackExec.provider;
        usedModel = result.model;
      } catch (fallbackError) {
        logger.error('[AI] Cả Gemini và OpenRouter đều không thể phản hồi:', fallbackError);

        const responseTime = Date.now() - startTime;

        // Nếu cả 2 LLM đều lỗi nhưng Tavily đã có câu trả lời tổng hợp thực tế, trả về kết quả Tavily
        if (tavilyDirectAnswer && tavilyDirectAnswer.length > 10) {
          logger.info('[AI] Cung cấp phản hồi trực tiếp từ dữ liệu tìm kiếm thời gian thực của Tavily.');
          return {
            text: tavilyDirectAnswer,
            provider: 'tavily',
            model: 'tavily-rag-direct',
            responseTime,
          };
        }

        // Trường hợp cả 2 đều không thành công
        let errorMessage = '❌ Hiện tại dịch vụ AI đang tạm thời gián đoạn. Vui lòng thử lại sau giây lát!';

        if (firstError.code === 'CONFIG_MISSING' && fallbackError.code === 'CONFIG_MISSING') {
          errorMessage = '⚠️ Bot chưa được cấu hình API Key AI (`GEMINI_API_KEY` hoặc `OPENROUTER_API_KEY`). Vui lòng liên hệ quản trị viên.';
        }

        return {
          text: errorMessage,
          provider: 'error',
          model: 'none',
          responseTime,
        };
      }
    }

    const responseTime = Date.now() - startTime;

    // Log kết quả thực thi chuẩn mực theo quy cách (Không log key/token)
    logger.info(
      `[AI] provider=${usedProvider} model=${usedModel} guild=${guildId} user=${userId} (${userName}) responseTime=${responseTime}ms`
    );

    const answerText = result.text;

    // 7. Lưu lại lượt tương tác vào bộ nhớ ngắn hạn
    memoryService.addMessage(guildId, userId, 'user', question);
    memoryService.addMessage(guildId, userId, 'assistant', answerText);

    return {
      text: answerText,
      provider: usedProvider,
      model: usedModel,
      responseTime,
    };
  }
}

module.exports = new AIService();
