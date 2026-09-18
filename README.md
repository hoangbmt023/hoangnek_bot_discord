# 🤖 Discord Bot - Welcome & Leave Notifier

Bot Discord được xây dựng bằng **Node.js** và thư viện **discord.js v14**, áp dụng kiến trúc **Clean Code** và **SOLID Principles**. Bot có tính năng tự động phát hiện và gửi thông báo kèm **Embed Card** đẹp mắt khi có thành viên mới tham gia hoặc rời khỏi Server.

---

## 🚀 Tính năng chính

- 🎵 **Hệ thống Phát Nhạc Cao Cấp (Prefix `s!` & Slash `/music`)**:
  - **YouTube (`yt-dlp + FFmpeg Native OggOpus`)**: Phát trực tiếp video, playlist hoặc tìm kiếm từ khóa với âm thanh chuẩn Native OggOpus (48kHz Stereo, 128kbps), giải mã đa luồng bằng FFmpeg C Native, loại bỏ hoàn toàn rè tiếng (crackling), giật lag (jitter) và 403 Forbidden.
  - **Spotify (Hybrid Album Resolver & RAM Cache 0ms)**:
    - **In-Memory LRU Cache:** Lưu trữ 1,000 bài hát gần nhất trong RAM (TTL 2 giờ, tiêu thụ chỉ ~1MB RAM), phản hồi ngay lập tức trong 0ms khi phát lại/lặp bài.
    - **Hybrid Album Matching:** Tự động tìm nạp trọn bộ Album Playlist chính chủ trên YouTube chỉ trong ~1.8s, khớp tức thì toàn bộ bài hát trong bộ nhớ; chỉ tìm kiếm song song cho các bài hát còn thiếu (bonus/tour version).
    - **Natural YouTube AI Ranking & Bộ lọc nhiễu 7 tiêu chí**: Tự động lấy kết quả chuẩn #1 của YouTube (Official MV / Topic / Studio Master), loại trừ hoàn toàn video ngắn (Shorts < 30s), fancam/live không mong muốn, video loop 1 tiếng, karaoke/beat và reaction.
    - **Nút bấm điều khiển tương tác (Interactive Buttons & Pagination)**: 8 nút điều khiển Now Playing (`⏯️`, `⏭️`, `⏹️`, `🔂`, `🔀`, `🔉`, `🔊`, `📜`) và hàng nút bấm chuyển trang Hàng đợi (`⏮️`, `◀️`, `📄`, `▶️`, `⏭️`). Tự động gỡ nút ở tin nhắn cũ khi chuyển bài.
  - **Direct Audio / File Server**: Phát link file âm thanh trực tiếp (`.mp3`, `.flac`, `.wav`, `.ogg`, `.m4a`).
  - **Từ chối link không hợp lệ**: Tự động chặn các URL không được hỗ trợ (SoundCloud, Facebook, TikTok...) để bảo đảm an toàn.
  - **Đầy đủ tính năng điều khiển**: `s!play` (`s!p`), `s!pause`, `s!resume`, `s!skip`, `s!stop`, `s!queue`, `s!np`, `s!volume`, `s!loop`, `s!shuffle`, `s!remove`, `s!clear`, `s!leave`.
  - **Tự động rời phòng (Auto Leave)**: Tự động ngắt kết nối sau 3 phút không hoạt động hoặc khi phòng voice trống để tối ưu tài nguyên.
- 🔒 **Phân Quyền Kênh Lệnh (/setup & s!setup)**:
  - Mặc định khóa lệnh ở tất cả các kênh để chống spam chat.
  - Quản trị viên chỉ định các kênh văn bản được phép dùng lệnh qua `/setup channel add` hoặc `s!setup add`.
- 🌟 **Thông báo Chào mừng (Welcome Message)**: Bắt sự kiện `guildMemberAdd` và gửi Embed Card chào đón thành viên mới, hiển thị avatar, ngày tạo tài khoản và thứ tự thành viên trong Server.
- 👋 **Thông báo Tạm biệt (Leave Message)**: Bắt sự kiện `guildMemberRemove` và gửi Embed Card tạm biệt, hiển thị thời gian đã tham gia và số lượng thành viên còn lại.
- 🛡️ **Lọc Ngôn Từ Độc Hại & Hate Speech 3 Nhãn (`TRONG SẠCH`, `XÚC PHẠM`, `THÙ GHÉT`)**:
  - Tự động nhận diện từ ngữ thô tục, chửi thề (`XÚC PHẠM`) và ngôn từ thù ghét/xúc phạm nặng (`THÙ GHÉT`).
  - Hệ thống tích lũy điểm cảnh cáo và xử lý kỷ luật lũy tiến: **Xóa tin nhắn**, **Gửi cảnh cáo riêng qua DM**, **Timeout (10 phút)**, **Kick**, và **Ban vĩnh viễn**.
  - Tự động hạ điểm phạt sau 24 giờ nếu không tái phạm.
