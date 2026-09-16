const fs = require('fs');
const path = require('path');
const BaseEvent = require('../events/BaseEvent');
const logger = require('../utils/logger');

/**
 * EventLoader
 * Tự động tìm kiếm và nạp tất cả các sự kiện trong thư mục events.
 * Tuân thủ Open/Closed Principle (OCP): Thêm sự kiện mới chỉ cần tạo file, không cần sửa loader.
 */
class EventLoader {
  /**
   * Quét đệ quy tất cả các file .js trong thư mục events
   * @param {string} dir
   * @returns {string[]} Danh sách đường dẫn file
   */
  static getEventFiles(dir) {
    let files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        files = files.concat(EventLoader.getEventFiles(fullPath));
      } else if (item.isFile() && item.name.endsWith('.js') && item.name !== 'BaseEvent.js') {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Đăng ký các event vào Discord Client
   * @param {import('discord.js').Client} client
   */
  static load(client) {
    const eventsDir = path.join(__dirname, '../events');
    const eventFiles = EventLoader.getEventFiles(eventsDir);

    let loadedCount = 0;

    for (const file of eventFiles) {
      try {
        const EventClass = require(file);

        // Kiểm tra xem class có kế thừa BaseEvent không
        if (typeof EventClass !== 'function') {
          continue;
        }

        const eventInstance = new EventClass();
        if (!(eventInstance instanceof BaseEvent)) {
          logger.warn(`File ${path.basename(file)} không kế thừa BaseEvent, bỏ qua.`);
          continue;
        }

        const eventCallback = async (...args) => {
          try {
            await eventInstance.execute(...args, client);
          } catch (error) {
            logger.error(`Lỗi khi xử lý sự kiện [${eventInstance.name}]:`, error);
          }
        };

        if (eventInstance.once) {
          client.once(eventInstance.name, eventCallback);
        } else {
          client.on(eventInstance.name, eventCallback);
        }

        loadedCount++;
        logger.debug(`Đã đăng ký sự kiện: ${eventInstance.name} (once: ${eventInstance.once})`);
      } catch (error) {
        logger.error(`Không thể nạp sự kiện từ file: ${file}`, error);
      }
    }

    logger.info(`Đã nạp thành công ${loadedCount} sự kiện.`);
  }
}

module.exports = EventLoader;
