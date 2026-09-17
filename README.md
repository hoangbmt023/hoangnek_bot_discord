# 🤖 Discord Bot - Welcome & Leave Notifier

Bot Discord được xây dựng bằng **Node.js** và thư viện **discord.js v14**, áp dụng kiến trúc **Clean Code** và **SOLID Principles**. Bot có tính năng tự động phát hiện và gửi thông báo kèm **Embed Card** đẹp mắt khi có thành viên mới tham gia hoặc rời khỏi Server.

---

## 🚀 Tính năng chính

- 🌟 **Thông báo Chào mừng (Welcome Message)**: Bắt sự kiện `guildMemberAdd` và gửi Embed Card chào đón thành viên mới, hiển thị avatar, ngày tạo tài khoản và thứ tự thành viên trong Server.
- 👋 **Thông báo Tạm biệt (Leave Message)**: Bắt sự kiện `guildMemberRemove` và gửi Embed Card tạm biệt, hiển thị thời gian đã tham gia và số lượng thành viên còn lại.
- 🛡️ **Lọc Ngôn Từ Độc Hại & Hate Speech 3 Nhãn (`TRONG SẠCH`, `XÚC PHẠM`, `THÙ GHÉT`)**:
  - Tự động nhận diện từ ngữ thô tục, chửi thề (`XÚC PHẠM`) và ngôn từ thù ghét/xúc phạm nặng (`THÙ GHÉT`).
  - Hệ thống tích lũy điểm cảnh cáo và xử lý kỷ luật lũy tiến: **Xóa tin nhắn**, **Gửi cảnh cáo riêng qua DM**, **Timeout (10 phút)**, **Kick**, và **Ban vĩnh viễn**.
  - Tự động hạ điểm phạt sau 24 giờ nếu không tái phạm.
- 📋 **Quản lý Danh Sách Trắng (Slash Command `/wl`)**:
  - Đăng ký lệnh Slash Command duy nhất `/wl` trên Discord với các subcommand: `add`, `remove`, `list`, `clear`.
  - Hỗ trợ chọn tính năng (`toxic`, `all`) và thêm/xóa nhiều user cùng lúc (`@user1, @user2`).
  - Giao diện Embed tối giản, bố cục chuyên nghiệp với bảng màu 1-2 tone đồng nhất.
  - Dữ liệu Whitelist được lưu trữ tự động vào `data/whitelist.json`.
- 📖 **Trợ Giúp Từng Chức Năng (Slash Command `/help [chức_năng]`)**:
  - Xem hướng dẫn chi tiết theo từng module: `all` (Tổng quan), `whitelist` (Quản lý Whitelist), `feature` (Bật/tắt tính năng), `moderation` (Lọc ngôn từ & Bảng phạt), `notifications` (Thông báo chào mừng/tạm biệt).
- 🎛️ **Bật/Tắt Tính Năng Linh Hoạt (Slash Command `/feature`)**:
  - Cho phép Quản trị viên chủ động BẬT hoặc TẮT từng chức năng: `moderation` (Lọc ngôn từ), `welcome` (Chào mừng), `leave` (Tạm biệt), `all` (Tất cả).
  - Tra cứu trạng thái hoạt động tức thì của tất cả tính năng qua lệnh `/feature status` (hỗ trợ lọc: `all`, `enabled`, `disabled`).
  - Cấu hình lưu trữ bền vững theo từng Server tại `data/guild_settings.json`.
- ⚙️ **Quản lý đa môi trường**: Tách biệt cấu hình linh hoạt thông qua `.env.example`, `.env.development`, `.env.production`.
- 🧩 **Kiến trúc SOLID & Clean Code**:
  - Dễ bảo trì, mở rộng thêm Event/Command mới mà không ảnh hưởng đến phần core.
  - Tự động nạp Sự kiện (Auto Event Loader) thông qua kế thừa `BaseEvent`.
  - Tách bạch rõ ràng giữa Business Logic (`services/`), Giao diện Embed (`utils/embedBuilder`), và Vòng đời bot (`core/BotClient`).

- 🔄 **Quy trình CI/CD tự động (GitHub Actions -> cPanel Linux)**:
  - Tự động chạy kiểm tra chất lượng & cú pháp code trên mọi Pull Request (Node 18/20/22).
  - Tự động deploy, kéo code mới nhất và khởi động lại Bot trên cPanel khi merge vào `main`.

---

## 📁 Cấu trúc thư mục

