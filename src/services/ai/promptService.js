const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

/**
 * PromptService
 * Xây dựng System Prompt và ghép nối Context cho AI Assistant.
 * Đảm bảo câu trả lời tuân thủ quy chuẩn an toàn, chính xác và định dạng Discord.
 */
class PromptService {
  constructor() {
    this.systemPromptTemplate = null;
    this.skillsDir = path.resolve(__dirname, 'skills');
    this.loadTemplates();
  }

  /**
   * Đọc trước các template prompt markdown từ thư mục skills
   */
  loadTemplates() {
    try {
      const systemPromptPath = path.join(this.skillsDir, 'systemPrompt.md');
      if (fs.existsSync(systemPromptPath)) {
        this.systemPromptTemplate = fs.readFileSync(systemPromptPath, 'utf8');
      }
    } catch (err) {
      logger.warn(`[PromptService] Không thể đọc systemPrompt.md: ${err.message}`);
    }
  }

  /**
   * Sinh System Prompt chuẩn mực cho AI từ file Markdown template
   * @param {object} [options]
   * @param {string} [options.serverName]
   * @returns {string}
   */
  buildSystemPrompt(options = {}) {
    const serverName = options.serverName ? `server "${options.serverName}"` : 'Discord server';

    if (this.systemPromptTemplate) {
      return this.systemPromptTemplate.replace(/\{\{serverName\}\}/g, serverName);
    }

    // Cố đọc lại nếu trước đó chưa load được
    try {
      const systemPromptPath = path.join(this.skillsDir, 'systemPrompt.md');
      if (fs.existsSync(systemPromptPath)) {
        this.systemPromptTemplate = fs.readFileSync(systemPromptPath, 'utf8');
        return this.systemPromptTemplate.replace(/\{\{serverName\}\}/g, serverName);
      }
    } catch (e) {}

    return `Bạn là AI Assistant thông minh, khách quan, chuẩn xác và trung thực của ${serverName}. Trả lời ngắn gọn, tự nhiên, không ghi chú thích nguồn thô dạng (nguồn X).`;
  }

  /**
   * Tự động làm sạch và chuyển đổi bảng Markdown sang định dạng danh sách (bullet list) thân thiện với Discord
   * @param {string} text
   * @returns {string}
   */
  formatResponseForDiscord(text) {
    if (!text || typeof text !== 'string') return '';

    // Tách các đoạn code block (```) để không làm ảnh hưởng code bên trong
    const codeBlockRegex = /```[\s\S]*?```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'code', content: match[0] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) });
    }

    const processedParts = parts.map((part) => {
      if (part.type === 'code') return part.content;

      const lines = part.content.split('\n');
      const outputLines = [];
      let inTable = false;
      let tableRows = [];

      const isTableRow = (line) => {
        const trimmed = line.trim();
        return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2;
      };

      const isSeparatorRow = (line) => {
        const trimmed = line.trim();
        return /^\|(\s*:?-+:?\s*\|)+$/.test(trimmed);
      };

      const flushTable = (rows) => {
        if (rows.length === 0) return [];
        const validRows = rows.filter((r) => !isSeparatorRow(r));
        if (validRows.length === 0) return [];

        const parsedRows = validRows.map((row) =>
          row
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim())
        );

        if (parsedRows.length === 1) {
          return [parsedRows[0].join(' - ')];
        }

        const headers = parsedRows[0];
        const dataRows = parsedRows.slice(1);
        const result = [];

        for (const row of dataRows) {
          if (row.length === 0 || row.every((c) => !c)) continue;

          if (row.length === 2) {
            const col1 = row[0];
            const col2 = row[1];
            if (col1.startsWith('`') || col1.startsWith('/')) {
              result.push(`• ${col1}: ${col2}`);
            } else {
              result.push(`• **${col1}**: ${col2}`);
            }
          } else if (row.length >= 3) {
            const mainCol = row[0];
            const subItems = [];
            for (let i = 1; i < row.length; i++) {
              const headerName = headers[i] || `Mục ${i + 1}`;
              const val = row[i];
              if (val) {
                subItems.push(`  - *${headerName}:* ${val}`);
              }
            }
            result.push(`• **${mainCol}**\n${subItems.join('\n')}`);
          } else {
            result.push(`• ${row.join(' - ')}`);
          }
        }

        return result;
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (isTableRow(line)) {
          inTable = true;
          tableRows.push(line);
        } else {
          if (inTable) {
            outputLines.push(...flushTable(tableRows));
            tableRows = [];
            inTable = false;
          }
          outputLines.push(line);
        }
      }

      if (inTable) {
        outputLines.push(...flushTable(tableRows));
      }

      return outputLines.join('\n');
    });

    return processedParts.join('');
  }

  /**
   * Ghép nối Ngữ cảnh Server, Tri thức Server, Kết quả tìm kiếm Web và Câu hỏi của người dùng
   * @param {object} params
   * @param {string} params.question - Câu hỏi của người dùng
   * @param {string} [params.serverContextText] - Ngữ cảnh Server Discord đã format
   * @param {string} [params.knowledgeText] - Tri thức/Nội quy/FAQ đã format
   * @param {string} [params.searchResultsText] - Kết quả tìm kiếm Web thực tế đã format
   * @returns {string}
   */
  buildUserPrompt({ question, serverContextText = '', knowledgeText = '', searchResultsText = '' }) {
    let prompt = '';

    if (serverContextText) {
      prompt += `${serverContextText}\n\n`;
    }

    if (knowledgeText) {
      prompt += `${knowledgeText}\n\n`;
    }

    if (searchResultsText) {
      prompt += `${searchResultsText}\n\n`;
    }

    prompt += `CÂU HỎI CỦA NGƯỜI DÙNG:\n${question.trim()}`;

    return prompt;
  }
}

module.exports = new PromptService();
