# 🛡️ Hướng Dẫn Hệ Thống Lọc Ngôn Từ Độc Hại & Hate Speech (3 Nhãn)

Tài liệu này giải thích chi tiết cách thức hoạt động, quy trình phân loại 3 cấp độ nhãn (**`CLEAN`**, **`OFFENSIVE`**, **`HATE`**), cơ chế tích lũy điểm phạt và cách tùy biến cấu hình hệ thống kiểm duyệt tự động cho Discord Bot.

---

## 🗺️ 1. Cơ chế phân loại 3 cấp độ nhãn

Khác với các bộ lọc phân loại nhị phân thông thường (*Toxic / Non-Toxic*), hệ thống áp dụng mô hình phân loại **3 nhãn tiêu chuẩn tiếng Việt (ViHSD)**:

| Cấp độ Nhãn | Ý nghĩa & Mô tả | Ví dụ thực tế | Điểm phạt | Hành động |
| :---: | :--- | :--- | :---: | :--- |
| **`TRONG SẠCH`** | Nội dung bình thường, thân thiện, hợp lệ | *"Video này hay quá"*, *"Chào bạn nhé"* | `0` | Cho qua, không xử lý |
| **`XÚC PHẠM`** | Chửi thề, nói tục, xúc phạm nhẹ hoặc vừa | *"Mày ngu vãi"*, *"đồ ngu"*, *"vcl"*, *"đm"* | `+1` | Xóa tin nhắn + Cảnh cáo riêng |
| **`THÙ GHÉT`** | Ngôn từ thù ghét, đe dọa bạo lực, xúc phạm danh dự, phân biệt vùng miền | *"giết cả nhà mày"*, *"chết mẹ mày đi"*, *"bắc kỳ chó"* | `+2` | Xóa tin nhắn + Cảnh cáo nặng riêng |

---

## ⚙️ 2. Sơ đồ luồng hoạt động (Workflow Diagram)

```mermaid
flowchart TD
    A[Người dùng gửi tin nhắn] --> B{Bỏ qua?}
    B -->|Là Bot / Webhook / Có quyền Admin| C[Bỏ qua - Không kiểm duyệt]
    B -->|Thành viên thông thường| D[HybridToxicityDetector]
    
    subgraph Engine Phân Loại
        D --> E[1. RuleBased Engine: Regex & Normalizer]
        E -->|Phát hiện vi phạm rõ ràng| G[Trả về kết quả]
        E -->|Nghi ngờ / Không chắc chắn| F[2. AI Model ViHSD / ONNX]
        F --> G
    end
    
    G --> H{Kết quả nhãn}
    H -->|CLEAN| I[Tin nhắn hợp lệ]
    H -->|OFFENSIVE (+1)| J[Xóa tin nhắn & Tăng điểm WarningStore]
    H -->|HATE (+2)| J
    
    J --> K{Kiểm tra Tổng điểm Cảnh cáo}
    K -->|1 - 2 cảnh cáo| L[Gửi Embed cảnh cáo riêng qua DM cho người gửi]
    K -->|3 - 4 cảnh cáo| M[Gửi DM Cảnh cáo + Phạt Timeout tạm khóa chat 10 phút]
    K -->|5 - 6 cảnh cáo| N[Gửi DM Cảnh cáo + Kick thành viên khỏi Server]
    K -->|>= 7 cảnh cáo| O[Gửi DM Cảnh cáo + Cấm vĩnh viễn / Ban khỏi Server]
```

---

## ⚖️ 3. Thang phạt & Cơ chế tích lũy điểm cảnh cáo

### 📊 Thang phạt lũy tiến:
- **Ngưỡng 1: Cảnh cáo ban đầu (1 - 2 điểm)**:
  - Tự động xóa tin nhắn vi phạm.
  - Gửi thẻ Embed cảnh cáo lịch sự kèm số điểm vi phạm hiện tại.
- **Ngưỡng 2: Timeout tạm khóa chat ($\ge 3$ điểm)**:
  - Tự động khóa quyền gửi tin nhắn của thành viên trong **10 phút** (`member.timeout`).
- **Ngưỡng 3: Kick khỏi Server ($\ge 5$ điểm)**:
  - Trục xuất thành viên khỏi server (`member.kick`).
- **Ngưỡng 4: Ban vĩnh viễn ($\ge 7$ điểm)**:
  - Cấm vĩnh viễn tài khoản khỏi server (`member.ban`).

### ⏳ Cơ chế tự động hạ điểm (Cooldown / Expiration):
- Điểm cảnh cáo được lưu trong `WarningStore` theo cặp `GuildID:UserID`.
- Sau **24 giờ** kể từ lần vi phạm cuối cùng nếu thành viên không tái phạm, hệ thống sẽ **tự động xóa toàn bộ điểm phạt** về 0.

