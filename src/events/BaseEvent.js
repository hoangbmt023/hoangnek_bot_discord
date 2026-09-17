/**
 * BaseEvent Abstract Class
 * Lớp cơ sở cho mọi Event của Discord Bot, tuân thủ Liskov Substitution Principle (LSP).
 */
class BaseEvent {
  /**
   * @param {string} name - Tên của event trong discord.js (ví dụ Events.GuildMemberAdd, Events.ClientReady)
   * @param {boolean} once - Event chỉ chạy 1 lần duy nhất hay lắng nghe liên tục
   */
  constructor(name, once = false) {
    if (new.target === BaseEvent) {
      throw new TypeError('Không thể khởi tạo trực tiếp BaseEvent class (Abstract Class).');
    }
    if (!name) {
      throw new Error('Mỗi Event phải có thuộc tính `name` xác định.');
    }
    this.name = name;
    this.once = once;
  }

  /**
   * Phương thức thực thi logic sự kiện. Các class con bắt buộc phải override.
   * @param  {...any} args
   */
  async execute(...args) {
    throw new Error(`Phương thức execute() chưa được định nghĩa trong event: ${this.name}`);
  }
}

module.exports = BaseEvent;
