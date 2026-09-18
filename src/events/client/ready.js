const { Events, ActivityType } = require('discord.js');
const BaseEvent = require('../BaseEvent');
const logger = require('../../utils/logger');
const { registerSlashCommands } = require('../../commands/slashCommands');

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

    // Thiết lập trạng thái xoay vòng tự động mỗi 20 giây
    this.setupRotatingPresence(client);

    // Tự động đăng ký và đồng bộ Slash Commands
    await registerSlashCommands(client);
  }

  /**
   * Cài đặt cơ chế xoay vòng trạng thái Bot mỗi 20 giây
   * @param {import('discord.js').Client} client
   */
  setupRotatingPresence(client) {
    const getActivities = () => {
      const serverCount = client.guilds.cache.size;
      const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);

      return [
        {
          name: 's!p | s!play để nghe nhạc',
          type: ActivityType.Listening,
        },
        {
          name: '/help | Hướng dẫn sử dụng',
          type: ActivityType.Watching,
        },
        {
          name: `${serverCount} máy chủ • ${totalMembers} thành viên`,
          type: ActivityType.Watching,
        },
        {
          name: 'YouTube, Spotify ',
          type: ActivityType.Listening,
        },
      ];
    };

    let currentIndex = 0;

    const updatePresence = () => {
      try {
        const activities = getActivities();
        const currentActivity = activities[currentIndex];

        client.user.setPresence({
          activities: [currentActivity],
          status: 'online',
        });

        currentIndex = (currentIndex + 1) % activities.length;
      } catch (error) {
        logger.warn(`[Presence] Lỗi khi cập nhật trạng thái bot: ${error.message}`);
      }
    };

    // Áp dụng trạng thái đầu tiên ngay khi khởi động
    updatePresence();

    // Xoay vòng mỗi 20 giây (20,000ms)
    setInterval(updatePresence, 20_000);
    logger.info('[Presence] Đã kích hoạt cơ chế xoay vòng trạng thái tự động mỗi 20 giây.');
  }
}

module.exports = ReadyEvent;
