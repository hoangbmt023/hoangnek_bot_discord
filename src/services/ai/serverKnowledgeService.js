const logger = require('../../utils/logger');

/**
 * Chuẩn hóa và loại bỏ dấu Tiếng Việt phục vụ so khớp từ khóa không dấu
 * @param {string} str
 * @returns {string}
 */
function removeVietnameseTones(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * ServerKnowledgeService
 * Quản lý dữ liệu tri thức Server động (Discord Pinned Messages / Custom Message / Custom Text) cho AI Assistant.
 */
class ServerKnowledgeService {
  constructor() {}

  /**
   * Loại bỏ dấu Tiếng Việt (Export để sử dụng rộng rãi)
   * @param {string} str
   * @returns {string}
   */
  removeAccents(str) {
    return removeVietnameseTones(str);
  }

  /**
   * Thu thập và định dạng dữ liệu tri thức động của Server cho AI Prompt
   * Tự động kết hợp:
   * 1. Văn bản tùy chỉnh do Admin cài đặt qua Discord (/setup knowledge set-text)
   * 2. Nội dung/tin nhắn ghim từ các Kênh Tri Thức (/setup knowledge add-channel)
   * 3. Tin nhắn cụ thể do Admin chỉ định (/setup knowledge set-message)
   * @param {import('discord.js').Guild} [guild]
   * @returns {Promise<string>}
   */
  async getKnowledgeForGuild(guild = null) {
    const sections = [];

    if (guild && guild.id) {
      const guildSettingsService = require('../guildSettingsService');
      const knowledgeConfig = guildSettingsService.getKnowledgeConfig(guild.id);

      logger.info(
        `[ServerKnowledge] Guild ${guild.id}: config = channelIds=[${knowledgeConfig.channelIds?.join(',')}], ` +
        `messages=${knowledgeConfig.messages?.length || 0} msgs, customTexts=${knowledgeConfig.customTexts?.length || 0} texts`
      );

      // 1. Văn bản tùy chỉnh do Admin cài đặt từ Discord (Hỗ trợ nhiều đoạn văn bản)
      const customTexts = knowledgeConfig.customTexts || (knowledgeConfig.customText ? [knowledgeConfig.customText] : []);
      if (customTexts.length > 0) {
        const textBlocks = customTexts
          .filter((t) => t && t.trim())
          .map((t, idx) => `[Văn bản tùy chỉnh ${idx + 1}]:\n${t.trim()}`)
          .join('\n\n');

        if (textBlocks) {
          sections.push(
            `=== DỮ LIỆU TRI THỨC DO QUẢN TRỊ VIÊN CẤU HÌNH CHO SERVER ===\n${textBlocks}`
          );
        }
      }

      // 2. Nội dung từ các Tin nhắn cụ thể do Admin chỉ định (Hỗ trợ nhiều tin nhắn từ nhiều kênh)
      const targetMessages = knowledgeConfig.messages || [];
      if (targetMessages.length > 0) {
        for (let i = 0; i < targetMessages.length; i++) {
          const msgRef = targetMessages[i];
          if (!msgRef.messageId || !msgRef.channelId) continue;

          try {
            let msgChannel = guild.channels?.cache?.get(msgRef.channelId);
            if (!msgChannel) {
              msgChannel = await guild.channels?.fetch(msgRef.channelId).catch(() => null);
            }

            if (msgChannel && msgChannel.isTextBased()) {
              const targetMsg = await msgChannel.messages.fetch(msgRef.messageId).catch(() => null);
              if (targetMsg) {
                let msgBody = '';
                if (targetMsg.content && targetMsg.content.trim()) {
                  msgBody += `${targetMsg.content.trim()}\n`;
                }
                if (targetMsg.embeds && targetMsg.embeds.length > 0) {
                  targetMsg.embeds.forEach((embed) => {
                    if (embed.title) msgBody += `**${embed.title}**\n`;
                    if (embed.description) msgBody += `${embed.description}\n`;
                    if (embed.fields && embed.fields.length > 0) {
                      embed.fields.forEach((field) => {
                        if (field.name) msgBody += `${field.name}: `;
                        if (field.value) msgBody += `${field.value}\n`;
                      });
                    }
                  });
                }

                if (msgBody.trim()) {
                  sections.push(
                    `=== DỮ LIỆU TRI THỨC TỪ TIN NHẮN CHỈ ĐỊNH [${i + 1}] (Kênh #${msgChannel.name}, Tác giả: ${targetMsg.author?.tag || targetMsg.author?.username || 'Admin'}) ===\n${msgBody.trim()}`
                  );
                }
              }
            }
          } catch (err) {
            logger.warn(`[ServerKnowledge] Không thể đọc tin nhắn tri thức ${msgRef.messageId}: ${err.message}`);
          }
        }
      }

      // 3. Nội dung từ các Kênh Tri Thức được chỉ định (chỉ lấy tin nhắn ghim - Pinned Messages)
      const channelIds = knowledgeConfig.channelIds || [];
      for (const channelId of channelIds) {
        try {
          let channel = guild.channels?.cache?.get(channelId);
          if (!channel) {
            logger.info(`[ServerKnowledge] Kênh ${channelId} không có trong cache, đang fetch từ Discord API...`);
            channel = await guild.channels?.fetch(channelId).catch((e) => {
              logger.warn(`[ServerKnowledge] Không thể fetch kênh ${channelId}: ${e.message}`);
              return null;
            });
          }

          if (!channel) {
            logger.warn(`[ServerKnowledge] Kênh ${channelId} không tồn tại hoặc bot không có quyền xem.`);
            continue;
          }

          if (!channel.isTextBased()) {
            logger.warn(`[ServerKnowledge] Kênh #${channel.name} (${channelId}) không phải kênh văn bản.`);
            continue;
          }

          logger.info(`[ServerKnowledge] Đang đọc tin nhắn ghim từ kênh #${channel.name} (${channelId})...`);
          let messages = [];
          try {
            if (typeof channel.messages.fetchPins === 'function') {
              const res = await channel.messages.fetchPins();
              if (res && Array.isArray(res.items)) {
                messages = res.items.map((i) => i.message || i).filter(Boolean);
              } else if (res && typeof res.forEach === 'function') {
                messages = Array.from(res.values ? res.values() : res);
              }
            } else if (typeof channel.messages.fetchPinned === 'function') {
              const res = await channel.messages.fetchPinned();
              if (res) {
                messages = Array.from(res.values ? res.values() : res);
              }
            }
          } catch (fetchErr) {
            logger.warn(`[ServerKnowledge] fetchPins thất bại từ #${channel.name}, thử fetchPinned fallback: ${fetchErr.message}`);
            if (typeof channel.messages.fetchPinned === 'function') {
              const fallbackRes = await channel.messages.fetchPinned().catch(() => null);
              if (fallbackRes) {
                messages = Array.from(fallbackRes.values ? fallbackRes.values() : fallbackRes);
              }
            }
          }

          if (!messages || messages.length === 0) {
            logger.info(`[ServerKnowledge] Kênh #${channel.name} không có tin nhắn ghim nào.`);
            continue;
          }

          logger.info(`[ServerKnowledge] Tìm thấy ${messages.length} tin nhắn ghim từ kênh #${channel.name}.`);

          let channelKnowledge = `=== DỮ LIỆU TRI THỨC TỪ KÊNH #${channel.name} ===\n`;
          if (channel.topic) {
            channelKnowledge += `Mô tả kênh: ${channel.topic}\n\n`;
          }
          channelKnowledge += `[Nội dung các tin nhắn được ghim trong kênh]:\n`;
          let hasContent = false;
          messages.forEach((msg) => {
            // Đọc plain text content
            if (msg.content && msg.content.trim()) {
              channelKnowledge += `${msg.content.trim()}\n`;
              hasContent = true;
            }
            // Đọc embed content (bot messages thường dùng embed thay plain text)
            if (msg.embeds && msg.embeds.length > 0) {
              msg.embeds.forEach((embed) => {
                let embedText = '';
                if (embed.title) embedText += `**${embed.title}**\n`;
                if (embed.description) embedText += `${embed.description}\n`;
                if (embed.fields && embed.fields.length > 0) {
                  embed.fields.forEach((field) => {
                    if (field.name) embedText += `${field.name}: `;
                    if (field.value) embedText += `${field.value}\n`;
                  });
                }
                if (embedText.trim()) {
                  channelKnowledge += `${embedText.trim()}\n`;
                  hasContent = true;
                }
              });
            }
          });

          if (hasContent) {
            sections.push(channelKnowledge.trim());
          } else {
            logger.info(`[ServerKnowledge] Kênh #${channel.name}: Các tin nhắn ghim không có nội dung văn bản hay embed.`);
          }
        } catch (err) {
          logger.warn(`[ServerKnowledge] Lỗi không xác định khi xử lý kênh tri thức ${channelId}: ${err.message}`);
        }
      }

      logger.info(`[ServerKnowledge] Guild ${guild.id}: Tổng hợp ${sections.length} khối tri thức cho prompt.`);
    }

    return sections.join('\n\n').trim();
  }

  /**
   * Định dạng dữ liệu tri thức tĩnh (dùng cho prompt hoặc fallback)
   * @returns {string}
   */
  formatKnowledgeForPrompt() {
    return '';
  }

  /**
   * Kiểm tra xem câu hỏi có thể giải đáp trực tiếp từ Server Knowledge Base hay không (Hỗ trợ cả Tiếng Việt Có Dấu & Không Dấu)
   * @param {string} query - Câu hỏi của người dùng
   * @param {import('discord.js').Guild} [guild] - Guild Discord
   * @param {string} [dynamicKnowledgeText] - Dữ liệu tri thức động đã tổng hợp từ Discord (pinned messages / custom text)
   * @returns {boolean}
   */
  hasDirectKnowledge(query, guild = null, dynamicKnowledgeText = '') {
    if (!query || typeof query !== 'string') return false;
    const lower = query.toLowerCase();
    const lowerNoTone = removeVietnameseTones(lower);

    // 1. Kiểm tra từ khóa đặc thù về nội quy / server / role / bot (Cả Có Dấu & Không Dấu)
    const serverKnowledgeKeywords = [
      'nội quy', 'noi quy',
      'quy tắc', 'quy tac',
      'luật', 'luat',
      'điều khoản', 'dieu khoan',
      'vi phạm', 'vi pham',
      'role', 'vai trò', 'vai tro',
      'vip', 'rank',
      'lệnh bot', 'lenh bot',
      'lệnh nghe nhạc', 'lenh nghe nhac',
      'lệnh play', 'lenh play',
      'hỗ trợ', 'ho tro',
      'liên hệ admin', 'lien he admin',
      'ban quản trị', 'ban quan tri', 'bqt',
      'ticket',
      'bật tính năng', 'bat tinh nang',
      'tắt tính năng', 'tat tinh nang',
      'lọc từ', 'loc tu',
      'toxic',
      'faq', 'hỏi đáp', 'hoi dap',
      'bị xóa tin', 'bi xoa tin',
      'bị cảnh cáo', 'bi canh cao',
      'kênh chat', 'kenh chat',
    ];

    if (
      serverKnowledgeKeywords.some((kw) => lower.includes(kw) || lowerNoTone.includes(kw))
    ) {
      return true;
    }

    // 2. Kiểm tra độ trùng khớp với Dữ liệu tri thức động (Tin nhắn ghim + Custom text) - Hỗ trợ cả Có Dấu & Không Dấu
    const contextToSearch = (dynamicKnowledgeText || '').toLowerCase();
    const contextNoTone = removeVietnameseTones(contextToSearch);

    if (contextToSearch && contextToSearch.length > 20) {
      // Tách từ có dấu
      const cleanWordsWithTone = lower
        .replace(/[?!.,;:()\[\]{}"'\\\/~`*+_-]+/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3);

      // Tách từ không dấu
      const cleanWordsNoTone = lowerNoTone
        .replace(/[?!.,;:()\[\]{}"'\\\/~`*+_-]+/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3);

      if (cleanWordsWithTone.length > 0) {
        // So khớp có dấu
        const matchedWithTone = cleanWordsWithTone.filter((w) => contextToSearch.includes(w));
        // So khớp không dấu
        const matchedNoTone = cleanWordsNoTone.filter((w) => contextNoTone.includes(w));

        const maxMatched = Math.max(matchedWithTone.length, matchedNoTone.length);
        const totalWords = cleanWordsWithTone.length;

        // Nếu có ít nhất 40% từ khóa xuất hiện trong dữ liệu ghim (có dấu hoặc không dấu), hoặc có từ khóa dài >= 5 ký tự xuất hiện
        if (
          (maxMatched >= 2 && maxMatched / totalWords >= 0.4) ||
          matchedWithTone.some((w) => w.length >= 5) ||
          matchedNoTone.some((w) => w.length >= 5)
        ) {
          logger.info(`[ServerKnowledge] Câu hỏi "${query.slice(0, 50)}" khớp với nội dung ghim -> Ưu tiên nội bộ.`);
          return true;
        }
      }
    }

    // 3. Kiểm tra văn bản tùy chỉnh của Guild nếu chưa có dynamicKnowledgeText
    if (guild && guild.id && !dynamicKnowledgeText) {
      const guildSettingsService = require('../guildSettingsService');
      const knowledgeConfig = guildSettingsService.getKnowledgeConfig(guild.id);
      if (knowledgeConfig.customText) {
        const lowerCustom = knowledgeConfig.customText.toLowerCase();
        const customNoTone = removeVietnameseTones(lowerCustom);

        const cleanWords = lower.replace(/[?!.,]+/g, '').split(/\s+/).filter((w) => w.length >= 3);
        const cleanNoTone = lowerNoTone.replace(/[?!.,]+/g, '').split(/\s+/).filter((w) => w.length >= 3);

        const matched = cleanWords.filter((w) => lowerCustom.includes(w));
        const matchedNoTone = cleanNoTone.filter((w) => customNoTone.includes(w));

        const maxMatch = Math.max(matched.length, matchedNoTone.length);

        if (
          cleanWords.length > 0 &&
          (maxMatch / cleanWords.length >= 0.33 ||
            matched.some((w) => w.length >= 5) ||
            matchedNoTone.some((w) => w.length >= 5))
        ) {
          return true;
        }
      }
    }

    return false;
  }
}

module.exports = new ServerKnowledgeService();
