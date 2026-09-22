const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const { config } = require('../config/env');

/**
 * Danh mục tính năng có thể bật/tắt trong bot
 */
const DEFAULT_FEATURES = {
  moderation: {
    name: 'Lọc ngôn từ độc hại & Hate Speech',
    description: 'Tự động phát hiện và xử lý tin nhắn xúc phạm, thù ghét',
    defaultState: true,
  },
  welcome: {
    name: 'Thông báo Chào mừng thành viên mới',
    description: 'Gửi thiệp chào mừng khi có thành viên mới vào Server',
    defaultState: true,
  },
  leave: {
    name: 'Thông báo Tạm biệt thành viên rời đi',
    description: 'Gửi thông báo khi có thành viên rời khỏi Server',
    defaultState: true,
  },
  ai: {
    name: 'Trợ lý AI Assistant (!ask & /ask)',
    description: 'Giải đáp thắc mắc người dùng bằng trí tuệ nhân tạo và tìm kiếm mạng',
    defaultState: true,
  },
  music: {
    name: 'Hệ thống Phát nhạc (s!play & /music)',
    description: 'Phát nhạc chất lượng cao từ YouTube, Spotify, File trực tiếp trong phòng Voice',
    defaultState: true,
  },
};

/**
 * GuildSettingsService
 * Quản lý bật/tắt các tính năng, kênh thông báo và Model AI theo từng Server (Guild)
 * Tuân thủ Single Responsibility Principle (SRP)
 */
class GuildSettingsService {
  constructor() {
    // Map lưu trữ: Map<guildId, { features: Map<featureKey, boolean>, channels: { welcomeChannelId: string|null, leaveChannelId: string|null }, ai: { geminiModel: string|null, openrouterModel: string|null } }>
    this.settings = new Map();
    this.storagePath = path.resolve(process.cwd(), 'data', 'guild_settings.json');
    this.loadFromDisk();
  }

  /**
   * Chuẩn hóa tên tính năng
   * @param {string} [feature]
   * @returns {string|null}
   */
  normalizeFeature(feature) {
    if (!feature || typeof feature !== 'string') return null;
    const cleaned = feature.replace(/[<>]/g, '').trim().toLowerCase();

    if (cleaned === 'all' || cleaned === 'tat_ca' || cleaned === 'tatca') {
      return 'all';
    }
    if (cleaned === 'moderation' || cleaned === 'toxic' || cleaned === 'loc_ngon_tu' || cleaned === 'kiem_duyet') {
      return 'moderation';
    }
    if (cleaned === 'welcome' || cleaned === 'chao_mung' || cleaned === 'join') {
      return 'welcome';
    }
    if (cleaned === 'leave' || cleaned === 'tam_biet' || cleaned === 'roi_di') {
      return 'leave';
    }
    if (cleaned === 'ai' || cleaned === 'bot_ai' || cleaned === 'assistant' || cleaned === 'hoi_dap' || cleaned === 'ask') {
      return 'ai';
    }
    if (cleaned === 'music' || cleaned === 'am_nhac' || cleaned === 'nhac' || cleaned === 'play' || cleaned === 'phat_nhac') {
      return 'music';
    }

    return DEFAULT_FEATURES[cleaned] ? cleaned : null;
  }

  /**
   * Chuẩn hóa loại kênh thông báo (welcome | leave | all)
   * @param {string} [type]
   * @returns {'welcome' | 'leave' | 'all'}
   */
  normalizeNotificationType(type = 'welcome') {
    if (!type || typeof type !== 'string') return 'welcome';
    const cleaned = type.replace(/[<>]/g, '').trim().toLowerCase();

    if (cleaned === 'leave' || cleaned === 'tam_biet' || cleaned === 'roi_di' || cleaned === 'out' || cleaned === 'bye') {
      return 'leave';
    }
    if (cleaned === 'all' || cleaned === 'tat_ca' || cleaned === 'tatca' || cleaned === 'both' || cleaned === 'chung') {
      return 'all';
    }
    return 'welcome';
  }

  /**
   * Lấy thông tin hiển thị của tính năng
   * @param {string} feature
   * @returns {{ name: string, description: string }}
   */
  getFeatureMeta(feature) {
    const key = this.normalizeFeature(feature);
    if (key === 'all') {
      return { name: 'Tất cả các tính năng', description: 'Áp dụng cho toàn bộ tính năng của Bot' };
    }
    return DEFAULT_FEATURES[key] || { name: feature, description: 'Tính năng tùy chỉnh' };
  }

