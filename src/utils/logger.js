const fs = require('fs');
const path = require('path');

/**
 * Cấu hình hệ thống Logging
 */
const LOG_DIR = path.resolve(process.cwd(), 'logs');
const DAILY_DIR = path.join(LOG_DIR, 'daily');
const RETENTION_DAYS = 60; // Tự động xóa log cũ hơn 60 ngày

// Đảm bảo các thư mục log tồn tại
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}
if (!fs.existsSync(DAILY_DIR)) {
  fs.mkdirSync(DAILY_DIR, { recursive: true });
}

// Bảng mã màu cho Console Terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const getTimestamp = () => {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
};

const getDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format tham số bổ sung thành chuỗi văn bản thuần
 */
const formatParams = (params) => {
  if (!params || params.length === 0) return '';
  return params
    .map((param) => {
      if (param instanceof Error) {
        return param.stack || param.message;
      }
      if (typeof param === 'object') {
        try {
          return JSON.stringify(param, null, 2);
        } catch {
          return String(param);
        }
      }
      return String(param);
    })
    .join(' ');
};

/**
 * Ghi log vào file bất đồng bộ (Non-blocking)
 */
const writeToFile = (level, message, ...optionalParams) => {
  const timestamp = getTimestamp();
  const extra = formatParams(optionalParams);
  const logLine = `[${timestamp}] [${level}] ${message}${extra ? ' ' + extra : ''}\n`;

  // 1. File tổng hợp chung (dễ tail -f)
  const appLogPath = path.join(LOG_DIR, 'app.log');
  fs.appendFile(appLogPath, logLine, () => {});

  // 2. File log theo ngày (để lưu trữ và đối soát)
  const dailyLogPath = path.join(DAILY_DIR, `app-${getDateString()}.log`);
  fs.appendFile(dailyLogPath, logLine, () => {});

  // 3. Nếu là ERROR -> ghi riêng vào error.log và daily error log
  if (level === 'ERROR') {
    const errorLogPath = path.join(LOG_DIR, 'error.log');
    const dailyErrorPath = path.join(DAILY_DIR, `error-${getDateString()}.log`);
    fs.appendFile(errorLogPath, logLine, () => {});
    fs.appendFile(dailyErrorPath, logLine, () => {});
  }
};

/**
 * Dọn dẹp các file log cũ hơn số ngày quy định (Mặc định 60 ngày)
 */
const cleanupOldLogs = (retentionDays = RETENTION_DAYS) => {
  try {
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const targets = [DAILY_DIR, LOG_DIR];

    let deletedCount = 0;

    for (const dir of targets) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);

      for (const file of files) {
        // Chỉ xử lý các file log lưu trữ hàng ngày hoặc file backup có đuôi .log
        if (file.endsWith('.log') && (dir === DAILY_DIR || file.includes('-'))) {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);

          if (stats.mtimeMs < cutoffTime) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        }
      }
    }

    if (deletedCount > 0) {
      console.log(
        `${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.cyan}[CLEANUP]${colors.reset} Đã dọn dẹp ${deletedCount} file log cũ hơn ${retentionDays} ngày.`
      );
    }
  } catch (err) {
    console.error(
      `${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.red}[ERROR]${colors.reset} Lỗi khi dọn dẹp log cũ:`,
      err
    );
  }
};

// Chạy dọn dẹp log khi khởi động và tự động kiểm tra mỗi 24 giờ
cleanupOldLogs(RETENTION_DAYS);
const cleanupTimer = setInterval(() => cleanupOldLogs(RETENTION_DAYS), 24 * 60 * 60 * 1000);
if (cleanupTimer.unref) {
  cleanupTimer.unref(); // Không giữ event loop khi tắt ứng dụng
}

/**
 * Module Logger chuẩn hoá cho Console và File
 */
const logger = {
  info: (message, ...optionalParams) => {
    console.log(
      `${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.green}[INFO]${colors.reset} ${message}`,
      ...optionalParams
    );
    writeToFile('INFO', message, ...optionalParams);
  },

  warn: (message, ...optionalParams) => {
    console.warn(
      `${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.yellow}[WARN]${colors.reset} ${message}`,
      ...optionalParams
    );
    writeToFile('WARN', message, ...optionalParams);
  },

  error: (message, error = '') => {
    console.error(
      `${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.red}[ERROR]${colors.reset} ${message}`,
      error
    );
    writeToFile('ERROR', message, error);
  },

  debug: (message, ...optionalParams) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(
        `${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.cyan}[DEBUG]${colors.reset} ${message}`,
        ...optionalParams
      );
      writeToFile('DEBUG', message, ...optionalParams);
    }
  },

  success: (message, ...optionalParams) => {
    console.log(
      `${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.magenta}[SUCCESS]${colors.reset} ${message}`,
      ...optionalParams
    );
    writeToFile('SUCCESS', message, ...optionalParams);
  },

  cleanupOldLogs,
};

module.exports = logger;
