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