- 📋 **Quản lý Danh Sách Trắng (Slash Command `/setup whitelist`)**:
  - Quản lý thành viên miễn trừ kiểm duyệt ngôn từ độc hại (`moderation`) qua các subcommand: `add`, `remove`, `list`, `clear`.
  - Hỗ trợ thêm/xóa nhiều user cùng lúc (`@user1, @user2`).
  - Giao diện Embed tối giản, chuyên nghiệp với bảng màu 1-2 tone đồng nhất.
  - Dữ liệu Whitelist được lưu trữ tự động vào `data/whitelist.json`.
- 📖 **Trợ Giúp Từng Chức Năng (Slash Command `/help [feature]`)**:
  - Xem hướng dẫn chi tiết theo từng module: `all` (Tổng quan), `music` (Phát nhạc), `setup` (Trung tâm cấu hình), `whitelist` (Quản lý Whitelist), `feature` (Bật/tắt tính năng), `moderation` (Lọc ngôn từ & Bảng phạt), `notifications` (Thông báo chào mừng/tạm biệt).
- 🎛️ **Bật/Tắt Tính Năng Linh Hoạt (Slash Command `/setup feature`)**:
  - Cho phép Quản trị viên chủ động BẬT hoặc TẮT từng chức năng: `moderation` (Lọc ngôn từ), `welcome` (Chào mừng), `leave` (Tạm biệt), `all` (Tất cả).
  - Tra cứu trạng thái hoạt động tức thì của một tính năng cụ thể hoặc tất cả tính năng qua lệnh `/setup feature status`.
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
│   ├── channel_setup.json    # Cấu hình phân quyền kênh văn bản cho phép
│   ├── guild_settings.json   # Cài đặt bật/tắt tính năng theo Server
│   └── whitelist.json        # Dữ liệu Whitelist lưu trữ cục bộ
├── docs/                     # Tài liệu hướng dẫn chi tiết
│   ├── MUSIC_GUIDE.md        # Hướng dẫn chi tiết hệ thống Phát Nhạc & Cấu hình kênh
│   ├── SETUP_GUIDE.md        # Hướng dẫn tạo Bot Discord & cấp quyền Intent
│   ├── PERMISSIONS_GUIDE.md  # Hướng dẫn phân quyền & kiểm soát truy cập lệnh
│   ├── ARCHITECTURE.md       # Giải thích kiến trúc SOLID & cách mở rộng
│   ├── CICD_GUIDE.md         # Hướng dẫn cấu hình CI/CD và GitHub Secrets
│   └── MODERATION_GUIDE.md   # Hướng dẫn chi tiết hệ thống Lọc ngôn từ & Hate Speech
├── src/
│   ├── commands/
│   │   └── slashCommands.js  # Cấu hình & Đăng ký Slash Command (/wl, /feature, /setup, /music, /help)
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
│   │       ├── interactionCreate.js # Xử lý Slash Command (/setup, /music, /wl, /feature, /help)
│   │       └── messageCreate.js     # Xử lý tin nhắn, s! music, s!setup và kiểm duyệt
│   ├── music/
│   │   ├── Track.js                 # Đại diện bài hát & nạp Audio Resource
│   │   ├── YtDlpService.js          # Dịch vụ yt-dlp & FFmpeg stream PCM chất lượng cao
│   │   ├── MusicSourceResolver.js   # Phân giải YouTube, Spotify -> Smart YouTube Matcher, Direct Audio
│   │   ├── GuildQueue.js            # Quản lý hàng đợi nhạc, Player và Voice Connection
│   │   └── MusicManager.js          # Quản lý singleton GuildQueue các Server
│   ├── services/
│   │   ├── channelSetupService.js   # Quản lý cấu hình phân quyền kênh
│   │   ├── setupCommandHandler.js   # Xử lý lệnh cấu hình kênh (s!setup / /setup)
│   │   ├── musicCommandHandler.js   # Xử lý toàn bộ lệnh phát nhạc prefix s!
│   │   ├── musicButtonHandler.js    # Xử lý tương tác nút bấm Player & phân trang Hàng đợi
│   │   ├── memberNotificationService.js # Business logic gửi thông báo thành viên
│   │   ├── moderationService.js         # Business logic kiểm duyệt tin nhắn
│   │   ├── warningStore.js              # Quản lý điểm phạt & thời gian hết hạn
│   │   ├── whitelistService.js          # Quản lý lưu trữ Whitelist theo Guild
│   │   ├── whitelistCommandHandler.js   # Xử lý câu lệnh !whitelist / !wl
│   │   ├── guildSettingsService.js      # Quản lý cấu hình bật/tắt tính năng theo Guild
│   │   ├── featureCommandHandler.js     # Xử lý câu lệnh !feature / !toggle
│   │   ├── helpCommandHandler.js        # Xử lý câu lệnh !help / /help / s!help
│   │   └── toxicity/                    # Các bộ phân loại độc hại (Strategy Pattern)
│   │       ├── IToxicityDetector.js
│   │       ├── RuleBasedDetector.js
│   │       ├── AIModelDetector.js
│   │       └── HybridToxicityDetector.js
│   ├── utils/
│   │   ├── embedBuilder.js   # Module chuyên tạo Embed Card Discord tiếng Việt
│   │   └── logger.js         # Hệ thống log màu sắc theo thời gian thực
│   └── index.js              # Entrypoint khởi chạy ứng dụng
├── tests/
│   ├── moderation.test.js    # Test kiểm duyệt ngôn từ & điểm phạt
│   └── music_setup.test.js   # Test hệ thống phát nhạc & phân quyền kênh
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
- **Node.js** phiên bản `>= 18.0.0` (Khuyên dùng v20 hoặc v22 LTS).
- **Git** (nếu dùng lệnh clone) hoặc phần mềm giải nén file ZIP.
- Tài khoản Discord và quyền Quản trị Server.

