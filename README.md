# 🤖 Discord Bot - Welcome & Leave Notifier

Bot Discord được xây dựng bằng **Node.js** và thư viện **discord.js v14**, áp dụng kiến trúc **Clean Code** và **SOLID Principles**. Bot có tính năng tự động phát hiện và gửi thông báo kèm **Embed Card** đẹp mắt khi có thành viên mới tham gia hoặc rời khỏi Server.

---

- 🤖 **Trợ Lý AI Assistant Thông Minh (Prefix `!ask` & Slash `/ask`)**:
  - **Tích hợp Google Gemini & Đa Tầng Fallback OpenRouter**: Sử dụng Google Gemini (`gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-1.5-pro`...) làm provider chính, tự động fallback an toàn sang OpenRouter (`openrouter/free`, Llama 3.3 70B, Gemma 3 27B, Qwen 2.5...) khi gặp lỗi 429 Quota Exceeded hoặc sự cố mạng.
  - **Tavily AI Search RAG Đa Tầng (Cascading Search)**: Tự động tra cứu thông tin thời gian thực từ Internet bằng Tavily Search Platform với cơ chế tự động nâng cấp: `basic` (1 credit) ➔ `advanced` (2 credits) khi cần bổ sung dữ liệu đối chiếu.
  - **Cơ sở Tri thức Động từ Kênh Tri Thức (/setup knowledge add-channel)**: Tự động đọc và thấu hiểu toàn diện nội quy máy chủ, thông báo và dữ liệu ghim (Pinned Messages & Embeds) từ các kênh tri thức do Admin chỉ định theo thời gian thực.
  - **Tùy biến Model AI theo từng Server (/setup ai & s!setup ai)**: Quản trị viên có thể tự do đổi model Gemini, OpenRouter hoặc chọn Provider chính cho riêng Server của mình qua lệnh `/setup ai set-model` hoặc `s!setup ai set <provider> <model>`.
  - **Bộ nhớ hội thoại ngắn hạn (Short-term Context Memory)**: Lưu trữ lịch sử hỏi đáp gần nhất, phân tách độc lập theo từng Server/User, tự động giải phóng bộ nhớ sau 15 phút.
  - **Chống spam (Rate Limit)**: Tự động giới hạn 1 request / 5 giây mỗi user.

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
  - Quản trị viên chỉ định các kênh văn bản được phép dùng lệnh qua `/setup channel add` hoặc `s!setup channel add`.
- 🌟 **Thông báo Chào mừng & Tạm biệt Động (Multi-Guild Welcome & Leave)**:
  - Bắt sự kiện `guildMemberAdd` / `guildMemberRemove` và gửi Embed Card đẹp mắt.
  - **Mặc định**: Tự động gửi vào **Kênh hệ thống (System Channel)** của Server.
  - **Tùy chỉnh riêng cho từng Server**: Cài đặt qua lệnh `/setup notify set` hoặc `s!setup notify <welcome|leave> #kênh` (hoặc `s!setup welcome #kênh`, `s!setup leave #kênh`), không phụ thuộc file `.env`.
  - Khôi phục mặc định dễ dàng bằng `/setup notify reset` hoặc `s!setup notify reset`.
- 🌐 **Hỗ Trợ Đa Server Toàn Diện (Multi-Guild)**:
  - Tự động bắt sự kiện `guildCreate` khi được mời vào server mới và gửi hướng dẫn thiết lập nhanh.
  - Tự động đăng ký Slash Commands toàn cục (Global) cho mọi Server bot tham gia.
  - Dữ liệu cấu hình từng Server hoàn toàn độc lập và bền vững.
- 🛡️ **Lọc Ngôn Từ Độc Hại & Hate Speech 3 Nhãn (`TRONG SẠCH`, `XÚC PHẠM`, `THÙ GHÉT`)**:
  - Tự động nhận diện từ ngữ thô tục, chửi thề (`XÚC PHẠM`) và ngôn từ thù ghét/xúc phạm nặng (`THÙ GHÉT`).
  - Hệ thống tích lũy điểm cảnh cáo và xử lý kỷ luật lũy tiến: **Xóa tin nhắn**, **Gửi cảnh cáo riêng qua DM**, **Timeout (10 phút)**, **Kick**, và **Ban vĩnh viễn**.
  - Tự động hạ điểm phạt sau 24 giờ nếu không tái phạm.
