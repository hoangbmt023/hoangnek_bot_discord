# 📖 Hướng Dẫn Thiết Lập Discord Bot Từ A-Z

Tài liệu này hướng dẫn chi tiết cách tạo ứng dụng Bot trên Discord Developer Portal, lấy Token, cấp quyền Intents, mời Bot vào server và lấy Channel ID.

---

## Bước 1: Tạo Application & Bot trên Discord Developer Portal

1. Truy cập vào trang [Discord Developer Portal](https://discord.com/developers/applications).
2. Đăng nhập bằng tài khoản Discord của bạn.
3. Nhấn vào nút **New Application** ở góc trên bên phải.
4. Đặt tên cho ứng dụng (ví dụ: `HoangNek Bot`) và nhấn **Create**.

---

## Bước 2: Lấy Token & Bật Gateway Intents (Cực kỳ quan trọng)

1. Ở menu bên trái, chọn mục **Bot**.
2. Nhấn nút **Reset Token** (hoặc **View Token**) và sao chép mã Token.
   - ⚠️ **Cảnh báo**: Tuyệt đối không chia sẻ Token này cho bất kỳ ai hoặc đẩy lên GitHub công khai!
   - Dán token vừa lấy vào biến `DISCORD_TOKEN=` trong file `.env.development` (hoặc `.env.production`).
3. Trong phần **Authorization Settings**:
   - Đảm bảo bật công tắc **PUBLIC BOT** (Để người khác và các server khác có thể mời bot vào).
4. Cuộn trang xuống phần **Privileged Gateway Intents**:
   - Bật **PRESENCE INTENT** (Tùy chọn)
   - Bật **SERVER MEMBERS INTENT** (**BẮT BUỘC** - Để nhận sự kiện thành viên vào/rời server và lấy Role).
   - Bật **MESSAGE CONTENT INTENT** (**BẮT BUỘC** - Để bot đọc nội dung tin nhắn phục vụ lọc ngôn từ độc hại và nhận diện lệnh prefix `s!`, `!wl`, `!feature`).
5. Nhấn **Save Changes** ở góc dưới.

---

## Bước 3: Lấy Client ID & Mời Bot vào Nhiều Server (Multi-Server)

### 3.1 Tạo Link Mời Bot Đa Năng
1. Vào mục **General Information** -> Copy **APPLICATION ID** (Dán vào `CLIENT_ID=` trong file `.env`).
2. Ở menu bên trái, chọn mục **OAuth2** -> **OAuth2 URL Generator**:
   - **Scopes**: Tích chọn `bot` và `applications.commands` (để dùng Slash Commands).
   - **Bot Permissions**:
     - **General/Text**: `Administrator` (hoặc `Manage Roles`, `Manage Channels`, `View Channels`, `Send Messages`, `Embed Links`, `Attach Files`, `Read Message History`, `Use External Emojis`, `Moderate Members`)
     - **Voice**: `Connect`, `Speak`, `Use Voice Activity`
3. Hoặc bạn có thể dùng trực tiếp đường link chuẩn sau (thay `YOUR_CLIENT_ID` bằng Client ID của bạn):
   ```
   https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
   ```
4. Mở link trên trình duyệt -> Chọn bất kỳ Server nào bạn có quyền Quản lý máy chủ (Manage Server) hoặc Admin -> Nhấn **Authorize** (Ủy quyền).

---

## Bước 4: Cấu Hình Kênh Thông Báo Vào/Ra & Lệnh Server

### 4.1 Cơ chế thông báo Vào/Ra Động (Không cần cài đặt .env)
Bot được thiết kế hoạt động độc lập trên **nhiều Server cùng lúc (Multi-Guild)**. Bạn **không cần** điền ID kênh vào `.env` nữa:
- **Mặc định**: Khi thành viên vào hoặc rời server, Bot sẽ tự động gửi thông báo vào **Kênh hệ thống (System Channel)** của Server.
- **Tùy chỉnh kênh riêng**: Quản trị viên của từng Server có thể chỉ định kênh mong muốn bằng lệnh Discord:
  ```
  /setup notify set type:welcome channel:#chao-mung
  /setup notify set type:leave channel:#tam-biet
  /setup notify set type:all channel:#general
  ```
  Hoặc bằng lệnh Prefix:
  ```
  s!setup notify welcome #chao-mung
  s!setup notify leave #tam-biet
  s!setup welcome #chao-mung
  s!setup notify reset   (Khôi phục về kênh hệ thống mặc định)
  s!setup notify status  (Xem cấu hình kênh hiện tại của server)
  ```

---

### 4.2 Biến Môi Trường `GUILD_ID` (Tùy chọn khi phát triển)
- `GUILD_ID` trong `.env` là **tùy chọn**, chỉ dùng khi lập trình viên muốn đồng bộ Slash Commands tức thì (trong 1 giây) lên 1 server test.
- Khi triển khai thực tế (Production), bạn có thể **để trống `GUILD_ID=`**, Bot sẽ tự động đăng ký Slash Commands toàn cục (Global) cho tất cả Server!

---

### 4.3 Cấu Hình AI Assistant, Chọn Nhà Cung Cấp Chính & Tùy Chỉnh Model
Bot hỗ trợ **AI Assistant thông minh** (`!ask <câu hỏi>` hoặc `/ask question:<câu hỏi>`), tự động hiểu thông tin server, nội quy, kênh chat, role và lệnh bot.

#### 1. Cài đặt trong `.env.development` / `.env.production`:
- `GEMINI_API_KEY`: Lấy API Key miễn phí tại [Google AI Studio](https://aistudio.google.com/).
- `OPENROUTER_API_KEY`: Lấy API Key tại [OpenRouter](https://openrouter.ai/).
- `TAVILY_API_KEY`: Lấy API Key miễn phí tại [Tavily API Platform](https://app.tavily.com/home) (Công cụ AI Search & RAG chuyên dụng cho AI Agents).
- `AI_PRIMARY_PROVIDER`: Chọn nhà cung cấp AI chính mặc định toàn hệ thống (`gemini` hoặc `openrouter`).

#### 2. Model AI Mặc Định:
- **Google Gemini (Chính):** `gemini-3.6-flash` (Chuẩn Google AI Studio thế hệ mới, tối ưu tốc độ & trí tuệ).
- **Google Gemini (Tùy chọn siêu nhanh):** `gemini-3.5-flash-lite` (Phản hồi ~1.0s).
- **OpenRouter (Dự phòng):** `openrouter/free` (Tự động định tuyến sang các model miễn phí tốt nhất như `google/gemma-4-31b-it:free`, `qwen/qwen3.8-27b:free`...).

#### 3. Nguồn Dữ Liệu AI Đọc & Hiểu Server (RAG / Context):
AI Assistant trả lời câu hỏi dựa trên kiến trúc phân luồng thông minh:
1. **Dữ liệu động từ Discord API (`serverContextService.js`):** Tự động đọc tên server, số thành viên, danh sách kênh chat/voice, danh sách roles, danh sách bot và toàn bộ lệnh bot đang có trong server.
2. **Cơ sở tri thức Markdown `data/server-knowledge.md` (`serverKnowledgeService.js`):**
   - Chứa **Nội quy server**, **Cơ chế lọc ngôn từ & hình phạt**, **Bảng lệnh bot**, **Hướng dẫn Admin**, và **FAQ**.
   - Quản trị viên chỉ cần mở file `data/server-knowledge.md` viết trực tiếp bằng Markdown tự nhiên (dễ đọc, cấu trúc rõ ràng và tiết kiệm token nhất cho LLM).
3. **Tìm kiếm Internet Thời gian thực (`tavilySearchService.js`):**
   - Khi câu hỏi nằm ngoài tri thức server, bot tự động tra cứu bằng **Tavily AI Search Platform** với cơ chế đa tầng: **Basic** (tiết kiệm credits & phản hồi nhanh) ➔ Tự động nâng cấp lên **Advanced** (chuyên sâu) nếu kết quả cần thêm dữ liệu đối chiếu.

#### 4. Cấu Hình Nhà Cung Cấp Chính (Primary) & Model Trực Tiếp Trong Discord:
Quản trị viên có thể chọn Nhà cung cấp AI làm **Chính (Primary)** và cấu hình Model cho riêng Server của mình:

- **Xem trạng thái AI hiện tại của Server:**
  ```
  /setup ai status
  s!setup ai status
  ```

- **Chọn Nhà Cung Cấp AI Chính (Primary Provider):**
  *(Bot sẽ ưu tiên gọi Provider chính trước, nếu xảy ra sự cố hoặc hết Quota sẽ tự động fallback sang Provider còn lại)*
  ```
  /setup ai set-primary provider:openrouter   (hoặc provider:gemini)
  s!setup ai primary openrouter               (hoặc s!setup primary openrouter)
  s!setup ai primary gemini                   (hoặc s!setup primary gemini)
  ```

- **Đổi Model Google Gemini:**
  ```
  /setup ai set-model provider:gemini model:gemini-3.6-flash
  s!setup ai set gemini gemini-3.5-flash-lite
  ```

- **Đổi Model OpenRouter:**
  ```
  /setup ai set-model provider:openrouter model:openrouter/free
  s!setup ai set openrouter openrouter/free
  ```

- **Đặt lại cấu hình AI về mặc định:**
  ```
  /setup ai reset-model provider:all          (hoặc provider:primary / provider:gemini / provider:openrouter)
  s!setup ai reset all
  ```

#### 5. Cấu Hình Nguồn Dữ Liệu Server Cho AI Trực Tiếp Từ Discord (/setup knowledge):
*(Yêu cầu quyền: **Quản trị viên / Manage Server**)*

Thay vì phải chỉnh sửa file thủ công trên hosting, Quản trị viên có thể cấu hình nguồn tri thức động cho AI ngay trong Discord:

- **Thêm/Xóa Kênh Tri Thức Đa Kênh:** *(AI sẽ tự động đọc tất cả các tin nhắn ghim - Pinned Messages & Embeds từ toàn bộ các kênh này theo thời gian thực)*
  ```
  /setup knowledge add-channel channel:#rule
  /setup knowledge add-channel channel:#data-server
  /setup knowledge remove-channel channel:#data-server
  s!setup knowledge add-channel #rule
  s!setup knowledge remove-channel #data-server
  ```

- **Thêm/Xóa Nhiều Tin Nhắn Chỉ Định từ bất kỳ kênh nào (bằng Link hoặc ID tin nhắn + Kênh):** *(Bạn có thể đứng ở bất kỳ kênh nào trong server để thêm tin nhắn của kênh khác)*
  ```
  # Thêm bằng Link tin nhắn (tự động nhận diện kênh và ID tin nhắn):
  /setup knowledge add-message message:https://discord.com/channels/123/456/789
  s!setup knowledge add-message https://discord.com/channels/123/456/789

  # Thêm bằng ID tin nhắn + chọn Kênh:
  /setup knowledge add-message message:789123456789012345 channel:#thong-bao
  s!setup knowledge add-message 789123456789012345 #thong-bao

  # Xóa tin nhắn khỏi danh sách tri thức:
  /setup knowledge remove-message message:https://discord.com/channels/123/456/789
  s!setup knowledge remove-message 789123456789012345
  ```

- **Thêm/Xóa Nhiều Đoạn Văn Bản Quy Định / Thông Tin Bổ Sung Tùy Chỉnh:**
  ```
  # Thêm đoạn văn bản tùy chỉnh:
  /setup knowledge add-text content:Server chuyên về PUBG và lập trình Node.js.
  /setup knowledge add-text content:Quy định phòng thoại: Không bật mic khi đang ăn uống hoặc ồn ào.
  s!setup knowledge text Server chuyên về PUBG và lập trình Node.js.
  s!setup knowledge add-text Quy định phòng thoại: Không bật mic khi đang ăn uống hoặc ồn ào.

  # Xóa đoạn văn bản theo số thứ tự (Xem số thứ tự trong /setup knowledge status):
  /setup knowledge remove-text index:1
  s!setup knowledge remove-text 1
  ```

- **Xem trạng thái & Đặt lại cấu hình dữ liệu Server:**
  ```
  /setup knowledge status                     (hoặc s!setup knowledge status)
  /setup knowledge reset                      (hoặc s!setup knowledge reset)
  ```

> [!TIP]
> **Cơ chế Phân Luồng Thông Minh (Dynamic Keyword Matching - Hỗ trợ Tiếng Việt Có Dấu & Không Dấu):**
> Khi người dùng đặt câu hỏi bằng lệnh `!ask` hoặc `/ask`, Bot tự động phân tích và so khớp từ khóa với toàn bộ nội dung tin nhắn ghim trong các kênh tri thức (hỗ trợ cả gõ có dấu như *"nội quy"*, *"bảo vệ tài khoản"* lẫn không dấu như *"noi quy"*, *"bao ve tai khoan"*).
> * Nếu khớp dữ liệu nội bộ: Bot lập tức trả lời bằng dữ liệu server mà **không gọi tìm kiếm web** $\rightarrow$ Tiết kiệm API và phản hồi siêu tốc (~0.5s).
> * Nếu không khớp dữ liệu nội bộ: Bot tự động chuyển tiếp tra cứu Internet bằng **Tavily AI Search RAG** để cung cấp câu trả lời thời gian thực chính xác nhất.

---

## Bước 5: Cấp Quyền (Permissions) Cho Bot (Rất quan trọng)

Nếu bạn gặp cảnh báo `[WARN] Bot không đủ quyền (ViewChannel / SendMessages / EmbedLinks) tại kênh #...`, hãy thực hiện một trong các cách sau để cấp quyền cho Bot:

### Cách 1: Cấp quyền Quản trị viên (Administrator) cho Role của Bot (Khuyên dùng khi Dev/Test)
1. Trong Server Discord, nhấn vào tên Server (góc trên bên trái) -> Chọn **Server Settings** (Cài đặt máy chủ).
2. Chọn mục **Roles** (Vai trò).
3. Tìm và click vào Role có tên của Bot (ví dụ: `HoangNek Bot`).
4. Chuyển sang tab **Permissions** (Quyền hạn).
5. Cuộn xuống dưới cùng và bật quyền **Administrator** (Quản trị viên) -> Nhấn **Save Changes** (Lưu thay đổi).

---

### Cách 2: Cấp quyền riêng tại Kênh Thông Báo (Ví dụ: kênh `#kkk`)
Nếu kênh chat của bạn bị tắt quyền gửi tin nhắn đối với `@everyone` hoặc là kênh thông báo/kênh riêng tư, bạn cần cấp quyền trực tiếp tại kênh đó:
1. **Click chuột phải vào kênh chat** (ví dụ `#kkk`) -> Chọn **Edit Channel** (Chỉnh sửa kênh - biểu tượng bánh răng).
2. Chọn mục **Permissions** (Quyền hạn) ở menu bên trái.
3. Trong phần **Advanced permissions** (Quyền hạn nâng cao), nhấn vào dấu cộng `+` bên cạnh *Roles/Members* và chọn tên Bot của bạn (hoặc Role của Bot).
4. Tích **dấu tick xanh (✔)** cho 3 quyền bắt buộc sau:
   - 👁️ **View Channel** (Xem kênh)
   - 💬 **Send Messages** (Gửi tin nhắn)
   - 🔗 **Embed Links** (Nhúng liên kết)
5. Nhấn **Save Changes** (Lưu thay đổi).

---

### Cách 3: Kiểm tra thứ tự Role của Bot
1. Vào **Server Settings** -> **Roles**.
2. Kéo Role của Bot lên trên các Role của thành viên thông thường.

---

## Bước 6: Tải Mã Nguồn, Cài Đặt & Chạy Thử Bot

### 6.1 Tải mã nguồn về máy:
- **Cách 1 (Git Clone)**:
  ```bash
  git clone https://github.com/hoangbmt023/hoangnek_bot_discord.git
  cd hoangnek_bot_discord
  ```
- **Cách 2 (Tải ZIP / Release)**:
  1. Tải file ZIP từ nút **`Code` -> `Download ZIP`** trên GitHub hoặc tải file nén tại trang **`Releases`**.
  2. Giải nén và mở thư mục bằng Terminal / VSCode.

### 6.2 Cài đặt thư viện:
```bash
npm install
```

### 6.3 Khởi chạy Bot:
Chạy lệnh sau tại thư mục dự án:
```bash
npm run dev
```

Nếu thành công, bạn sẽ thấy log:
```
[INFO] Đã nạp biến môi trường thành công từ: .env.development
[INFO] Đang khởi động Bot trên môi trường [DEVELOPMENT]...
[INFO] Đã nạp thành công 3 sự kiện.
[SUCCESS] Bot đã đăng nhập thành công với tài khoản: YourBot#1234
[INFO] Đang hoạt động trên 1 server(s).
```

Hãy thử mời một tài khoản phụ vào server hoặc gõ `s!play <tên bài>` trong kênh được cấp phép để trải nghiệm bot!

---

## Bước 7: Xem Log Trực Tiếp (Live Stream Logs) Trên cPanel / VPS

Khi Bot chạy ngầm (Background/Daemon) trên cPanel hoặc Server, bạn có thể mở Terminal và xem log trực tiếp mà không cần khởi động lại bot:

1. **Xem toàn bộ log thời gian thực**:
   ```bash
   tail -f logs/app.log
   ```
2. **Xem riêng các thông báo lỗi (Error)**:
   ```bash
   tail -f logs/error.log
   ```
3. **Thoát khỏi màn hình xem log**:
   - Nhấn phím `Ctrl + C` (lệnh này chỉ tắt màn hình xem log, bot vẫn chạy ngầm bình thường).

> [!NOTE]
> Hệ thống log được tự động phân loại theo ngày (`logs/daily/app-YYYY-MM-DD.log`) và **tự động xóa dọn dẹp các file log cũ hơn 60 ngày** để tiết kiệm dung lượng hosting.
