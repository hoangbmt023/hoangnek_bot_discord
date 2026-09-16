/**
 * Logger utility for consistent and colorized console logging.
 */
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

const logger = {
  info: (message, ...optionalParams) => {
    console.log(
      `${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.green}[INFO]${colors.reset} ${message}`,
      ...optionalParams
    );
  },

  warn: (message, ...optionalParams) => {
    console.warn(
      `${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.yellow}[WARN]${colors.reset} ${message}`,
      ...optionalParams
    );
  },

  error: (message, error = '') => {
    console.error(
      `${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.red}[ERROR]${colors.reset} ${message}`,
      error
    );
  },

  debug: (message, ...optionalParams) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(
        `${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.cyan}[DEBUG]${colors.reset} ${message}`,
        ...optionalParams
      );
    }
  },

  success: (message, ...optionalParams) => {
    console.log(
      `${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.magenta}[SUCCESS]${colors.reset} ${message}`,
      ...optionalParams
    );
  },
};

module.exports = logger;
