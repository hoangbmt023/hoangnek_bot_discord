const { config } = require('../../config/env');
const logger = require('../../utils/logger');

/**
 * GeminiService
 * Tương tác trực tiếp với Google Gemini REST API v1beta qua native fetch.
 * Không tải model về server, tiết kiệm tài nguyên bộ nhớ tối đa.
 */
class GeminiService {
  constructor() {
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  /**
   * Sinh nội dung phản hồi từ Google Gemini
   * @param {object} params
   * @param {string} params.prompt - Nội dung câu hỏi/yêu cầu người dùng kèm context
   * @param {string} [params.systemInstruction] - Hướng dẫn hệ thống (System Prompt)
   * @param {Array<{ role: 'user' | 'model', text: string }>} [params.history] - Lịch sử hội thoại
   * @param {string} [params.model] - Model chỉ định (mặc định từ config)
   * @param {number} [params.timeoutMs] - Thời gian chờ tối đa
   * @returns {Promise<{ text: string, model: string, usage?: object }>}
   */
  async generate({ prompt, systemInstruction = '', history = [], model = null, timeoutMs = null }) {
    const apiKey = config.ai.geminiApiKey;
    if (!apiKey) {
      const err = new Error('GEMINI_API_KEY chưa được cấu hình.');
      err.code = 'CONFIG_MISSING';
      throw err;
    }

    const selectedModel = model || config.ai.geminiModel || 'gemini-3.6-flash';
    const timeout = timeoutMs || config.ai.requestTimeoutMs || 15000;
    const url = `${this.baseUrl}/${selectedModel}:generateContent`;

    // Xây dựng danh sách contents (history + current prompt)
    const contents = [];

    if (Array.isArray(history)) {
      for (const item of history) {
        if (item && item.text) {
          contents.push({
            role: item.role === 'assistant' || item.role === 'model' ? 'model' : 'user',
            parts: [{ text: String(item.text) }],
          });
        }
      }
    }

    // Thêm prompt hiện tại
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    const requestBody = {
      contents,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
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
        const error = new Error(`Gemini API Error: ${errorMessage}`);
        error.status = response.status;
        error.isRateLimit = response.status === 429;
        error.isQuotaExceeded = response.status === 429 || errorMessage.toLowerCase().includes('quota');
        error.provider = 'gemini';
        throw error;
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];

      if (!candidate || !candidate.content?.parts?.length) {
        if (candidate?.finishReason === 'SAFETY') {
          return {
            text: '⚠️ Yêu cầu của bạn đã bị bộ lọc an toàn của Google Gemini từ chối phản hồi.',
            model: selectedModel,
          };
        }
        throw new Error('Gemini API không trả về nội dung hợp lệ.');
      }

      const rawText = candidate.content.parts.map((p) => p.text || '').join('');
      const cleanedText = this.cleanResponseText(rawText);

      if (!cleanedText || cleanedText.length < 5) {
        throw new Error('Gemini API trả về nội dung rỗng hoặc không hợp lệ.');
      }

      return {
        text: cleanedText,
        model: selectedModel,
        usage: data.usageMetadata || null,
      };
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        const timeoutErr = new Error(`Gemini API quá thời gian phản hồi (${timeout}ms).`);
        timeoutErr.code = 'TIMEOUT';
        timeoutErr.isTimeout = true;
        timeoutErr.provider = 'gemini';
        throw timeoutErr;
      }
      throw err;
    }
  }

  /**
   * Làm sạch câu trả lời từ AI, loại bỏ thinking tags/process leak
   * @param {string} rawText
   * @returns {string}
   */
  cleanResponseText(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';
    let text = rawText.trim();

    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, '');
    text = text.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');
    text = text.replace(/\[thought\][\s\S]*?\[\/thought\]/gi, '');
    text = text.replace(/^(?:User Safety|Response Safety|Safety Categories|Safety Evaluation|Safety Assessment):[^\n]*\n?/gim, '');

    if (/^(?:Here(?:'s| is) a thinking process|Thinking Process|Let's think step by step|Analyze User Input|Phân tích câu hỏi:)/i.test(text)) {
      const markers = [
        /(?:Let's draft:?|Draft:?|Response:?|Final Answer:?|Phản hồi:?|Câu trả lời:?)\s*\n*/i,
        /\n\n(?=(?:Dựa trên|Theo thông tin|Chào bạn|Xin chào|Để |Bạn có thể|Lệnh |Hiện tại|Đối với|Trong server|[#*•-]))/i,
      ];

      for (const marker of markers) {
        const match = text.search(marker);
        if (match !== -1) {
          const cutIndex = text.indexOf('\n', match) !== -1 ? text.indexOf('\n', match) : match;
          const candidate = text.slice(cutIndex).trim();
          if (candidate.length > 20) {
            text = candidate;
            break;
          }
        }
      }
    }

    // 4. Loại bỏ các đường kẻ ngang markdown phân cách (---, ***, ___)
    text = text.replace(/^[ \t]*(?:[-*_]){3,}[ \t]*$/gm, '');
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
  }
}

module.exports = new GeminiService();
