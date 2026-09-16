# 🏛️ Kiến Trúc Hệ Thống & Hướng Dẫn Mở Rộng (SOLID & Clean Code)

Tài liệu này giải thích chi tiết cách dự án áp dụng các nguyên lý thiết kế phần mềm **SOLID** và cách thêm các tính năng mới (Sự kiện, Slash Command, Service) một cách chuẩn mực.

---

## 1. Ứng dụng các nguyên lý SOLID trong dự án

### 🔹 S - Single Responsibility Principle (Đơn trách nhiệm)
Mỗi module/class chỉ chịu trách nhiệm cho một tác vụ duy nhất:
- `src/config/env.js`: Chuyên trách nạp, chuẩn hóa và kiểm tra biến môi trường.
- `src/utils/logger.js`: Chuyên trách in log chuẩn hóa với timestamp và màu sắc.
- `src/utils/embedBuilder.js`: Chuyên trách tạo giao diện Embed Card (giao diện hiển thị tin nhắn).
- `src/services/memberNotificationService.js`: Chuyên trách xử lý nghiệp vụ thông báo thành viên (tìm kênh, kiểm tra quyền, gửi thông báo).
- `src/core/EventLoader.js`: Chuyên trách tự động quét và đăng ký sự kiện.
- `src/core/BotClient.js`: Quản lý vòng đời và kết nối Gateway của Bot.

### 🔹 O - Open/Closed Principle (Đóng - Mở)
- Hệ thống **mở rộng cho các tính năng mới** nhưng **đóng cho việc sửa đổi code cốt lõi**.
- Khi cần lắng nghe sự kiện Discord mới (ví dụ: `messageCreate`, `guildBanAdd`): Bạn chỉ cần tạo một file mới trong thư mục `src/events/` kế thừa `BaseEvent`. `EventLoader` sẽ tự động phát hiện và đăng ký mà bạn **không cần sửa một dòng code nào trong `BotClient.js` hay `EventLoader.js`**.

### 🔹 L - Liskov Substitution Principle (Thay thế Liskov)
- Mọi Event Handler đều kế thừa từ `BaseEvent` và tuân thủ hợp đồng: có `name`, `once` và phương thức `execute()`.
- `EventLoader` có thể xử lý bất kỳ class con nào của `BaseEvent` một cách đồng nhất và không làm thay đổi tính đúng đắn của chương trình.

### 🔹 I - Interface Segregation Principle (Phân tách giao diện)
- Các sự kiện và dịch vụ chỉ nhận đúng dữ liệu và phụ thuộc mà chúng cần (ví dụ `guildMemberAdd` chỉ nhận `member` và ủy thác cho service phù hợp).

### 🔹 D - Dependency Inversion Principle (Đảo ngược phụ thuộc)
- Logic nghiệp vụ thông báo (`MemberNotificationService`) được tách biệt hoàn toàn khỏi Discord Gateway Client.
- Thay vì nhét toàn bộ code gửi tin nhắn vào trực tiếp file event, event chỉ đóng vai trò là "Trigger" chuyển tiếp dữ liệu sang tầng "Service".

---

## 2. Hướng dẫn mở rộng dự án

### 🎯 Cách 1: Thêm một sự kiện mới (Event Handler)
Ví dụ bạn muốn lắng nghe tin nhắn chat (`messageCreate`):

1. Tạo file mới `src/events/guild/messageCreate.js`:
```javascript
const { Events } = require('discord.js');
const BaseEvent = require('../BaseEvent');
const logger = require('../../utils/logger');

class MessageCreateEvent extends BaseEvent {
  constructor() {
    super(Events.MessageCreate, false);
  }

  /**
   * @param {import('discord.js').Message} message
   */
  async execute(message) {
    // Bỏ qua tin nhắn từ Bot
    if (message.author.bot) return;

    logger.debug(`Tin nhắn từ ${message.author.tag}: ${message.content}`);

    if (message.content === 'ping') {
      await message.reply('Pong! 🏓');
    }
  }
}

module.exports = MessageCreateEvent;
```
2. Khởi động lại bot. `EventLoader` sẽ tự động nạp file này!

---

### 🎯 Cách 2: Thêm một Service mới
Khi bot có thêm các chức năng phức tạp (ví dụ: Quản lý điểm kinh nghiệm / Leveling, Kiểm duyệt từ ngữ / Auto Mod):

1. Tạo file trong `src/services/` (ví dụ `src/services/levelingService.js`).
2. Viết class xử lý logic nghiệp vụ và export singleton hoặc class instance.
3. Gọi service này từ các Event tương ứng.

---

### 🎯 Cách 3: Nâng cấp Slash Commands (Lệnh gạch chéo `/`)
Để thêm hệ thống Slash Commands trong tương lai:
1. Tạo thư mục `src/commands/`.
2. Tạo `BaseCommand.js` (gồm `data` từ `SlashCommandBuilder` và phương thức `execute(interaction)`).
3. Tạo `CommandLoader.js` trong `src/core/` tương tự `EventLoader.js` để tự động nạp lệnh và đăng ký qua Discord REST API.
4. Bắt sự kiện `Events.InteractionCreate` để điều phối lệnh.