- 📋 **Quản lý Danh Sách Trắng (Slash Command `/setup whitelist`)**:
  - Quản lý thành viên miễn trừ kiểm duyệt ngôn từ độc hại (`moderation`) qua các subcommand: `add`, `remove`, `list`, `clear`.
  - Hỗ trợ thêm/xóa nhiều user cùng lúc (`@user1, @user2`).
  - Giao diện Embed tối giản, chuyên nghiệp với bảng màu 1-2 tone đồng nhất.
  - Dữ liệu Whitelist được lưu trữ tự động vào `data/guild_settings.json`.
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
│   └── guild_settings.json   # Quản lý toàn bộ cấu hình từng Server: Features, Kênh thông báo, Whitelist, Kênh lệnh, Model AI & Kênh Tri Thức Dynamic
├── docs/                     # Tài liệu hướng dẫn chi tiết
│   ├── MUSIC_GUIDE.md        # Hướng dẫn chi tiết hệ thống Phát Nhạc & Cấu hình kênh
│   ├── SETUP_GUIDE.md        # Hướng dẫn tạo Bot Discord, cấp quyền Intent & cấu hình AI
│   ├── PERMISSIONS_GUIDE.md  # Hướng dẫn phân quyền & kiểm soát truy cập lệnh
│   ├── ARCHITECTURE.md       # Giải thích kiến trúc SOLID & cách mở rộng
│   ├── CICD_GUIDE.md         # Hướng dẫn cấu hình CI/CD và GitHub Secrets
│   └── MODERATION_GUIDE.md   # Hướng dẫn chi tiết hệ thống Lọc ngôn từ & Hate Speech
├── src/
│   ├── commands/
│   │   └── slashCommands.js  # Cấu hình & Đăng ký Slash Command (/ask, /wl, /feature, /setup, /music, /help)
│   ├── config/
│   │   ├── env.js            # Nạp và kiểm tra tính hợp lệ của biến môi trường (AI & Bot)
│   │   └── moderation.js     # Cấu hình ngưỡng phạt và nhãn phân loại tiếng Việt
│   ├── core/
│   │   ├── BotClient.js      # Khởi tạo Discord Client & quản lý vòng đời bot
│   │   └── EventLoader.js    # Tự động quét và đăng ký mọi sự kiện trong src/events
│   ├── events/
│   │   ├── BaseEvent.js      # Abstract Class chuẩn hóa cấu trúc Event
│   │   ├── client/
│   │   │   └── ready.js      # Sự kiện khi Bot online & đăng ký slash command
│   │   └── guild/
│   │       ├── guildCreate.js       # Sự kiện khi Bot được thêm vào server mới
│   │       ├── guildMemberAdd.js    # Sự kiện thành viên vào server
│   │       ├── guildMemberRemove.js # Sự kiện thành viên rời server
│   │       ├── interactionCreate.js # Xử lý Slash Command (/ask, /setup, /music, /wl, /feature, /help)
│   │       └── messageCreate.js     # Xử lý tin nhắn, !ask, s! music, s!setup và kiểm duyệt
│   ├── music/
│   │   ├── Track.js                 # Đại diện bài hát & nạp Audio Resource
│   │   ├── YtDlpService.js          # Dịch vụ yt-dlp & FFmpeg stream PCM chất lượng cao
│   │   ├── MusicSourceResolver.js   # Phân giải YouTube, Spotify -> Smart YouTube Matcher, Direct Audio
│   │   ├── GuildQueue.js            # Quản lý hàng đợi nhạc, Player và Voice Connection
│   │   └── MusicManager.js          # Quản lý singleton GuildQueue các Server
│   ├── services/
│   │   ├── ai/                      # Module Trợ lý AI Assistant Thông Minh & RAG
│   │   │   ├── aiService.js              # Bộ điều phối trung tâm (Primary & Fallback)
│   │   │   ├── geminiService.js          # Tích hợp Google Gemini API
│   │   │   ├── openrouterService.js      # Tích hợp OpenRouter Fallback Multi-model
│   │   │   ├── tavilySearchService.js    # Tích hợp Tavily AI Search RAG (Basic -> Advanced)
│   │   │   ├── serverKnowledgeService.js # Quản lý cơ sở tri thức server-knowledge.md
│   │   │   ├── serverContextService.js   # Trích xuất ngữ cảnh server thời gian thực
│   │   │   ├── promptService.js          # Xây dựng System Prompt & User Prompt
│   │   │   └── memoryService.js          # Bộ nhớ hội thoại ngắn hạn theo Guild/User
│   │   ├── askCommandHandler.js     # Xử lý lệnh hỏi đáp !ask / /ask / !hoi
│   │   ├── channelSetupService.js   # Quản lý cấu hình phân quyền kênh
│   │   ├── setupCommandHandler.js   # Xử lý lệnh cấu hình (/setup & s!setup)
│   │   ├── musicCommandHandler.js   # Xử lý toàn bộ lệnh phát nhạc prefix s!
│   │   ├── musicButtonHandler.js    # Xử lý tương tác nút bấm Player & phân trang Hàng đợi
│   │   ├── memberNotificationService.js # Business logic gửi thông báo thành viên
│   │   ├── moderationService.js         # Business logic kiểm duyệt tin nhắn
│   │   ├── warningStore.js              # Quản lý điểm phạt & thời gian hết hạn
│   │   ├── whitelistService.js          # Quản lý lưu trữ Whitelist theo Guild
│   │   ├── whitelistCommandHandler.js   # Xử lý câu lệnh !whitelist / !wl
│   │   ├── guildSettingsService.js      # Quản lý cấu hình bật/tắt tính năng & AI Model theo Guild
│   │   ├── featureCommandHandler.js     # Xử lý câu lệnh !feature / !toggle
│   │   ├── helpCommandHandler.js        # Xử lý câu lệnh !help / /help / s!help
│   │   └── toxicity/                    # Các bộ phân loại độc hại (Strategy Pattern)
│   ├── utils/
│   │   ├── embedBuilder.js   # Module chuyên tạo Embed Card Discord tiếng Việt
│   │   └── logger.js         # Hệ thống log màu sắc theo thời gian thực
│   └── index.js              # Entrypoint khởi chạy ứng dụng
├── tests/
│   ├── ai.test.js                 # Test toàn diện AI Assistant, Tavily RAG & Setup Model
│   ├── moderation.test.js         # Test kiểm duyệt ngôn từ & điểm phạt
│   ├── music_setup.test.js        # Test hệ thống phát nhạc & phân quyền kênh
│   ├── music_buttons.test.js      # Test nút bấm Player & phân trang
│   └── notification_setup.test.js # Test cấu hình kênh thông báo & đa server
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
GUILD_ID= # (Tùy chọn) Chỉ điền nếu muốn đồng bộ Slash Commands tức thì khi test dev

# Cấu hình AI Assistant & Tavily Search RAG
GEMINI_API_KEY=dien_gemini_api_key
OPENROUTER_API_KEY=dien_openrouter_api_key
TAVILY_API_KEY=dien_tavily_api_key
AI_PRIMARY_PROVIDER=gemini
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