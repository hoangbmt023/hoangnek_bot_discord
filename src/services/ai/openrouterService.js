const { config } = require('../../config/env');
const logger = require('../../utils/logger');

/**
 * OpenRouterService
 * Dịch vụ AI dự phòng (Fallback) khi Gemini gặp lỗi (429, timeout, quota).
 * Sử dụng OpenRouter API tương thích OpenAI Chat Completions.
 */
class OpenRouterService {
  constructor() {
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  }

  /**
   * Sinh nội dung từ OpenRouter
   * @param {object} params
   * @param {string} params.prompt - Nội dung câu hỏi/yêu cầu người dùng
   * @param {string} [params.systemInstruction] - Hướng dẫn hệ thống (System Prompt)
   * @param {Array<{ role: 'user' | 'assistant', text: string }>} [params.history] - Lịch sử hội thoại
   * @param {string} [params.model] - Model chỉ định (mặc định openrouter/free hoặc config)
   * @param {number} [params.timeoutMs] - Thời gian chờ tối đa
   * @returns {Promise<{ text: string, model: string, usage?: object }>}
   */
  async generate({ prompt, systemInstruction = '', history = [], model = null, timeoutMs = null }) {
    const apiKey = config.ai.openrouterApiKey;
    if (!apiKey) {
      const err = new Error('OPENROUTER_API_KEY chưa được cấu hình.');
      err.code = 'CONFIG_MISSING';
      throw err;
    }

    const primaryModel = model || config.ai.openrouterModel || 'openrouter/free';
    const timeout = timeoutMs || config.ai.requestTimeoutMs || 15000;

    // Danh sách model dự phòng nếu model chính của OpenRouter gặp sự cố hoặc trả về chuỗi rỗng/tool-call
    const candidateModels = [primaryModel];
    if (primaryModel === 'openrouter/free' || primaryModel === 'auto') {
      candidateModels.push('nex-agi/nex-n2.5-mini:free');
      candidateModels.push('nex-agi/nex-n2.5-pro:free');
      candidateModels.push('nvidia/nemotron-3.5-lightning:free');
    }

    const messages = [];

    if (systemInstruction) {
      messages.push({
        role: 'system',
        content: systemInstruction,
      });
    }

    if (Array.isArray(history)) {
      for (const item of history) {
        if (item && item.text) {
          messages.push({
            role: item.role === 'model' || item.role === 'assistant' ? 'assistant' : 'user',
            content: String(item.text),
          });
        }
      }
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    let lastError = null;

    for (const targetModel of candidateModels) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://github.com/hoangbmt023/hoangnek_bot_discord',
            'X-Title': 'Hoangnek Discord Bot AI',
          },
          body: JSON.stringify({
            model: targetModel,
            messages,
            temperature: 0.1,
            max_tokens: 2048,
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          let errorData = null;
          try {
            errorData = await response.json();
          } catch {
            errorData = { message: await response.text().catch(() => response.statusText) };
          }

          const errorMessage = errorData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
          const error = new Error(`OpenRouter API Error (${targetModel}): ${errorMessage}`);
          error.status = response.status;
          error.isRateLimit = response.status === 429;
          error.provider = 'openrouter';
          lastError = error;
          continue;
        }

        const data = await response.json();
        const choice = data.choices?.[0];

        if (!choice || (!choice.message?.content && !choice.message?.reasoning)) {
          lastError = new Error(`OpenRouter (${targetModel}) không trả về message content.`);
          continue;
        }

        const rawContent = choice.message?.content || choice.message?.reasoning || '';
        const cleanedText = this.cleanResponseText(rawContent);

        if (!cleanedText || cleanedText.length < 5 || /^(?:User Safety|Response Safety|Safety Categories):/i.test(cleanedText)) {
          lastError = new Error(`OpenRouter (${targetModel}) trả về nội dung rỗng hoặc bị lọc guardrail.`);
          continue;
        }

        return {
          text: cleanedText,
          model: targetModel,
          usage: data.usage || null,
        };
      } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
          const timeoutErr = new Error(`OpenRouter API (${targetModel}) quá thời gian phản hồi (${timeout}ms).`);
          timeoutErr.code = 'TIMEOUT';
          timeoutErr.isTimeout = true;
          timeoutErr.provider = 'openrouter';
          lastError = timeoutErr;
          continue;
        }
        lastError = err;
      }
    }

    throw lastError || new Error('OpenRouter không thể sinh câu trả lời với các model khả dụng.');
  }

  /**
   * Làm sạch câu trả lời từ AI, loại bỏ thinking tags/process leak, tool-calls & guardrail metadata
   * @param {string} rawText
   * @returns {string}
   */
  cleanResponseText(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';
    let text = rawText.trim();

    // 1. Loại bỏ các thẻ suy nghĩ XML/HTML: <think>...</think>, <thought>...</thought>, <reasoning>...</reasoning>
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, '');
    text = text.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');
    text = text.replace(/\[thought\][\s\S]*?\[\/thought\]/gi, '');

    // 2. Loại bỏ các thẻ Tool Call rò rỉ của mô hình mã nguồn mở
    text = text.replace(/<\|tool_call_start\|>[\s\S]*?<\|tool_call_end\|>/gi, '');
    text = text.replace(/<\|im_start\|>[\s\S]*?<\|im_end\|>/gi, '');
    text = text.replace(/<\|[^|>]+\|>/g, '');

    // 3. Loại bỏ các dòng Guardrail / Safety evaluation metadata rò rỉ từ OpenRouter
    text = text.replace(/^(?:User Safety|Response Safety|Safety Categories|Safety Evaluation|Safety Assessment):[^\n]*\n?/gim, '');

    // 4. Loại bỏ các đoạn văn suy nghĩ Chain-of-thought ở đầu nếu model leak ra text thuần
    if (/^(?:The user is asking|The user wants|Here(?:'s| is) a thinking process|Thinking Process|Let's think step by step|Analyze User Input|Phân tích câu hỏi:|Let me analyze|Let me think|I need to analyze|From the search results)/i.test(text)) {
      const markers = [
        /(?:Let's draft:?|Draft:?|Response:?|Final Answer:?|Phản hồi:?|Câu trả lời:?)\s*\n*/i,
        /\n\n(?=(?:•|\*|Dựa trên|Theo thông tin|Chào bạn|Xin chào|Để |Bạn có thể|Lệnh |Hiện tại|Đối với|Trong server|Tuyển thủ|Himass))/i,
      ];

      for (const marker of markers) {
        const match = text.search(marker);
        if (match !== -1) {
          const cutIndex = text.indexOf('\n', match) !== -1 ? text.indexOf('\n', match) : match;
          const candidate = text.slice(cutIndex).trim();
          if (candidate.length > 20 && !/^(?:The user is asking|Let me analyze|I should)/i.test(candidate)) {
            text = candidate;
            break;
          }
        }
      }
    }

    // Nếu toàn bộ văn bản chỉ là thinking scratchpad bằng tiếng Anh mà không có câu trả lời cuối cùng
    if (/^(?:The user is asking|Let me analyze|I need to determine|Wait, there's a discrepancy)/i.test(text) && !/(?:Xin chào|Chào bạn|Tuyển thủ|Dựa trên|Theo|Hiện tại|•)/i.test(text)) {
      return '';
    }

    // 5. Loại bỏ các đường kẻ ngang markdown phân cách (---, ***, ___)
    text = text.replace(/^[ \t]*(?:[-*_]){3,}[ \t]*$/gm, '');
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
  }
}

module.exports = new OpenRouterService();
