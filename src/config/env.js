const path = require('path');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

// Xác định môi trường thực thi (mặc định là 'development')
const nodeEnv = process.env.NODE_ENV || 'development';

// Nạp file env tương ứng với môi trường: .env.development hoặc .env.production
const envFileName = `.env.${nodeEnv}`;
const envPath = path.resolve(process.cwd(), envFileName);

// Nạp cấu hình từ file
const result = dotenv.config({ path: envPath });

if (result.error) {
  // Nếu không tìm thấy .env.[môi_trường], thử nạp fallback từ .env mặc định
  const fallbackResult = dotenv.config();
  if (fallbackResult.error) {
    logger.warn(`Không tìm thấy file ${envFileName} và .env mặc định. Bot sẽ sử dụng các biến hệ thống hiện có.`);
  } else {
    logger.info(`Đã nạp biến môi trường từ file mặc định: .env`);
  }
} else {
  logger.info(`Đã nạp biến môi trường thành công từ: ${envFileName}`);
}

/**
 * Đối tượng cấu hình hợp nhất và chuẩn hóa cho toàn ứng dụng
 */
const config = {
  env: nodeEnv,
  isProduction: nodeEnv === 'production',
  isDevelopment: nodeEnv === 'development',
  bot: {
    token: process.env.DISCORD_TOKEN || '',
    clientId: process.env.CLIENT_ID || '',
    guildId: process.env.GUILD_ID || '', // Tùy chọn: Dùng để đồng bộ Slash Command tức thì trên server test
  },
  ai: {
    primaryProvider: (process.env.AI_PRIMARY_PROVIDER || 'gemini').toLowerCase(),
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
    openrouterModel: process.env.OPENROUTER_MODEL || 'openrouter/free',
    tavilyApiKey: process.env.TAVILY_API_KEY || '',
    tavilySearchDepth: process.env.TAVILY_SEARCH_DEPTH || 'advanced',
    tavilyMaxResults: parseInt(process.env.TAVILY_MAX_RESULTS, 10) || 5,
    requestTimeoutMs: parseInt(process.env.AI_TIMEOUT_MS, 10) || 15000,
    rateLimitCooldownMs: parseInt(process.env.AI_COOLDOWN_MS, 10) || 5000,
  },
};

/**
 * Kiểm tra các biến môi trường bắt buộc trước khi bot hoạt động
 */
const validateConfig = () => {
  const missing = [];

  if (!config.bot.token || config.bot.token === 'your_discord_bot_token_here') {
    missing.push('DISCORD_TOKEN');
  }

  if (missing.length > 0) {
    logger.error(
      `Thiếu cấu hình biến môi trường bắt buộc: ${missing.join(', ')}. ` +
      `Vui lòng kiểm tra file ${envFileName} hoặc cấu hình hệ thống.`
    );
    return false;
  }

  return true;
};

module.exports = {
  config: Object.freeze(config),
  validateConfig,
};