---

## 🤖 4. Kiến trúc phân loại kép (Hybrid Detection & ONNX)

Hệ thống sử dụng mô hình kết hợp **Hybrid Toxicity Detector** tuân thủ nguyên lý **SOLID**:

```
Message Content
      ↓
[ Chuẩn hóa Tiếng Việt (Xóa ký tự lặp, giải mã teencode/leetspeak) ]
      ↓
[ Bộ lọc Luật Tốc độ cao (RuleBasedDetector) ]
      ↓ (Nếu chưa vi phạm rõ ràng)
[ Mô hình AI Phân tích Ngữ cảnh (AIModelDetector - ViHSD / ONNX) ]
      ↓
[ Kết quả chuẩn hóa: CLEAN / OFFENSIVE / HATE ]
```

### 💡 Lợi thế khi triển khai trên cPanel Production:
1. **Không cần Python**: Toàn bộ hệ thống chạy trực tiếp trên Node.js thông qua ONNX / `@huggingface/transformers`.
2. **Tiết kiệm tài nguyên**: Bộ lọc luật xử lý ngay 95% các trường hợp thô tục rõ ràng trong `< 1ms`, chỉ chuyển sang AI với các câu ngữ cảnh phức tạp.
3. **An toàn 100% (Fallback Mechanism)**: Nếu mô hình AI chưa tải xong hoặc server quá tải, hệ thống vẫn hoạt động ổn định và chính xác thông qua Rule-based Engine.

---

## 🛠️ 5. Hướng dẫn thiết lập quyền trên Discord Developer Portal

Để bot có thể đọc nội dung tin nhắn và thực hiện quyền kiểm duyệt:

1. Truy cập [Discord Developer Portal](https://discord.com/developers/applications) ➔ Chọn ứng dụng của bạn.
2. Vào mục **Bot** ➔ Cuộn xuống phần **Privileged Gateway Intents**:
   - Bật **`MESSAGE CONTENT INTENT`** (Bắt buộc để đọc nội dung tin nhắn).
   - Bật **`SERVER MEMBERS INTENT`** (Bắt buộc để quản lý thành viên).
3. **Phân quyền Bot trong Server Discord**:
   - Đảm bảo Role của Bot có các quyền:
     - `Manage Messages` (Xóa tin nhắn vi phạm).
     - `Moderate Members` (Phạt Timeout).
     - `Kick Members` (Kick thành viên).
     - `Ban Members` (Ban thành viên).
   - *Lưu ý: Vị trí Role của Bot trong danh sách Role của Server phải nằm phía trên các thành viên cần kiểm duyệt.*

---

## ⚙️ 6. Tùy chỉnh cấu hình trong code

Bạn có thể chỉnh sửa trực tiếp các ngưỡng phạt tại file [src/config/moderation.js](file:///c:/File_Hoc/NodeJs/hoangnek_bot_discord/src/config/moderation.js):

```javascript
const MODERATION_CONFIG = {
  enabled: true, // Bật/tắt kiểm duyệt

  warningPoints: {
    CLEAN: 0,
    OFFENSIVE: 1, // Điểm phạt cho XÚC PHẠM (+1)
    HATE: 2,      // Điểm phạt cho THÙ GHÉT (+2)
  },

  thresholds: {
    timeout: 3, // Ngưỡng phạt Timeout (>= 3 điểm)
    kick: 5,    // Ngưỡng phạt Kick (>= 5 điểm)
    ban: 7,     // Ngưỡng phạt Ban (>= 7 điểm)
  },

  timeoutDurationMs: 10 * 60 * 1000,   // 10 phút
  warningExpirationMs: 24 * 60 * 60 * 1000, // 24 giờ
  deleteViolatingMessage: true,        // Tự động xóa tin nhắn vi phạm
};
```

---

## 🛡️ 7. Tính năng Danh sách trắng (Whitelist / Bỏ qua kiểm duyệt)

Quản trị viên có thể thêm các thành viên đáng tin cậy vào **Whitelist** để bỏ qua kiểm duyệt ngôn từ độc hại hoặc tất cả tính năng bằng **Slash Command duy nhất `/wl`**:

### 📋 1. Sử dụng Slash Command (`/wl`):
> **Lưu ý**: Chỉ thành viên có quyền **Administrator**, **Manage Guild** hoặc **Manage Messages** mới có thể thực hiện các lệnh này.

| Lệnh Slash | Tham số | Ví dụ thực tế | Mô tả |
| :--- | :--- | :--- | :--- |
| `/wl add` | `feature` (toxic/all), `users` (danh sách user) | `/wl add feature:toxic users:@user1, @user2, 123456789` | Thêm nhiều người dùng vào Whitelist theo chức năng |
| `/wl remove` | `feature` (toxic/all), `users` (danh sách user) | `/wl remove feature:toxic users:@user1, @user2` | Xóa nhiều người dùng khỏi Whitelist theo chức năng |
| `/wl list` | `feature` *(tùy chọn)* | `/wl list feature:toxic` hoặc `/wl list` | Hiển thị danh sách Whitelist theo chức năng hoặc toàn bộ |
| `/wl clear` | `feature` *(tùy chọn)* | `/wl clear feature:toxic` hoặc `/wl clear` | Xóa danh sách Whitelist của một chức năng hoặc toàn bộ |

---

### 💬 2. Sử dụng Cú pháp Chat nhanh (Text Command):
Hệ thống cũng hỗ trợ gõ nhanh trực tiếp trong kênh chat:
- **Thêm nhanh nhiều người**: `/wl toxic @user1, @user2, @user3` (hoặc `!wl add toxic @user1, @user2`)
- **Xóa nhanh nhiều người**: `/wl remove toxic @user1, @user2` (hoặc `!wl remove toxic @user1, @user2`)
- **Xem danh sách**: `/wl list` (hoặc `!wl list`)
- **Xóa toàn bộ**: `/wl clear` (hoặc `!wl clear`)

---

### 💾 3. Lưu trữ dữ liệu:
Dữ liệu Whitelist được lưu trữ tự động và bền vững theo từng Server tại file `data/whitelist.json`. Cấu trúc phân tách rõ ràng theo Server ID và từng tính năng (`toxic`, `all`).

---

## 📖 8. Lệnh Trợ Giúp Hướng Dẫn (`/help`)

Hệ thống cung cấp lệnh `/help` chuyên biệt (hỗ trợ cả Slash Command và Text Command `!help` / `/help`) với các danh mục trợ giúp chi tiết:

| Lệnh | Phạm vi trợ giúp | Mô tả |
| :--- | :--- | :--- |
| `/help` hoặc `/help all` | `all` | Tổng quan danh sách tất cả các lệnh và tính năng của Bot |
| `/help whitelist` | `whitelist` | Hướng dẫn chi tiết cách thêm, xóa, xem và dọn dẹp danh sách Whitelist (`/wl`) |
| `/help feature` | `feature` | Hướng dẫn bật/tắt module và lọc danh sách trạng thái (`/feature`) |
| `/help moderation` | `moderation` | Giải thích chi tiết 3 nhãn (`TRONG SẠCH`, `XÚC PHẠM`, `THÙ GHÉT`) và các mức phạt luỹ tiến |
| `/help notifications` | `notifications` | Hướng dẫn cơ chế thông báo Chào mừng & Tạm biệt thành viên |

---

## 🎛️ 9. Tính năng Bật / Tắt chức năng của Bot (`/feature`)

Quản trị viên có thể linh hoạt Bật hoặc Tắt từng tính năng của bot trong Server của mình thông qua lệnh Slash Command `/feature`:

### 📋 1. Sử dụng Slash Command (`/feature`):
> **Lưu ý**: Chỉ thành viên có quyền **Administrator** hoặc **Manage Guild** mới có thể thực hiện lệnh này.

| Lệnh Slash | Tham số | Ví dụ thực tế | Mô tả |
| :--- | :--- | :--- | :--- |
| `/feature enable` | `feature` (moderation/welcome/leave/all) | `/feature enable feature:moderation` | Bật một tính năng của bot |
| `/feature disable` | `feature` (moderation/welcome/leave/all) | `/feature disable feature:welcome` | Tắt một tính năng của bot |
| `/feature status` | Không có | `/feature status` | Xem trạng thái bật/tắt toàn bộ tính năng |

### 💬 2. Sử dụng Cú pháp Chat nhanh:
- `!feature enable moderation` hoặc `/feature enable moderation`
- `!feature disable leave` hoặc `/feature disable leave`
- `!feature status`

### 💾 3. Lưu trữ cài đặt:
Trạng thái bật/tắt tính năng được lưu bền vững theo từng Server tại `data/guild_settings.json`. Mặc định tất cả tính năng đều được **BẬT** khi bot mới vào server.

---

## 🧪 9. Kiểm thử tự động (Unit Test)

Chạy lệnh kiểm thử sau để kiểm tra toàn bộ logic phân loại, tích lũy điểm, Whitelist và Bật/Tắt tính năng:

```bash
npm test
```