```
hoangnek_bot_discord/
├── .github/workflows/        # CI/CD Workflows (GitHub Actions)
│   ├── ci.yml                # CI: Kiểm tra cú pháp và bảo mật code
│   └── cd-production.yml     # CD: Tự động deploy lên cPanel Linux khi merge main
├── data/
│   ├── guild_settings.json   # Cài đặt bật/tắt tính năng theo Server
│   └── whitelist.json        # Dữ liệu Whitelist lưu trữ cục bộ
├── docs/                     # Tài liệu hướng dẫn chi tiết
│   ├── SETUP_GUIDE.md        # Hướng dẫn tạo Bot Discord & cấp quyền Intent
│   ├── ARCHITECTURE.md       # Giải thích kiến trúc SOLID & cách mở rộng
│   ├── CICD_GUIDE.md         # Hướng dẫn cấu hình CI/CD và GitHub Secrets
│   └── MODERATION_GUIDE.md   # Hướng dẫn chi tiết hệ thống Lọc ngôn từ & Hate Speech
├── src/
│   ├── commands/
│   │   └── slashCommands.js  # Cấu hình & Đăng ký Slash Command (/wl, /feature, /help)
│   ├── config/
│   │   ├── env.js            # Nạp và kiểm tra tính hợp lệ của biến môi trường
│   │   └── moderation.js     # Cấu hình ngưỡng phạt và nhãn phân loại tiếng Việt
│   ├── core/
│   │   ├── BotClient.js      # Khởi tạo Discord Client & quản lý vòng đời bot
│   │   └── EventLoader.js    # Tự động quét và đăng ký mọi sự kiện trong src/events
│   ├── events/
│   │   ├── BaseEvent.js      # Abstract Class chuẩn hóa cấu trúc Event
│   │   ├── client/
│   │   │   └── ready.js      # Sự kiện khi Bot online & đăng ký slash command
│   │   └── guild/
│   │       ├── guildMemberAdd.js    # Sự kiện thành viên vào server
│   │       ├── guildMemberRemove.js # Sự kiện thành viên rời server
│   │       ├── interactionCreate.js # Xử lý Slash Command /wl, /feature và /help
│   │       └── messageCreate.js     # Sự kiện tin nhắn & kiểm duyệt ngôn từ
│   ├── services/
│   │   ├── memberNotificationService.js # Business logic gửi thông báo thành viên
│   │   ├── moderationService.js         # Business logic kiểm duyệt tin nhắn
│   │   ├── warningStore.js              # Quản lý điểm phạt & thời gian hết hạn
│   │   ├── whitelistService.js          # Quản lý lưu trữ Whitelist theo Guild
│   │   ├── whitelistCommandHandler.js   # Xử lý câu lệnh !whitelist / !wl
│   │   ├── guildSettingsService.js      # Quản lý cấu hình bật/tắt tính năng theo Guild
│   │   ├── featureCommandHandler.js     # Xử lý câu lệnh !feature / !toggle
│   │   ├── helpCommandHandler.js        # Xử lý câu lệnh !help / /help
│   │   └── toxicity/                    # Các bộ phân loại độc hại (Strategy Pattern)
│   │       ├── IToxicityDetector.js
│   │       ├── RuleBasedDetector.js
│   │       ├── AIModelDetector.js
│   │       └── HybridToxicityDetector.js
│   ├── utils/
│   │   ├── embedBuilder.js   # Module chuyên tạo Embed Card Discord tiếng Việt
│   │   └── logger.js         # Hệ thống log màu sắc theo thời gian thực
│   └── index.js              # Entrypoint khởi chạy ứng dụng
├── .cpanel.yml               # Cấu hình cPanel Git Deployment native
├── .env.example              # Mẫu cấu hình môi trường
├── .env.development          # Cấu hình môi trường dev (đã được .gitignore)
├── .env.production           # Cấu hình môi trường prod (đã được .gitignore)
├── .gitignore
├── package.json
└── README.md
```

---

## 🛠️ Hướng dẫn cài đặt & Chạy Bot

### 1. Yêu cầu hệ thống
- **Node.js** phiên bản `>= 18.0.0` (Khuyên dùng v20 hoặc v22).
- Tài khoản Discord và quyền Quản trị Server.

### 2. Cài đặt Dependencies
```bash
npm install
```

### 3. Cấu hình biến môi trường
Mở file `.env.development` (hoặc `.env.production`) và điền các thông tin của bạn:

```env
NODE_ENV=development
DISCORD_TOKEN=dien_token_bot_cua_ban_tai_day
CLIENT_ID=dien_application_id_cua_ban
GUILD_ID=dien_server_id_de_test
WELCOME_CHANNEL_ID=dien_id_kenh_chao_mung
LEAVE_CHANNEL_ID=dien_id_kenh_tam_biet_hoac_de_trong
```

> [!IMPORTANT]
> **Lưu ý bắt buộc**: Bạn cần bật cả **SERVER MEMBERS INTENT** và **MESSAGE CONTENT INTENT** trong [Discord Developer Portal](https://discord.com/developers/applications) -> Mục **Bot** để Bot có thể nhận sự kiện thành viên và đọc nội dung tin nhắn phục vụ lọc từ ngữ độc hại. Xem chi tiết tại [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) và [docs/MODERATION_GUIDE.md](docs/MODERATION_GUIDE.md).

### 4. Chạy Bot

- **Chế độ Phát triển (Development)**:
  ```bash
  npm run dev
  ```

- **Chế độ Production**:
  ```bash
  npm start
  ```

- **Kiểm tra cú pháp & Unit Test**:
  ```bash
  npm test
  ```

---

## 📚 Tài liệu chi tiết

- [Hướng dẫn thiết lập Bot Discord từ A-Z](docs/SETUP_GUIDE.md)
- [Hướng dẫn chi tiết hệ thống Lọc ngôn từ & Hate Speech (3 Nhãn)](docs/MODERATION_GUIDE.md)
- [Giải thích kiến trúc SOLID & Hướng dẫn mở rộng code](docs/ARCHITECTURE.md)
- [Hướng dẫn thiết lập CI/CD & Deploy tự động lên cPanel Linux](docs/CICD_GUIDE.md)


---

## 📄 License
Dự án được phân phối dưới giấy phép **MIT**.