### 2. Tải mã nguồn về máy
Bạn có thể chọn 1 trong các cách sau:

- **Cách 1: Sử dụng Git Clone (Khuyên dùng)**:
  ```bash
  git clone https://github.com/hoangbmt023/hoangnek_bot_discord.git
  cd hoangnek_bot_discord
  ```

- **Cách 2: Tải file nén ZIP / Bản Release**:
  1. Nhấn vào nút xanh **`Code`** ở đầu trang GitHub ➔ Chọn **`Download ZIP`** (hoặc tải bản nén tại mục [Releases](https://github.com/hoangbmt023/hoangnek_bot_discord/releases)).
  2. Giải nén file vừa tải về.
  3. Mở Terminal / CMD / PowerShell tại thư mục vừa giải nén.

### 3. Cài đặt Dependencies (Thư viện)
Tại thư mục gốc của dự án, chạy lệnh:
```bash
npm install
```

### 4. Cấu hình biến môi trường
Tạo file cấu hình môi trường từ file mẫu:
```bash
# Trên Linux / macOS / Git Bash:
cp .env.example .env.development

# Trên Windows CMD:
copy .env.example .env.development
```

Mở file `.env.development` (hoặc `.env.production`) và điền các thông tin của Bot:

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

### 5. Chạy Bot

- **Chế độ Phát triển (Development - Tự động reload khi sửa code)**:
  ```bash
  npm run dev
  ```

- **Chế độ Production (Vận hành thực tế)**:
  ```bash
  npm start
  ```

- **Kiểm tra cú pháp & Toàn bộ Unit Test**:
  ```bash
  npm test
  ```

---

## 📚 Tài liệu chi tiết

- [Hướng dẫn chi tiết hệ thống Phát Nhạc & Phân quyền kênh](docs/MUSIC_GUIDE.md)
- [Hướng dẫn thiết lập Bot Discord từ A-Z](docs/SETUP_GUIDE.md)
- [Hướng dẫn phân quyền & kiểm soát truy cập lệnh](docs/PERMISSIONS_GUIDE.md)
- [Hướng dẫn chi tiết hệ thống Lọc ngôn từ & Hate Speech (3 Nhãn)](docs/MODERATION_GUIDE.md)
- [Giải thích kiến trúc SOLID & Hướng dẫn mở rộng code](docs/ARCHITECTURE.md)
- [Hướng dẫn thiết lập CI/CD & Deploy tự động lên cPanel Linux](docs/CICD_GUIDE.md)


---

## 📄 License
Dự án được phân phối dưới giấy phép **MIT**.