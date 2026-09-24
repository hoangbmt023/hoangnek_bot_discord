# 🤖 Discord Bot - Welcome & Leave Notifier

Bot Discord được xây dựng bằng **Node.js** và thư viện **discord.js v14**, áp dụng kiến trúc **Clean Code** và **SOLID Principles**. Bot có tính năng tự động phát hiện và gửi thông báo kèm **Embed Card** đẹp mắt khi có thành viên mới tham gia hoặc rời khỏi Server.

---

- 🤖 **Trợ Lý AI Assistant Thông Minh (Prefix `!ask` & Slash `/ask`)**:
  - **Tích hợp Google Gemini & Đa Tầng Fallback OpenRouter**: Sử dụng Google Gemini (`gemini-3.6-flash`, `gemini-3.5-flash-lite`...) làm provider chính với `maxOutputTokens: 2048`, tự động fallback an toàn sang OpenRouter (`openrouter/free`, `nex-agi/nex-n2.5-mini:free`, `liquid/lfm-2.5-2.6b:free`...) khi gặp lỗi 429 Quota Exceeded hoặc sự cố mạng.
  - **Tavily AI Search RAG Đa Tầng (Cascading Search)**: Tự động tra cứu thông tin thời gian thực từ Internet bằng Tavily Search Platform với cơ chế tự động nâng cấp: `basic` ➔ `advanced` khi cần bổ sung dữ liệu đối chiếu, kèm bộ nhớ đệm Cache 15 phút.
  - **Cơ sở Tri thức Động từ Discord (/setup knowledge)**: Tự động đọc và thấu hiểu toàn diện nội quy máy chủ, thông báo và dữ liệu ghim (Pinned Messages & Embeds), tin nhắn chỉ định và văn bản tùy chỉnh, kèm RAM Cache (TTL 3 phút, phản hồi 0ms).
  - **Tùy biến Model AI theo từng Server (/setup ai & !setup ai)**: Quản trị viên có thể tự do đổi model Gemini, OpenRouter hoặc chọn Provider chính cho riêng Server của mình qua lệnh `/setup ai set-model` hoặc `!setup ai set <provider> <model>`.
  - **Bộ nhớ hội thoại ngắn hạn (Short-term Context Memory)**: Lưu trữ lịch sử hỏi đáp gần nhất, phân tách độc lập theo từng Server/User, tự động giải phóng bộ nhớ sau 15 phút.
  - **Chống spam (Rate Limit)**: Tự động giới hạn 1 request / 5 giây mỗi user.

- 🎵 **Hệ thống Phát Nhạc Cao Cấp (Duy nhất tiền tố `s!` & Slash `/music`)**:
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
- 🔒 **Phân Quyền Kênh Lệnh (/setup & !setup)**:
  - Mặc định khóa lệnh ở tất cả các kênh để chống spam chat.
  - Quản trị viên chỉ định các kênh văn bản được phép dùng lệnh qua `/setup channel add` hoặc `!setup channel add`.
