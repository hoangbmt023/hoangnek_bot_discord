# 🤖 Discord Bot - Welcome & Leave Notifier

Bot Discord được xây dựng bằng **Node.js** và thư viện **discord.js v14**, áp dụng kiến trúc **Clean Code** và **SOLID Principles**. Bot có tính năng tự động phát hiện và gửi thông báo kèm **Embed Card** đẹp mắt khi có thành viên mới tham gia hoặc rời khỏi Server.

---

## 🚀 Tính năng chính

- 🌟 **Thông báo Chào mừng (Welcome Message)**: Bắt sự kiện `guildMemberAdd` và gửi Embed Card chào đón thành viên mới, hiển thị avatar, ngày tạo tài khoản và thứ tự thành viên trong Server.
- 👋 **Thông báo Tạm biệt (Leave Message)**: Bắt sự kiện `guildMemberRemove` và gửi Embed Card tạm biệt, hiển thị thời gian đã tham gia và số lượng thành viên còn lại.
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
├── docs/                     # Tài liệu hướng dẫn chi tiết
│   ├── SETUP_GUIDE.md        # Hướng dẫn tạo Bot Discord & cấp quyền Intent
│   ├── ARCHITECTURE.md       # Giải thích kiến trúc SOLID & cách mở rộng
│   └── CICD_GUIDE.md         # Hướng dẫn cấu hình CI/CD và GitHub Secrets
├── src/
│   ├── config/
│   │   └── env.js            # Nạp và kiểm tra tính hợp lệ của biến môi trường
│   ├── core/
│   │   ├── BotClient.js      # Khởi tạo Discord Client & quản lý vòng đời bot
│   │   └── EventLoader.js    # Tự động quét và đăng ký mọi sự kiện trong src/events
│   ├── events/
│   │   ├── BaseEvent.js      # Abstract Class chuẩn hóa cấu trúc Event
│   │   ├── client/
│   │   │   └── ready.js      # Sự kiện khi Bot online
│   │   └── guild/
│   │       ├── guildMemberAdd.js    # Sự kiện thành viên vào server
│   │       └── guildMemberRemove.js # Sự kiện thành viên rời server
│   ├── services/
│   │   └── memberNotificationService.js # Business logic xử lý gửi tin nhắn thông báo
│   ├── utils/
│   │   ├── embedBuilder.js   # Module chuyên tạo Embed Card Discord
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
> **Lưu ý bắt buộc**: Bạn cần bật **SERVER MEMBERS INTENT** trong [Discord Developer Portal](https://discord.com/developers/applications) -> Mục **Bot** để Bot có thể nhận sự kiện thành viên vào/ra server. Xem chi tiết tại [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md).

### 4. Chạy Bot

- **Chế độ Phát triển (Development)**:
  ```bash
  npm run dev
  ```

- **Chế độ Production**:
  ```bash
  npm start
  ```

- **Kiểm tra cú pháp (CI Test)**:
  ```bash
  npm test
  ```

---

## 📚 Tài liệu chi tiết

- [Hướng dẫn thiết lập Bot Discord từ A-Z](docs/SETUP_GUIDE.md)
- [Giải thích kiến trúc SOLID & Hướng dẫn mở rộng code](docs/ARCHITECTURE.md)
- [Hướng dẫn thiết lập CI/CD & Deploy tự động lên cPanel Linux](docs/CICD_GUIDE.md)


---

## 📄 License
Dự án được phân phối dưới giấy phép **MIT**.