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
  constructor() {
    this.cache = new Map();
    this.cacheTtlMs = 3 * 60 * 1000; // TTL 3 phút
  }

  /**
   * Xóa cache dữ liệu tri thức của Guild (dùng khi Admin cập nhật cấu hình tri thức)
   * @param {string|null} [guildId]
   */
  invalidateCache(guildId = null) {
    if (guildId) {
      this.cache.delete(guildId);
      logger.info(`[ServerKnowledge] Đã làm mới (xóa) cache tri thức RAM cho Guild ${guildId}.`);
    } else {
      this.cache.clear();
      logger.info(`[ServerKnowledge] Đã làm mới (xóa) toàn bộ cache tri thức RAM.`);
    }
  }

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
   * Tự động đệm vào RAM (TTL 3 phút) giúp phản hồi tức thì (0ms) sau câu hỏi đầu tiên.
   * @param {import('discord.js').Guild} [guild]
   * @returns {Promise<string>}
   */
  async getKnowledgeForGuild(guild = null) {
    if (!guild || !guild.id) {
      return '';
    }

    // 0. Kiểm tra Cache trong RAM
    const cached = this.cache.get(guild.id);
    if (cached && cached.expiresAt > Date.now()) {
      logger.info(`[ServerKnowledge] Guild ${guild.id}: Phục vụ tri thức từ bộ nhớ đệm RAM (0ms).`);
      return cached.data;
    }

    const sections = [];

    if (guild && guild.id) {
      const guildSettingsService = require('../guildSettingsService');
      const knowledgeConfig = guildSettingsService.getKnowledgeConfig(guild.id);

      logger.info(
        `[ServerKnowledge] Guild ${guild.id}: Fetching tri thức từ Discord API... (channels=[${knowledgeConfig.channelIds?.join(',')}], ` +
        `messages=${knowledgeConfig.messages?.length || 0} msgs, customTexts=${knowledgeConfig.customTexts?.length || 0} texts)`
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

    const finalResult = sections.join('\n\n').trim();

    // Lưu vào RAM Cache với TTL 3 phút
    if (guild && guild.id) {
      this.cache.set(guild.id, {
        data: finalResult,
        expiresAt: Date.now() + this.cacheTtlMs,
      });
    }

    return finalResult;
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

    // 0. BẢO VỆ TRA CỨU THỰC TẾ: Nếu câu hỏi có ý định tìm kiếm người thật, tên thật, tuyển thủ, tiểu sử, tin tức, thế giới
    // thì BẮT BUỘC KHÔNG BỎ QUA TÌM KIẾM WEB (trả về false để kích hoạt Tavily Search RAG)
    const externalLookupKeywords = [
      'tên thật', 'ten that',
      'sinh năm', 'sinh nam', 'bao nhiêu tuổi', 'bao nhieu tuoi',
      'quê ở', 'que o', 'quê quán', 'que quan',
      'ở đâu', 'o dau', 'tại đâu', 'tai dau',
      'khi nào', 'khi nao', 'bao giờ', 'bao gio',
      'tiểu sử', 'tieu su', 'lịch sử', 'lich su',
      'tuyển thủ', 'tuyen thu', 'game thủ', 'game thu', 'streamer', 'player',
      'đội tuyển', 'doi tuyen', 'vô địch', 'vo dich',
      'lịch thi đấu', 'lich thi dau', 'kết quả', 'ket qua', 'bảng xếp hạng', 'bang xep hang',
      'tin tức', 'tin tuc', 'thời tiết', 'thoi tiet', 'giá vàng', 'gia vang',
      'quốc gia', 'quoc gia', 'thủ đô', 'thu do', 'dân số', 'dan so',
      'phim', 'bài hát', 'bai hat', 'ca sĩ', 'ca si', 'diễn viên', 'dien vien',
      'tổng thống', 'tong thong', 'thủ tướng', 'thu tuong',
    ];

    if (externalLookupKeywords.some((kw) => lower.includes(kw) || lowerNoTone.includes(kw))) {
      return false;
    }

    // 1. Kiểm tra từ khóa đặc thù về nội quy / server / role / bot (Cả Có Dấu & Không Dấu)
    const serverKnowledgeKeywords = [
      'nội quy', 'noi quy',
      'quy tắc server', 'quy tac server',
      'quy định server', 'quy dinh server',
      'luật server', 'luat server', 'luật máy chủ', 'luat may chu',
      'điều khoản server', 'dieu khoan server',
      'vi phạm quy định', 'vi pham quy dinh',
      'role', 'vai trò', 'vai tro',
      'vip', 'rank',
      'lệnh bot', 'lenh bot',
      'lệnh nghe nhạc', 'lenh nghe nhac',
      'lệnh play', 'lenh play',
      'liên hệ admin', 'lien he admin',
      'ban quản trị', 'ban quan tri', 'bqt',
      'ticket',
      'bật tính năng', 'bat tinh nang',
      'tắt tính năng', 'tat tinh nang',
      'lọc từ', 'loc tu',
      'bị xóa tin', 'bi xoa tin',
      'bị cảnh cáo', 'bi canh cao',
      'kênh chat', 'kenh chat',
    ];

    if (
      serverKnowledgeKeywords.some((kw) => lower.includes(kw) || lowerNoTone.includes(kw))
    ) {
      return true;
    }

    // Bộ Stop words tiếng Việt và trợ từ phổ biến (tránh nhận nhầm câu hỏi bên ngoài)
    const stopWords = new Set([
      'là', 'la', 'ai', 'gì', 'gi', 'nào', 'nao', 'sao', 'thế', 'the',
      'như', 'nhu', 'làm', 'lam', 'cho', 'hãy', 'hay', 'giới', 'gioi',
      'thiệu', 'thieu', 'về', 've', 'người', 'nguoi', 'này', 'nay',
      'đây', 'day', 'đó', 'do', 'kia', 'tôi', 'toi', 'mình', 'minh',
      'bạn', 'ban', 'của', 'cua', 'và', 'va', 'với', 'voi', 'ở', 'o',
      'tại', 'tai', 'trong', 'ngoài', 'ngoai', 'có', 'co', 'không', 'khong',
      'được', 'duoc', 'thì', 'thi', 'mà', 'ma', 'để', 'de', 'cần', 'can',
      'muốn', 'muon', 'biết', 'biet', 'hỏi', 'hoi', 'xin', 'vui', 'lòng',
      'một', 'mot', 'những', 'nhung', 'các', 'cac', 'mọi', 'moi',
      'nhiều', 'nhieu', 'ít', 'it', 'trước', 'truoc', 'sau', 'khi', 'nữa', 'nua',
      'vào', 'vao', 'ra', 'lên', 'len', 'xuống', 'xuong', 'từ', 'tu', 'đến', 'den',
      'đang', 'dang', 'sẽ', 'se', 'đã', 'da', 'vừa', 'vua', 'mới', 'moi', 'từng', 'tung',
      'hiện', 'hien', 'hiện tại', 'hien tai', 'bây giờ', 'bay gio', 'hôm nay', 'hom nay',
      'đâu', 'dau', 'đấy', 'day', 'nọ', 'no', 'cũng', 'cung', 'rồi', 'roi', 'chưa', 'chua',
      'luôn', 'luon', 'hết', 'het', 'rất', 'rat', 'quá', 'qua', 'lắm', 'lam', 'nhé', 'nhe',
      'nha', 'ạ', 'a', 'ơi', 'oi', 'hả', 'ha', 'phải', 'phai', 'bởi', 'boi', 'vì', 'vi',
      'do', 'nhưng', 'nhung', 'hoặc', 'hoac', 'nói', 'noi', 'bảo', 'bao', 'xem', 'thử', 'thu',
      'giúp', 'giup', 'thi', 'tên', 'ten', 'thật', 'that'
    ]);

    const extractMeaningfulWords = (text, isNoTone = false) => {
      const clean = (isNoTone ? removeVietnameseTones(text.toLowerCase()) : text.toLowerCase())
        .replace(/[?!.,;:()\[\]{}"'\\\/~`*+_\-\n\r\t]+/g, ' ')
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 2 && !stopWords.has(w));
      return clean;
    };

    const buildTokenSet = (text, isNoTone = false) => {
      const clean = (isNoTone ? removeVietnameseTones(text.toLowerCase()) : text.toLowerCase())
        .replace(/[?!.,;:()\[\]{}"'\\\/~`*+_\-\n\r\t]+/g, ' ')
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 2);
      return new Set(clean);
    };

    // 2. Kiểm tra độ trùng khớp với Dữ liệu tri thức động (Tin nhắn ghim + Custom text)
    const contextToSearch = (dynamicKnowledgeText || '').toLowerCase();
    const contextNoTone = removeVietnameseTones(contextToSearch);

    if (contextToSearch && contextToSearch.length > 20) {
      const contextTokensWithTone = buildTokenSet(contextToSearch, false);
      const contextTokensNoTone = buildTokenSet(contextNoTone, true);

      const queryMeaningfulWords = extractMeaningfulWords(lower, false);
      const queryMeaningfulNoTone = extractMeaningfulWords(lowerNoTone, true);

      if (queryMeaningfulWords.length > 0) {
        // So khớp nguyên từ (Word Token Matching), không so khớp chuỗi con (substring) để tránh nhận nhầm từ ngắn/tiếp vần
        const matchedWithTone = queryMeaningfulWords.filter((w) => contextTokensWithTone.has(w));
        const matchedNoTone = queryMeaningfulNoTone.filter((w) => contextTokensNoTone.has(w));

        const maxMatched = Math.max(matchedWithTone.length, matchedNoTone.length);
        const totalWords = queryMeaningfulWords.length;

        // Chỉ coi là tri thức nội bộ khi:
        // - Trùng khớp ít nhất 2 từ khóa ý nghĩa VÀ chiếm >= 60% tổng số từ khóa ý nghĩa của câu hỏi
        // - Hoặc câu hỏi ngắn (1 từ ý nghĩa) nhưng từ đó dài >= 4 ký tự không phải stop word và xuất hiện nguyên từ trong context
        const isStrongMatch =
          (maxMatched >= 2 && maxMatched / totalWords >= 0.6) ||
          (totalWords === 1 && maxMatched === 1 && (queryMeaningfulWords[0]?.length >= 4 || queryMeaningfulNoTone[0]?.length >= 4));

        if (isStrongMatch) {
          logger.info(`[ServerKnowledge] Câu hỏi "${query.slice(0, 50)}" khớp với nội dung ghim -> Ưu tiên nội bộ.`);
          return true;
        }
      }
    }

    // 3. Kiểm tra văn bản tùy chỉnh của Guild nếu chưa có dynamicKnowledgeText
    if (guild && guild.id && !dynamicKnowledgeText) {
      const guildSettingsService = require('../guildSettingsService');
      const knowledgeConfig = guildSettingsService.getKnowledgeConfig(guild.id);
      const customTexts = knowledgeConfig.customTexts || (knowledgeConfig.customText ? [knowledgeConfig.customText] : []);
      const combinedCustom = customTexts.join('\n').toLowerCase();

      if (combinedCustom && combinedCustom.length > 10) {
        const customTokensWithTone = buildTokenSet(combinedCustom, false);
        const customTokensNoTone = buildTokenSet(removeVietnameseTones(combinedCustom), true);

        const queryMeaningfulWords = extractMeaningfulWords(lower, false);
        const queryMeaningfulNoTone = extractMeaningfulWords(lowerNoTone, true);

        if (queryMeaningfulWords.length > 0) {
          const matched = queryMeaningfulWords.filter((w) => customTokensWithTone.has(w));
          const matchedNoTone = queryMeaningfulNoTone.filter((w) => customTokensNoTone.has(w));
          const maxMatch = Math.max(matched.length, matchedNoTone.length);
          const totalWords = queryMeaningfulWords.length;

          if (
            (maxMatch >= 2 && maxMatch / totalWords >= 0.6) ||
            (totalWords === 1 && maxMatch === 1 && (queryMeaningfulWords[0]?.length >= 4 || queryMeaningfulNoTone[0]?.length >= 4))
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }
}

module.exports = new ServerKnowledgeService();