- 🌟 **Thông báo Chào mừng & Tạm biệt Động (Multi-Guild Welcome & Leave)**:
  - Bắt sự kiện `guildMemberAdd` / `guildMemberRemove` và gửi Embed Card đẹp mắt.
  - **Mặc định**: Tự động gửi vào **Kênh hệ thống (System Channel)** của Server.
  - **Tùy chỉnh riêng cho từng Server**: Cài đặt qua lệnh `/setup notify set` hoặc `!setup notify <welcome|leave> #kênh` (hoặc `!setup welcome #kênh`, `!setup leave #kênh`), không phụ thuộc file `.env`.
  - Khôi phục mặc định dễ dàng bằng `/setup notify reset` hoặc `!setup notify reset`.
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
├── bin/                      # Thư mục chứa binary thực thi
│   └── yt-dlp.exe            # Binary yt-dlp tự động tải & cập nhật giải mã âm thanh
├── data/
│   └── guild_settings.json   # Quản lý toàn bộ cấu hình từng Server: Features, Kênh thông báo, Whitelist, Kênh lệnh, Model AI & Kênh Tri Thức Dynamic
├── docs/                     # Tài liệu hướng dẫn chi tiết
│   ├── MUSIC_GUIDE.md        # Hướng dẫn chi tiết hệ thống Phát Nhạc & Cấu hình kênh
│   ├── SETUP_GUIDE.md        # Hướng dẫn tạo Bot Discord, cấp quyền Intent & cấu hình AI
│   ├── PERMISSIONS_GUIDE.md  # Hướng dẫn phân quyền & kiểm soát truy cập lệnh
│   ├── ARCHITECTURE.md       # Giải thích kiến trúc SOLID & cách mở rộng
│   ├── CICD_GUIDE.md         # Hướng dẫn cấu hình CI/CD và GitHub Secrets
│   └── MODERATION_GUIDE.md   # Hướng dẫn chi tiết hệ thống Lọc ngôn từ & Hate Speech
├── logs/                     # Lưu trữ log vận hành bot
│   ├── app.log               # Log tổng hợp thông tin hoạt động
│   ├── error.log             # Log riêng các lỗi phát sinh
│   └── daily/                # Log được tự động phân tách theo ngày
├── src/
│   ├── commands/
│   │   ├── slashCommands.js  # Điều phối đăng ký Slash Commands toàn cầu (/ask, /setup, /music, /help)
│   │   └── builders/         # Các builder cấu hình Slash Command tách riêng biệt
│   │       ├── setupCommandBuilder.js # Builder Facade cho /setup
│   │       ├── setup/                 # Subcommand Groups con (/setup)
│   │       │   ├── channelGroup.js    # /setup channel
│   │       │   ├── whitelistGroup.js  # /setup whitelist
│   │       │   ├── featureGroup.js    # /setup feature
│   │       │   ├── notifyGroup.js     # /setup notify
│   │       │   ├── aiGroup.js         # /setup ai
│   │       │   └── knowledgeGroup.js  # /setup knowledge
│   │       ├── musicCommandBuilder.js # Builder cho /music
│   │       ├── helpCommandBuilder.js  # Builder cho /help
│   │       └── askCommandBuilder.js   # Builder cho /ask
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
│   │       ├── guildMemberAdd.js    # Sự kiện thành viên vào server (Gửi thẻ Welcome)
│   │       ├── guildMemberRemove.js # Sự kiện thành viên rời server (Gửi thẻ Leave)
│   │       ├── interactionCreate.js # Event Router tinh gọn (~90 dòng) điều phối Slash Command & Nút bấm
│   │       ├── messageCreate.js     # Message Router điều phối tin nhắn (!ask, s! music, !setup)
│   │       └── voiceStateUpdate.js  # Giám sát trạng thái voice, tự động rời phòng trống
│   ├── services/             # Business Logic phân chia theo từng Domain (DDD)
│   │   ├── ai/                      # 🤖 Domain Trợ lý AI Assistant & RAG
│   │   │   ├── skills/              # 📄 Prompt Templates dạng Markdown (.md)
│   │   │   │   ├── systemPrompt.md  # System prompt chuẩn mực (chống trích nguồn thô)
│   │   │   │   └── searchRagPrompt.md # Template format dữ liệu RAG Internet Grounding
│   │   │   ├── aiService.js              # Bộ điều phối trung tâm (Primary & Fallback)
│   │   │   ├── askCommandHandler.js     # Handler cho lệnh !ask và /ask
│   │   │   ├── geminiService.js          # Tích hợp Google Gemini API
│   │   │   ├── openrouterService.js      # Tích hợp OpenRouter Fallback Multi-model
│   │   │   ├── tavilySearchService.js    # Tích hợp Tavily AI Search RAG (lọc sạch citation thô)
│   │   │   ├── serverKnowledgeService.js # Quản lý cơ sở tri thức Server (Discord Dynamic RAG)
│   │   │   ├── serverContextService.js   # Trích xuất ngữ cảnh server thời gian thực
│   │   │   ├── promptService.js          # Nạp template .md từ skills/ và bind dữ liệu
│   │   │   └── memoryService.js          # Bộ nhớ hội thoại ngắn hạn theo Guild/User
│   │   ├── music/                   # 🎵 Domain Hệ thống Phát Nhạc
│   │   │   ├── Track.js                 # Đại diện bài hát & nạp Audio Resource
│   │   │   ├── YtDlpService.js          # Dịch vụ yt-dlp & FFmpeg stream native OggOpus
│   │   │   ├── MusicSourceResolver.js   # Phân giải YouTube, Spotify -> RAM Cache 1000 bài
│   │   │   ├── GuildQueue.js            # Quản lý hàng đợi nhạc, Player và Voice Connection
│   │   │   ├── MusicManager.js          # Quản lý singleton GuildQueue các Server
│   │   │   ├── musicCommandHandler.js   # Handler cho lệnh phát nhạc prefix s!
│   │   │   ├── musicButtonHandler.js    # Handler cho tương tác nút bấm Player & phân trang
│   │   │   └── musicSlashHandler.js     # Handler cho Slash Command /music
│   │   ├── moderation/              # 🛡️ Domain Kiểm Duyệt & Whitelist
│   │   │   ├── moderationService.js     # Business logic kiểm duyệt tin nhắn tự động
│   │   │   ├── warningStore.js          # Quản lý điểm phạt & thời gian hết hạn sau 24h
│   │   │   ├── whitelistService.js      # Quản lý lưu trữ Whitelist theo Guild
│   │   │   ├── whitelistCommandHandler.js # Xử lý lệnh cấu hình !setup whitelist
│   │   │   └── toxicity/                # Strategy Pattern phân loại độc hại
│   │   │       ├── IToxicityDetector.js # Interface chuẩn hóa cho bộ lọc ngôn từ
│   │   │       ├── RuleBasedDetector.js # Bộ lọc Regex tốc độ cao & teencode tiếng Việt
│   │   │       ├── AIModelDetector.js   # Phân loại ngữ cảnh AI
│   │   │       └── HybridToxicityDetector.js # Kết hợp Rule + AI Model
│   │   ├── settings/                # ⚙️ Domain Cấu Hình Server & Phân Quyền
│   │   │   ├── guildSettingsService.js  # Quản lý cấu hình đa server tại data/guild_settings.json
│   │   │   ├── channelSetupService.js   # Quản lý phân quyền kênh lệnh
│   │   │   ├── featureCommandHandler.js # Xử lý lệnh bật/tắt tính năng (!setup feature)
│   │   │   ├── setupCommandHandler.js   # Facade router tinh gọn điều phối !setup
│   │   │   ├── setupSlashHandler.js     # Handler cho Slash Command /setup & Autocomplete
│   │   │   └── handlers/                # Các Sub-handlers chuyên biệt (AI, Kênh, Notify, Knowledge, Whitelist...)
│   │   ├── notifications/           # 🔔 Domain Thông Báo Thành Viên
│   │   │   └── memberNotificationService.js # Business logic gửi thông báo Chào mừng/Tạm biệt
│   │   └── help/                    # ❓ Domain Trợ Giúp
│   │       └── helpCommandHandler.js    # Xử lý lệnh trợ giúp !help / /help / s!help
│   ├── utils/
│   │   ├── embedBuilder.js   # Facade điều phối tạo Embed Card Discord tiếng Việt chuẩn UI
│   │   ├── embeds/           # Modules Embeds phân theo Domain
│   │   │   ├── colors.js     # Bảng màu chuẩn thống nhất
│   │   │   ├── notificationEmbeds.js # Embeds Chào mừng / Tạm biệt
│   │   │   ├── moderationEmbeds.js   # Embeds Cảnh báo & Whitelist
│   │   │   ├── settingsEmbeds.js     # Embeds Cấu hình Server (Feature, AI, Knowledge, Channel, Notify)
│   │   │   ├── helpEmbeds.js         # Embeds Hướng dẫn sử dụng
│   │   │   ├── musicEmbeds.js        # Embeds & Button Rows Phát nhạc
│   │   │   └── aiEmbeds.js           # Embeds Trạng thái & Phản hồi AI
│   │   └── logger.js         # Hệ thống log màu sắc theo thời gian thực & xoay vòng file
│   └── index.js              # Entrypoint khởi chạy ứng dụng
├── tests/
│   ├── ai.test.js                 # Test toàn diện AI Assistant, Tavily RAG & Setup Model
│   ├── moderation.test.js         # Test kiểm duyệt ngôn từ & điểm phạt lũy tiến
│   ├── music_setup.test.js        # Test hệ thống phát nhạc & phân quyền kênh
│   ├── music_buttons.test.js      # Test nút bấm Player & phân trang tương tác
│   ├── notification_setup.test.js # Test cấu hình kênh thông báo & đa server
│   ├── test_ai_models.test.js     # Test phân luồng và kết nối các AI Model
│   ├── test_all_live_models.test.js # Test kiểm tra trực tiếp các Model Gemini/OpenRouter live
│   └── test_models_fast.test.js   # Test kiểm tra nhanh tốc độ phản hồi của các Model
├── .cpanel.yml               # Cấu hình cPanel Git Deployment native
├── .env.example              # Mẫu cấu hình môi trường
├── .env.development          # Cấu hình môi trường dev (đã được .gitignore)
├── .env.production           # Cấu hình môi trường prod (đã được .gitignore)
├── .gitignore
├── LICENSE                   # Giấy phép mã nguồn mở MIT
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
```

> [!TIP]
> **Lưu ý quan trọng về biến `GUILD_ID`:**
> - **Để trống (`GUILD_ID=`)**: Bot sẽ đăng ký Slash Commands ở chế độ **Toàn Cầu (Global)**. Lệnh sẽ có mặt trên tất cả các server mà Bot tham gia (Discord có thể mất từ 1 đến vài phút để đồng bộ toàn cầu).
> - **Điền ID Server cụ thể (Ví dụ: `GUILD_ID=123456789012345678`)**: Chỉ sử dụng khi phát triển/test dev. Slash Commands sẽ được cập nhật ngay lập tức (0ms) trong Server đó mà không cần chờ Discord cache toàn cầu.

> [!IMPORTANT]
> **Lưu ý bắt buộc về Quyền hạn Bot (Gateway Intents):**
> Bạn cần bật cả **SERVER MEMBERS INTENT** và **MESSAGE CONTENT INTENT** trong [Discord Developer Portal](https://discord.com/developers/applications) -> Mục **Bot** để Bot có thể nhận sự kiện thành viên và đọc nội dung tin nhắn phục vụ lọc từ ngữ độc hại. Xem chi tiết tại [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) và [docs/MODERATION_GUIDE.md](docs/MODERATION_GUIDE.md).

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
Dự án được phân phối dưới giấy phép mã nguồn mở **MIT License**. Xem chi tiết toàn văn giấy phép tại [LICENSE](LICENSE) hoặc xem thêm tại [opensource.org/licenses/MIT](https://opensource.org/licenses/MIT).

> **Tóm tắt điều khoản giấy phép MIT:**
> - **Quyền hạn**: Được phép sử dụng, sao chép, sửa đổi, hợp nhất, xuất bản, phân phối, cấp phép lại và/hoặc bán các bản sao của phần mềm cho mục đích cá nhân lẫn thương mại.
> - **Nghĩa vụ**: Giữ nguyên thông báo bản quyền gốc và điều khoản cấp phép trong mọi bản sao hoặc phần quan trọng của phần mềm.
> - **Miễn trừ trách nhiệm**: Phần mềm được cung cấp theo nguyên trạng ("AS IS"), không có bất kỳ hình thức bảo đảm nào và tác giả không chịu trách nhiệm đối với các khiếu nại, thiệt hại hay trách nhiệm pháp lý khác phát sinh từ việc sử dụng phần mềm.