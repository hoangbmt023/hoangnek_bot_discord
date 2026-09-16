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
   - Dán token vừa lấy vào biến `DISCORD_TOKEN=` trong file `.env.development`.
3. Cuộn trang xuống phần **Privileged Gateway Intents**:
   - Bật **PRESENCE INTENT** (Tùy chọn)
   - Bật **SERVER MEMBERS INTENT** (**BẮT BUỘC** - Nếu không bật, bot sẽ không nhận được sự kiện thành viên vào/rời server).
   - Bật **MESSAGE CONTENT INTENT** (Tùy chọn cho các lệnh sau này).
4. Nhấn **Save Changes** ở góc dưới.

---

## Bước 3: Lấy Client ID & Mời Bot vào Server

1. Ở menu bên trái, chọn mục **OAuth2** -> **OAuth2 URL Generator**.
2. Trong bảng **Scopes**:
   - Tích chọn `bot`
   - Tích chọn `applications.commands` (để dùng Slash Commands sau này)
3. Trong bảng **Bot Permissions** xuất hiện phía dưới:
   - Tích chọn các quyền:
     - `View Channels`
     - `Send Messages`
     - `Embed Links`
     - `Attach Files`
     - `Read Message History`
4. Sao chép đường dẫn **Generated URL** ở cuối trang.
5. Dán URL vào trình duyệt, chọn Server bạn muốn thêm Bot và nhấn **Authorize** (Ủy quyền).

---

## Bước 4: Lấy Server ID (GUILD_ID) & ID Kênh Thông Báo (Channel ID)

### 4.1 Bật Developer Mode trên Discord (Chỉ cần làm 1 lần)
1. Mở ứng dụng Discord trên máy tính hoặc trình duyệt.
2. Vào **User Settings** (Cài đặt người dùng - biểu tượng bánh răng ở góc dưới bên trái).
3. Chọn mục **Advanced** (Nâng cao) trong danh mục App Settings.
4. Bật công tắc **Developer Mode** (Chế độ nhà phát triển).

---

### 4.2 Lấy Server ID (`GUILD_ID`)
1. Nhìn vào thanh danh sách Server bên trái Discord.
2. **Click chuột phải vào icon của Server** bạn muốn dùng.
   *(Hoặc click chuột phải vào tên Server ở góc trên cùng của khung chat)*.
3. Chọn **Copy Server ID** (Sao chép ID máy chủ) ở dưới cùng của menu.
4. Dán ID này vào biến `GUILD_ID=` trong file `.env.development`.

> [!TIP]
> `GUILD_ID` là ID duy nhất đại diện cho Server Discord của bạn, thường dùng để đăng ký Slash Commands tức thì khi test hoặc giới hạn hoạt động của bot trong 1 server cụ thể.

---

### 4.3 Lấy ID Kênh Thông Báo (`WELCOME_CHANNEL_ID` & `LEAVE_CHANNEL_ID`)
Bot hỗ trợ gửi thông báo vào **2 kênh riêng biệt**:
1. **Kênh Chào mừng (Thành viên vào)**:
   - Click chuột phải vào kênh nhận tin chào mừng (ví dụ `#welcome` hoặc `#chao-mung`) -> Chọn **Copy Channel ID**.
   - Dán vào biến: `WELCOME_CHANNEL_ID=` trong `.env.development`.
2. **Kênh Tạm biệt (Thành viên rời)**:
   - Click chuột phải vào kênh nhận tin tạm biệt (ví dụ `#goodbye` hoặc `#tam-biet`) -> Chọn **Copy Channel ID**.
   - Dán vào biến: `LEAVE_CHANNEL_ID=` trong `.env.development`.

> [!NOTE]
> Nếu bạn muốn gửi **cả 2 thông báo vào chung 1 kênh**, bạn chỉ cần điền `WELCOME_CHANNEL_ID` và để trống `LEAVE_CHANNEL_ID`.

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

## Bước 6: Chạy thử Bot

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

Hãy thử mời một tài khoản phụ vào server hoặc kick tài khoản phụ ra khỏi server để kiểm tra thông báo embed của bot!
