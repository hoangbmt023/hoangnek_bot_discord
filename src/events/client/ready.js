const { Events, ActivityType } = require('discord.js');
const BaseEvent = require('../BaseEvent');
const logger = require('../../utils/logger');

/**
 * ReadyEvent
 * Xử lý khi Bot kết nối thành công và sẵn sàng hoạt động.
 */
class ReadyEvent extends BaseEvent {
  constructor() {
    super(Events.ClientReady, true); // Chạy 1 lần duy nhất
  }

  /**
   * @param {import('discord.js').Client} client
   */
  async execute(client) {
    logger.success(`Bot đã đăng nhập thành công với tài khoản: ${client.user.tag}`);
    logger.info(`Đang hoạt động trên ${client.guilds.cache.size} server(s).`);

    // Thiết lập trạng thái hoạt động cho Bot
    client.user.setPresence({
      activities: [
        {
          name: 'thành viên mới | /help',
          type: ActivityType.Watching,
        },
      ],
      status: 'online',
    });
  }
}

module.exports = ReadyEvent;