  /**
   * Tải dữ liệu cài đặt từ file JSON
   */
  loadFromDisk() {
    try {
      const dataDir = path.dirname(this.storagePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.storagePath)) {
        const rawData = fs.readFileSync(this.storagePath, 'utf8');
        const parsed = JSON.parse(rawData);

        for (const [guildId, guildData] of Object.entries(parsed)) {
          const featMap = new Map();
          const channelConfig = {
            welcomeChannelId: null,
            leaveChannelId: null,
          };
          const aiConfig = {
            geminiModel: null,
            openrouterModel: null,
            primaryProvider: null,
          };

          const knowledgeConfig = {
            channelIds: [],
            messageId: null,
            messageChannelId: null,
            customText: null,
          };

          // Hỗ trợ cả cấu trúc cũ (chỉ lưu boolean) lẫn cấu trúc mới
          if (typeof guildData === 'object' && guildData !== null) {
            for (const [key, value] of Object.entries(guildData)) {
              if (key === 'welcomeChannelId') {
                channelConfig.welcomeChannelId = typeof value === 'string' ? value : null;
              } else if (key === 'leaveChannelId') {
                channelConfig.leaveChannelId = typeof value === 'string' ? value : null;
              } else if (key === 'ai' && typeof value === 'object' && value !== null) {
                aiConfig.geminiModel = typeof value.geminiModel === 'string' ? value.geminiModel : null;
                aiConfig.openrouterModel = typeof value.openrouterModel === 'string' ? value.openrouterModel : null;
                aiConfig.primaryProvider = typeof value.primaryProvider === 'string' ? value.primaryProvider : null;
              } else if (key === 'knowledge' && typeof value === 'object' && value !== null) {
                // 1. Channel IDs array
                if (Array.isArray(value.channelIds)) {
                  knowledgeConfig.channelIds = value.channelIds.filter((id) => typeof id === 'string');
                } else if (typeof value.channelId === 'string' && value.channelId) {
                  // Backward-compat: nâng cấp từ cấu trúc cũ channelId → channelIds
                  knowledgeConfig.channelIds = [value.channelId];
                }

                // 2. Messages array: Array<{ channelId: string, messageId: string }>
                if (Array.isArray(value.messages)) {
                  knowledgeConfig.messages = value.messages
                    .filter((m) => m && typeof m === 'object' && m.channelId && m.messageId)
                    .map((m) => ({ channelId: String(m.channelId), messageId: String(m.messageId) }));
                } else if (typeof value.messageId === 'string' && value.messageId && typeof value.messageChannelId === 'string' && value.messageChannelId) {
                  // Backward-compat: migrate single messageId / messageChannelId → messages
                  knowledgeConfig.messages = [{ channelId: value.messageChannelId, messageId: value.messageId }];
                }

                // 3. Custom Texts array: Array<string>
                if (Array.isArray(value.customTexts)) {
                  knowledgeConfig.customTexts = value.customTexts
                    .filter((t) => typeof t === 'string' && t.trim())
                    .map((t) => t.trim());
                } else if (typeof value.customText === 'string' && value.customText.trim()) {
                  // Backward-compat: migrate single customText → customTexts
                  knowledgeConfig.customTexts = [value.customText.trim()];
                }
              } else if (typeof value === 'boolean') {
                featMap.set(key, value);
              }
            }
          }

          this.settings.set(guildId, {
            features: featMap,
            channels: channelConfig,
            ai: aiConfig,
            knowledge: knowledgeConfig,
          });
        }
        logger.info('[Settings] Đã nạp cấu hình tính năng & kênh thông báo các Guild từ bộ nhớ.');
      }
    } catch (error) {
      logger.warn(`[Settings] Không thể nạp file guild_settings.json: ${error.message}`);
    }
  }

  /**
   * Lưu dữ liệu cài đặt vào file JSON
   */
  saveToDisk() {
    try {
      let exportData = {};
      if (fs.existsSync(this.storagePath)) {
        try {
          exportData = JSON.parse(fs.readFileSync(this.storagePath, 'utf8')) || {};
        } catch {
          exportData = {};
        }
      }

      for (const [guildId, guildConfig] of this.settings.entries()) {
        if (!exportData[guildId]) {
          exportData[guildId] = {};
        }

        // Lưu features
        for (const [feat, state] of guildConfig.features.entries()) {
          exportData[guildId][feat] = state;
        }

        // Lưu channels welcome/leave
        if (guildConfig.channels.welcomeChannelId) {
          exportData[guildId].welcomeChannelId = guildConfig.channels.welcomeChannelId;
        } else {
          delete exportData[guildId].welcomeChannelId;
        }
        if (guildConfig.channels.leaveChannelId) {
          exportData[guildId].leaveChannelId = guildConfig.channels.leaveChannelId;
        } else {
          delete exportData[guildId].leaveChannelId;
        }

        // Lưu AI Model config
        if (guildConfig.ai && (guildConfig.ai.geminiModel || guildConfig.ai.openrouterModel || guildConfig.ai.primaryProvider)) {
          exportData[guildId].ai = {
            geminiModel: guildConfig.ai.geminiModel || null,
            openrouterModel: guildConfig.ai.openrouterModel || null,
            primaryProvider: guildConfig.ai.primaryProvider || null,
          };
        } else {
          delete exportData[guildId].ai;
        }

        // Lưu Dynamic Knowledge config (Multi-channel, Multi-message, Multi-text)
        const hasKnowledgeChannels = Array.isArray(guildConfig.knowledge?.channelIds) && guildConfig.knowledge.channelIds.length > 0;
        const hasKnowledgeMessages = Array.isArray(guildConfig.knowledge?.messages) && guildConfig.knowledge.messages.length > 0;
        const hasKnowledgeTexts = Array.isArray(guildConfig.knowledge?.customTexts) && guildConfig.knowledge.customTexts.length > 0;

        if (guildConfig.knowledge && (hasKnowledgeChannels || hasKnowledgeMessages || hasKnowledgeTexts)) {
          exportData[guildId].knowledge = {
            channelIds: hasKnowledgeChannels ? guildConfig.knowledge.channelIds : [],
            messages: hasKnowledgeMessages ? guildConfig.knowledge.messages : [],
            customTexts: hasKnowledgeTexts ? guildConfig.knowledge.customTexts : [],
          };
        } else {
          delete exportData[guildId].knowledge;
        }
      }

      fs.writeFileSync(this.storagePath, JSON.stringify(exportData, null, 2), 'utf8');
    } catch (error) {
      logger.error('[Settings] Lỗi khi lưu file guild_settings.json:', error);
    }
  }

  /**
   * Lấy hoặc khởi tạo cấu trúc cài đặt của Guild
   * @param {string} guildId
   * @returns {{ features: Map<string, boolean>, channels: { welcomeChannelId: string|null, leaveChannelId: string|null }, ai: { geminiModel: string|null, openrouterModel: string|null, primaryProvider: string|null }, knowledge: { channelIds: string[], messages: Array<{ channelId: string, messageId: string }>, customTexts: string[] } }}
   */
  getGuildConfig(guildId) {
    if (!this.settings.has(guildId)) {
      this.settings.set(guildId, {
        features: new Map(),
        channels: {
          welcomeChannelId: null,
          leaveChannelId: null,
        },
        ai: {
          geminiModel: null,
          openrouterModel: null,
          primaryProvider: null,
        },
        knowledge: {
          channelIds: [],
          messages: [],
          customTexts: [],
        },
      });
    }
    return this.settings.get(guildId);
  }

  /**
   * Lấy Model AI đang sử dụng cho Guild
   * @param {string} guildId
   * @param {'gemini' | 'openrouter'} provider
   * @returns {string}
   */
  getAIModel(guildId, provider = 'gemini') {
    const normProv = (provider || 'gemini').toLowerCase();
    const defaultGemini = config.ai?.geminiModel || 'gemini-3.6-flash';
    const defaultOpenRouter = config.ai?.openrouterModel || 'openrouter/free';

    if (!guildId) {
      return normProv === 'gemini' ? defaultGemini : defaultOpenRouter;
    }

    const guildConfig = this.getGuildConfig(guildId);
    if (normProv === 'gemini') {
      return guildConfig.ai?.geminiModel || defaultGemini;
    }
    return guildConfig.ai?.openrouterModel || defaultOpenRouter;
  }

  /**
   * Cài đặt Model AI tùy chỉnh cho Guild
   * @param {string} guildId
   * @param {'gemini' | 'openrouter'} provider
   * @param {string} model
   * @returns {{ success: boolean, provider: string, model: string }}
   */
  setAIModel(guildId, provider, model) {
    if (!guildId || !model) return { success: false, provider, model };
    const normProv = (provider || 'gemini').toLowerCase() === 'openrouter' ? 'openrouter' : 'gemini';
    const guildConfig = this.getGuildConfig(guildId);

    if (!guildConfig.ai) {
      guildConfig.ai = { geminiModel: null, openrouterModel: null };
    }

    if (normProv === 'gemini') {
      guildConfig.ai.geminiModel = model.trim();
    } else {
      guildConfig.ai.openrouterModel = model.trim();
    }

    this.saveToDisk();
    logger.info(`[Settings] Guild ${guildId}: Đã cài đặt AI Model [${normProv}] -> "${model.trim()}"`);
    return { success: true, provider: normProv, model: model.trim() };
  }

  /**
   * Lấy Nhà cung cấp AI chính (Primary Provider) của Guild
   * @param {string} guildId
   * @returns {'gemini' | 'openrouter'}
   */
  getAIPrimaryProvider(guildId) {
    const defaultPrimary = config.ai?.primaryProvider === 'openrouter' ? 'openrouter' : 'gemini';
    if (!guildId) return defaultPrimary;

    const guildConfig = this.getGuildConfig(guildId);
    if (!guildConfig.ai?.primaryProvider) return defaultPrimary;
    return guildConfig.ai.primaryProvider.toLowerCase() === 'openrouter' ? 'openrouter' : 'gemini';
  }

  /**
   * Cài đặt Nhà cung cấp AI chính (Primary Provider) cho Guild
   * @param {string} guildId
   * @param {'gemini' | 'openrouter'} provider
   * @returns {{ success: boolean, primaryProvider: string }}
   */
  setAIPrimaryProvider(guildId, provider) {
    if (!guildId || !provider) return { success: false, primaryProvider: 'gemini' };
    const normProv = provider.toLowerCase() === 'openrouter' ? 'openrouter' : 'gemini';
    const guildConfig = this.getGuildConfig(guildId);

    if (!guildConfig.ai) {
      guildConfig.ai = { geminiModel: null, openrouterModel: null, primaryProvider: null };
    }

    guildConfig.ai.primaryProvider = normProv;
    this.saveToDisk();
    logger.info(`[Settings] Guild ${guildId}: Đã cài đặt AI Primary Provider -> "${normProv}"`);
    return { success: true, primaryProvider: normProv };
  }

  /**
   * Đặt lại Model AI về mặc định hệ thống
   * @param {string} guildId
   * @param {'gemini' | 'openrouter' | 'primary' | 'all'} [provider='all']
   * @returns {{ success: boolean, provider: string }}
   */
  resetAIModel(guildId, provider = 'all') {
    if (!guildId) return { success: false, provider };
    const normProv = (provider || 'all').toLowerCase();
    const guildConfig = this.getGuildConfig(guildId);

    if (!guildConfig.ai) {
      guildConfig.ai = { geminiModel: null, openrouterModel: null, primaryProvider: null };
    }

    if (normProv === 'all' || normProv === 'gemini') {
      guildConfig.ai.geminiModel = null;
    }
    if (normProv === 'all' || normProv === 'openrouter') {
      guildConfig.ai.openrouterModel = null;
    }
    if (normProv === 'all' || normProv === 'primary') {
      guildConfig.ai.primaryProvider = null;
    }

    this.saveToDisk();
    logger.info(`[Settings] Guild ${guildId}: Đã đặt lại AI Model/Primary [${normProv}] về mặc định.`);
    return { success: true, provider: normProv };
  }

  /**
   * Lấy toàn bộ thông tin cấu hình AI của Guild
   * @param {string} guildId
   * @returns {object}
   */
  getAISettings(guildId) {
    const defaultGemini = config.ai?.geminiModel || 'gemini-3.6-flash';
    const defaultOpenRouter = config.ai?.openrouterModel || 'openrouter/free';
    const defaultPrimary = config.ai?.primaryProvider === 'openrouter' ? 'openrouter' : 'gemini';
    const guildConfig = guildId ? this.getGuildConfig(guildId) : { ai: {} };

    const activePrimary = guildConfig.ai?.primaryProvider || defaultPrimary;

    return {
      primaryProvider: activePrimary,
      isCustomPrimary: Boolean(guildConfig.ai?.primaryProvider),
      defaultPrimaryProvider: defaultPrimary,
      geminiModel: guildConfig.ai?.geminiModel || defaultGemini,
      isCustomGemini: Boolean(guildConfig.ai?.geminiModel),
      defaultGeminiModel: defaultGemini,
      openrouterModel: guildConfig.ai?.openrouterModel || defaultOpenRouter,
      isCustomOpenrouter: Boolean(guildConfig.ai?.openrouterModel),
      defaultOpenrouterModel: defaultOpenRouter,
    };
  }

  /**
   * Lấy cấu hình tri thức của Guild (Đa kênh, Đa tin nhắn, Đa văn bản)
   * @param {string} guildId
   * @returns {{ channelIds: string[], messages: Array<{ channelId: string, messageId: string }>, customTexts: string[], messageId: string|null, messageChannelId: string|null, customText: string|null }}
   */
  getKnowledgeConfig(guildId) {
    if (!guildId) {
      return { channelIds: [], messages: [], customTexts: [], messageId: null, messageChannelId: null, customText: null };
    }
    const guildConfig = this.getGuildConfig(guildId);

    if (!guildConfig.knowledge) {
      guildConfig.knowledge = { channelIds: [], messages: [], customTexts: [] };
    }

    if (!Array.isArray(guildConfig.knowledge.channelIds)) {
      guildConfig.knowledge.channelIds = [];
    }

    if (!Array.isArray(guildConfig.knowledge.messages)) {
      guildConfig.knowledge.messages = [];
    }

    if (!Array.isArray(guildConfig.knowledge.customTexts)) {
      guildConfig.knowledge.customTexts = [];
    }

    const messages = guildConfig.knowledge.messages;
    const customTexts = guildConfig.knowledge.customTexts;

    return {
      channelIds: guildConfig.knowledge.channelIds,
      messages,
      customTexts,
      // Backward compatibility getters
      messageId: messages.length > 0 ? messages[0].messageId : null,
      messageChannelId: messages.length > 0 ? messages[0].channelId : null,
      customText: customTexts.length > 0 ? customTexts.join('\n\n') : null,
    };
  }

  /**
   * Thêm một Kênh vào danh sách kênh tri thức của Server
   * @param {string} guildId
   * @param {string} channelId
   * @returns {{ success: boolean, channelId: string, channelIds: string[], alreadyExists: boolean }}
   */
  addKnowledgeChannel(guildId, channelId) {
    if (!guildId || !channelId) return { success: false, channelId, channelIds: [], alreadyExists: false };
    const guildConfig = this.getGuildConfig(guildId);
    if (!guildConfig.knowledge) {
      guildConfig.knowledge = { channelIds: [], messages: [], customTexts: [] };
    }
    if (!Array.isArray(guildConfig.knowledge.channelIds)) {
      guildConfig.knowledge.channelIds = [];
    }
    const alreadyExists = guildConfig.knowledge.channelIds.includes(channelId);
    if (!alreadyExists) {
      guildConfig.knowledge.channelIds.push(channelId);
      this.saveToDisk();
      try {
        const serverKnowledgeService = require('./ai/serverKnowledgeService');
        serverKnowledgeService.invalidateCache(guildId);
      } catch {}
      logger.info(`[Settings] Guild ${guildId}: Đã thêm Kênh Tri Thức AI -> "${channelId}"`);
    }
    return { success: true, channelId, channelIds: guildConfig.knowledge.channelIds, alreadyExists };
  }

  /**
   * Xóa một Kênh khỏi danh sách kênh tri thức của Server
   * @param {string} guildId
   * @param {string} channelId
   * @returns {{ success: boolean, channelId: string, channelIds: string[], notFound: boolean }}
   */
  removeKnowledgeChannel(guildId, channelId) {
    if (!guildId || !channelId) return { success: false, channelId, channelIds: [], notFound: true };
    const guildConfig = this.getGuildConfig(guildId);
    if (!Array.isArray(guildConfig.knowledge?.channelIds)) {
      return { success: false, channelId, channelIds: [], notFound: true };
    }
    const before = guildConfig.knowledge.channelIds.length;
    guildConfig.knowledge.channelIds = guildConfig.knowledge.channelIds.filter((id) => id !== channelId);
    const notFound = guildConfig.knowledge.channelIds.length === before;
    if (!notFound) {
      this.saveToDisk();
      try {
        const serverKnowledgeService = require('./ai/serverKnowledgeService');
        serverKnowledgeService.invalidateCache(guildId);
      } catch {}
      logger.info(`[Settings] Guild ${guildId}: Đã xóa Kênh Tri Thức AI -> "${channelId}"`);
    }
    return { success: true, channelId, channelIds: guildConfig.knowledge.channelIds, notFound };
  }

  /**
   * Thêm tin nhắn chỉ định vào danh sách nguồn tri thức cho AI (Hỗ trợ nhiều tin nhắn)
   * @param {string} guildId
   * @param {string} channelId
   * @param {string} messageId
   * @returns {{ success: boolean, channelId: string, messageId: string, messages: Array<{ channelId: string, messageId: string }>, alreadyExists: boolean }}
   */
  addKnowledgeMessage(guildId, channelId, messageId) {
    if (!guildId || !channelId || !messageId) {
      return { success: false, channelId, messageId, messages: [], alreadyExists: false };
    }
    const guildConfig = this.getGuildConfig(guildId);
    if (!guildConfig.knowledge) {
      guildConfig.knowledge = { channelIds: [], messages: [], customTexts: [] };
    }
    if (!Array.isArray(guildConfig.knowledge.messages)) {
      guildConfig.knowledge.messages = [];
    }

    const alreadyExists = guildConfig.knowledge.messages.some((m) => m.messageId === messageId);
    if (!alreadyExists) {
      guildConfig.knowledge.messages.push({ channelId, messageId });
      this.saveToDisk();
      try {
        const serverKnowledgeService = require('./ai/serverKnowledgeService');
        serverKnowledgeService.invalidateCache(guildId);
      } catch {}
      logger.info(
        `[Settings] Guild ${guildId}: Đã thêm Tin Nhắn Tri Thức AI -> Kênh ${channelId}, Message ${messageId} (Tổng: ${guildConfig.knowledge.messages.length} tin)`
      );
    }
    return {
      success: true,
      channelId,
      messageId,
      messages: guildConfig.knowledge.messages,
      alreadyExists,
    };
  }

  /**
   * Xóa một tin nhắn khỏi danh sách nguồn tri thức cho AI
   * @param {string} guildId
   * @param {string} messageId
   * @returns {{ success: boolean, messageId: string, messages: Array<{ channelId: string, messageId: string }>, notFound: boolean }}
   */
  removeKnowledgeMessage(guildId, messageId) {
    if (!guildId || !messageId) return { success: false, messageId, messages: [], notFound: true };
    const guildConfig = this.getGuildConfig(guildId);
    if (!Array.isArray(guildConfig.knowledge?.messages)) {
      return { success: false, messageId, messages: [], notFound: true };
    }

    const before = guildConfig.knowledge.messages.length;
    guildConfig.knowledge.messages = guildConfig.knowledge.messages.filter((m) => m.messageId !== messageId);
    const notFound = guildConfig.knowledge.messages.length === before;

    if (!notFound) {
      this.saveToDisk();
      try {
        const serverKnowledgeService = require('./ai/serverKnowledgeService');
        serverKnowledgeService.invalidateCache(guildId);
      } catch {}
      logger.info(`[Settings] Guild ${guildId}: Đã xóa Tin Nhắn Tri Thức AI ID "${messageId}"`);
    }

    return {
      success: true,
      messageId,
      messages: guildConfig.knowledge.messages,
      notFound,
    };
  }

  /**
   * Cài đặt Tin nhắn cụ thể làm nguồn tri thức cho AI (Hỗ trợ thêm/thay thế backward-compat)
   * @param {string} guildId
   * @param {string} channelId
   * @param {string} messageId
   * @returns {{ success: boolean, channelId: string, messageId: string, messages: Array<{ channelId: string, messageId: string }> }}
   */
  setKnowledgeMessage(guildId, channelId, messageId) {
    return this.addKnowledgeMessage(guildId, channelId, messageId);
  }

  /**
   * Thêm một đoạn văn bản tùy chỉnh vào danh sách tri thức của Server
   * @param {string} guildId
   * @param {string} text
   * @returns {{ success: boolean, text: string, customTexts: string[] }}
   */
  addKnowledgeText(guildId, text) {
    if (!guildId || !text || !text.trim()) {
      return { success: false, text: '', customTexts: [] };
    }
    const cleanText = text.trim();
    const guildConfig = this.getGuildConfig(guildId);
    if (!guildConfig.knowledge) {
      guildConfig.knowledge = { channelIds: [], messages: [], customTexts: [] };
    }
    if (!Array.isArray(guildConfig.knowledge.customTexts)) {
      guildConfig.knowledge.customTexts = [];
    }

    guildConfig.knowledge.customTexts.push(cleanText);
    this.saveToDisk();
    try {
      const serverKnowledgeService = require('./ai/serverKnowledgeService');
      serverKnowledgeService.invalidateCache(guildId);
    } catch {}
    logger.info(
      `[Settings] Guild ${guildId}: Đã thêm Văn Bản Tri Thức AI (${cleanText.length} ký tự, Tổng: ${guildConfig.knowledge.customTexts.length} đoạn)`
    );

    return {
      success: true,
      text: cleanText,
      customTexts: guildConfig.knowledge.customTexts,
    };
  }

  /**
   * Xóa một đoạn văn bản tùy chỉnh khỏi danh sách tri thức theo số thứ tự (1-based index) hoặc nội dung
   * @param {string} guildId
   * @param {number|string} indexOrContent
   * @returns {{ success: boolean, customTexts: string[], removedText: string|null, notFound: boolean }}
   */
  removeKnowledgeText(guildId, indexOrContent) {
    if (!guildId) return { success: false, customTexts: [], removedText: null, notFound: true };
    const guildConfig = this.getGuildConfig(guildId);
    if (!Array.isArray(guildConfig.knowledge?.customTexts) || guildConfig.knowledge.customTexts.length === 0) {
      return { success: false, customTexts: [], removedText: null, notFound: true };
    }

    let removedText = null;
    let notFound = true;

    // Trường hợp truyền vào số thứ tự (1, 2, 3...)
    const numIdx = parseInt(indexOrContent, 10);
    if (!isNaN(numIdx) && numIdx >= 1 && numIdx <= guildConfig.knowledge.customTexts.length) {
      const actualIdx = numIdx - 1;
      removedText = guildConfig.knowledge.customTexts[actualIdx];
      guildConfig.knowledge.customTexts.splice(actualIdx, 1);
      notFound = false;
    } else if (typeof indexOrContent === 'string' && indexOrContent.trim()) {
      const matchIdx = guildConfig.knowledge.customTexts.findIndex(
        (t) => t === indexOrContent.trim() || t.includes(indexOrContent.trim())
      );
      if (matchIdx !== -1) {
        removedText = guildConfig.knowledge.customTexts[matchIdx];
        guildConfig.knowledge.customTexts.splice(matchIdx, 1);
        notFound = false;
      }
    }

    if (!notFound) {
      this.saveToDisk();
      try {
        const serverKnowledgeService = require('./ai/serverKnowledgeService');
        serverKnowledgeService.invalidateCache(guildId);
      } catch {}
      logger.info(`[Settings] Guild ${guildId}: Đã xóa Văn Bản Tri Thức AI (Còn lại: ${guildConfig.knowledge.customTexts.length} đoạn)`);
    }

    return {
      success: !notFound,
      customTexts: guildConfig.knowledge.customTexts,
      removedText,
      notFound,
    };
  }

  /**
   * Cài đặt đoạn văn bản / nội quy tri thức cho AI (Backward compatibility)
   * @param {string} guildId
   * @param {string} customText
   * @returns {{ success: boolean, customText: string|null, customTexts: string[] }}
   */
  setKnowledgeText(guildId, customText) {
    if (!guildId) return { success: false, customText: null, customTexts: [] };
    const guildConfig = this.getGuildConfig(guildId);
    if (!guildConfig.knowledge) {
      guildConfig.knowledge = { channelIds: [], messages: [], customTexts: [] };
    }
    if (!customText || !customText.trim()) {
      guildConfig.knowledge.customTexts = [];
    } else {
      guildConfig.knowledge.customTexts = [customText.trim()];
    }
    this.saveToDisk();
    try {
      const serverKnowledgeService = require('./ai/serverKnowledgeService');
      serverKnowledgeService.invalidateCache(guildId);
    } catch {}
    logger.info(
      `[Settings] Guild ${guildId}: Đã cập nhật Văn Bản Tri Thức AI (${customText ? customText.length : 0} ký tự)`
    );
    return {
      success: true,
      customText: guildConfig.knowledge.customTexts.join('\n\n') || null,
      customTexts: guildConfig.knowledge.customTexts,
    };
  }

  /**
   * Đặt lại cấu hình tri thức của Server về mặc định
   * @param {string} guildId
   * @returns {{ success: boolean }}
   */
  resetKnowledgeConfig(guildId) {
    if (!guildId) return { success: false };
    const guildConfig = this.getGuildConfig(guildId);
    guildConfig.knowledge = { channelIds: [], messages: [], customTexts: [] };
    this.saveToDisk();
    try {
      const serverKnowledgeService = require('./ai/serverKnowledgeService');
      serverKnowledgeService.invalidateCache(guildId);
    } catch {}
    logger.info(`[Settings] Guild ${guildId}: Đã đặt lại cấu hình Tri Thức AI về mặc định.`);
    return { success: true };
  }

  /**
   * Kiểm tra một tính năng có đang được BẬT hay không
   * @param {string} guildId
   * @param {string} feature
   * @returns {boolean}
   */
  isFeatureEnabled(guildId, feature) {
    if (!guildId) return true;
    const normKey = this.normalizeFeature(feature);
    if (!normKey || normKey === 'all') return true;

    const guildConfig = this.getGuildConfig(guildId);
    if (guildConfig.features.has(normKey)) {
      return guildConfig.features.get(normKey);
    }

    // Mặc định là true nếu chưa cấu hình
    return DEFAULT_FEATURES[normKey] ? DEFAULT_FEATURES[normKey].defaultState : true;
  }

  /**
   * Bật hoặc Tắt tính năng
   * @param {string} guildId
   * @param {string} feature
   * @param {boolean} enabled
   * @returns {{ success: boolean, feature: string, featureName: string, enabled: boolean }}
   */
  setFeatureState(guildId, feature, enabled) {
    const normKey = this.normalizeFeature(feature);
    if (!normKey) {
      return { success: false, feature, featureName: feature, enabled };
    }

    const guildConfig = this.getGuildConfig(guildId);

    if (normKey === 'all') {
      for (const feat of Object.keys(DEFAULT_FEATURES)) {
        guildConfig.features.set(feat, enabled);
      }
    } else {
      guildConfig.features.set(normKey, enabled);
    }

    this.saveToDisk();
    logger.info(`[Settings] Guild ${guildId}: Đã ${enabled ? 'BẬT' : 'TẮT'} tính năng [${normKey}]`);

    const meta = this.getFeatureMeta(normKey);
    return {
      success: true,
      feature: normKey,
      featureName: meta.name,
      enabled,
    };
  }

  /**
   * Đảo ngược trạng thái bật/tắt của tính năng
   * @param {string} guildId
   * @param {string} feature
   * @returns {{ success: boolean, feature: string, featureName: string, enabled: boolean }}
   */
  toggleFeature(guildId, feature) {
    const currentState = this.isFeatureEnabled(guildId, feature);
    return this.setFeatureState(guildId, feature, !currentState);
  }

  /**
   * Lấy toàn bộ trạng thái tính năng của Guild
   * @param {string} guildId
   * @returns {Array<{ key: string, name: string, description: string, enabled: boolean }>}
   */
  getAllFeatureStates(guildId) {
    const result = [];
    for (const [key, meta] of Object.entries(DEFAULT_FEATURES)) {
      const enabled = this.isFeatureEnabled(guildId, key);
      result.push({
        key,
        name: meta.name,
        description: meta.description,
        enabled,
      });
    }
    return result;
  }

  /**
   * Cài đặt kênh thông báo (welcome / leave / all) cho Server
   * @param {string} guildId
   * @param {'welcome' | 'leave' | 'all'} type
   * @param {string} channelId
   * @returns {{ success: boolean, type: string, channelId: string }}
   */
  setNotificationChannel(guildId, type = 'welcome', channelId) {
    const normType = this.normalizeNotificationType(type);
    const guildConfig = this.getGuildConfig(guildId);

    if (normType === 'all') {
      guildConfig.channels.welcomeChannelId = channelId;
      guildConfig.channels.leaveChannelId = channelId;
    } else if (normType === 'leave') {
      guildConfig.channels.leaveChannelId = channelId;
    } else {
      guildConfig.channels.welcomeChannelId = channelId;
    }

    this.saveToDisk();
    logger.info(`[Settings] Guild ${guildId}: Đã cài đặt kênh thông báo [${normType}] -> ${channelId}`);

    return {
      success: true,
      type: normType,
      channelId,
    };
  }

  /**
   * Lấy ID kênh thông báo đã cài đặt cho Server (nếu có)
   * @param {string} guildId
   * @param {'welcome' | 'leave'} type
   * @returns {string | null}
   */
  getNotificationChannel(guildId, type = 'welcome') {
    if (!guildId) return null;
    const guildConfig = this.getGuildConfig(guildId);
    if (type === 'leave') {
      return guildConfig.channels.leaveChannelId || null;
    }
    return guildConfig.channels.welcomeChannelId || null;
  }

  /**
   * Lấy toàn bộ cấu hình kênh thông báo của Guild
   * @param {string} guildId
   * @returns {{ welcomeChannelId: string | null, leaveChannelId: string | null }}
   */
  getNotificationSettings(guildId) {
    if (!guildId) return { welcomeChannelId: null, leaveChannelId: null };
    const guildConfig = this.getGuildConfig(guildId);
    return {
      welcomeChannelId: guildConfig.channels.welcomeChannelId,
      leaveChannelId: guildConfig.channels.leaveChannelId,
    };
  }

  /**
   * Đặt lại kênh thông báo về mặc định (kênh hệ thống)
   * @param {string} guildId
   * @param {'welcome' | 'leave' | 'all'} type
   * @returns {{ success: boolean, type: string }}
   */
  resetNotificationChannel(guildId, type = 'all') {
    const normType = this.normalizeNotificationType(type);
    const guildConfig = this.getGuildConfig(guildId);

    if (normType === 'all') {
      guildConfig.channels.welcomeChannelId = null;
      guildConfig.channels.leaveChannelId = null;
    } else if (normType === 'leave') {
      guildConfig.channels.leaveChannelId = null;
    } else {
      guildConfig.channels.welcomeChannelId = null;
    }

    this.saveToDisk();
    logger.info(`[Settings] Guild ${guildId}: Đã đặt lại kênh thông báo [${normType}] về mặc định hệ thống.`);

    return {
      success: true,
      type: normType,
    };
  }
}

module.exports = new GuildSettingsService();
