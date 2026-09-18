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

## 🛡️ 7. Tính năng Danh sách trắng (Whitelist: User, Role, Kênh)

Hệ thống Whitelist cho phép Quản trị viên miễn trừ kiểm duyệt ngôn từ độc hại (**chỉ áp dụng cho tính năng lọc ngôn từ**) cho 3 loại đối tượng:
1. **Người dùng (Users)**: Miễn trừ kiểm duyệt cho các cá nhân được tag `@user` hoặc qua User ID.
2. **Vai trò (Roles)**: Miễn trừ kiểm duyệt cho tất cả thành viên sở hữu vai trò được chỉ định `@Role` hoặc Role ID (ví dụ: Ban Quản Trị, VIP, Bot Tester).
3. **Kênh chat (Channels)**: Miễn trừ kiểm duyệt cho tất cả tin nhắn gửi trong một kênh chat cụ thể `#channel` hoặc Channel ID (ví dụ: kênh bot-commands, kênh xả stress).

---

### 📋 1. Sử dụng Slash Command (`/setup whitelist`):
> **Lưu ý**: Chỉ thành viên có quyền **Administrator** hoặc **Manage Guild** mới có thể thực hiện các lệnh này.

| Lệnh Slash | Tham số | Ví dụ thực tế | Mô tả |
| :--- | :--- | :--- | :--- |
| `/setup whitelist add` | `target` (users/roles/channels), `value` (tags/IDs) | `/setup whitelist add target:roles value:@VIP, @Moderator` | Thêm Người dùng, Role hoặc Kênh vào Whitelist |
| `/setup whitelist remove` | `target` (users/roles/channels), `value` (tags/IDs) | `/setup whitelist remove target:channels value:#general` | Xóa đối tượng khỏi danh sách Whitelist |
| `/setup whitelist list` | `target` *(tùy chọn: all/users/roles/channels)* | `/setup whitelist list target:roles` hoặc `/setup whitelist list` | Hiển thị danh sách Whitelist được định dạng trực quan |
| `/setup whitelist clear` | `target` *(tùy chọn: all/users/roles/channels)* | `/setup whitelist clear target:roles` hoặc `/setup whitelist clear` | Dọn dẹp danh sách Whitelist theo danh mục hoặc toàn bộ |

---

### 💬 2. Sử dụng Cú pháp Chat Prefix nhanh:
Hệ thống hỗ trợ quản lý nhanh bằng tiền tố `s!setup whitelist` hoặc `!wl`:
- **Thêm đối tượng**:
  - `!wl add user @user1, @user2` *(Thêm người dùng)*
  - `!wl add role @Admin, @VIP` *(Thêm vai trò)*
  - `!wl add channel #spam-box, #test` *(Thêm kênh miễn trừ)*
  - `s!setup whitelist add role @VIP`
- **Xóa đối tượng**:
  - `!wl remove user @user1`
  - `!wl remove role @VIP`
  - `!wl remove channel #spam-box`
- **Xem danh sách**:
  - `!wl list` *(Xem toàn bộ User, Role, Kênh)*
  - `!wl list role` *(Xem riêng Role)*
  - `!wl list channel` *(Xem riêng Kênh)*
- **Xóa toàn bộ**:
  - `!wl clear` *(Dọn sạch toàn bộ danh sách)*
  - `!wl clear role` *(Chỉ dọn sạch Role)*

---

### 💾 3. Lưu trữ dữ liệu:
Dữ liệu Whitelist được lưu trữ tự động và bền vững theo từng Server tại file `data/whitelist.json` dưới cấu trúc:
```json
{
  "123456789012345678": {
    "toxic": {
      "users": ["111111111111111111"],
      "roles": ["444444444444444444"],
      "channels": ["555555555555555555"]
    }
  }
}
```
*Tương thích ngược 100% với các phiên bản định dạng whitelist trước đó.*

---

## 📖 8. Lệnh Trợ Giúp Hướng Dẫn (`/help`)

Hệ thống cung cấp lệnh `/help` chuyên biệt (hỗ trợ cả Slash Command và Text Command `!help` / `s!help`) với các danh mục trợ giúp chi tiết:

| Lệnh | Phạm vi trợ giúp | Mô tả |
| :--- | :--- | :--- |
| `/help feature:all` (hoặc `!help`) | `all` | Tổng quan danh sách tất cả các lệnh và tính năng của Bot |
| `/help feature:music` (hoặc `s!help`) | `music` | Hướng dẫn chi tiết tất cả các lệnh phát nhạc (`s!play`, `s!skip`, `/music...`) |
| `/help feature:setup` | `setup` | Hướng dẫn phân quyền kênh, bật/tắt module và quản lý Whitelist qua `/setup` |
| `/help feature:whitelist` | `whitelist` | Hướng dẫn chi tiết cách thêm, xóa, xem danh sách Whitelist (`/setup whitelist`) |
| `/help feature:feature` | `feature` | Hướng dẫn bật/tắt module và tra cứu trạng thái (`/setup feature`) |
| `/help feature:moderation` | `moderation` | Giải thích chi tiết 3 nhãn (`TRONG SẠCH`, `XÚC PHẠM`, `THÙ GHÉT`) và các mức phạt lũy tiến |
| `/help feature:notifications` | `notifications` | Hướng dẫn cơ chế thông báo Chào mừng & Tạm biệt thành viên |

---

## 🎛️ 9. Tính năng Bật / Tắt chức năng của Bot (`/setup feature`)

Quản trị viên có thể linh hoạt Bật hoặc Tắt từng tính năng của bot trong Server thông qua lệnh **`/setup feature`**:

### 📋 1. Sử dụng Slash Command (`/setup feature`):
> **Lưu ý**: Chỉ thành viên có quyền **Administrator** hoặc **Manage Guild** mới có thể thực hiện lệnh này.

| Lệnh Slash | Tham số | Ví dụ thực tế | Mô tả |
| :--- | :--- | :--- | :--- |
| `/setup feature enable` | `feature` (moderation/welcome/leave/all) | `/setup feature enable feature:moderation` | Bật một tính năng của bot |
| `/setup feature disable` | `feature` (moderation/welcome/leave/all) | `/setup feature disable feature:welcome` | Tắt một tính năng của bot |
| `/setup feature status` | `feature` *(tùy chọn)* | `/setup feature status feature:moderation` | Xem trạng thái BẬT/TẮT của một tính năng hoặc toàn bộ |

### 💬 2. Sử dụng Cú pháp Chat Prefix nhanh:
- `s!setup feature enable moderation` (hoặc `!feature enable moderation`)
- `s!setup feature disable leave` (hoặc `!feature disable leave`)
- `s!setup feature status moderation` (hoặc `!feature status`)

### 💾 3. Lưu trữ cài đặt:
Trạng thái bật/tắt tính năng được lưu bền vững theo từng Server tại `data/guild_settings.json`. Mặc định tất cả tính năng đều được **BẬT** khi bot mới vào server.

---

## 🧪 10. Kiểm thử tự động (Unit Test)

Chạy lệnh kiểm thử sau để kiểm tra toàn bộ logic phân loại, tích lũy điểm, Whitelist và Bật/Tắt tính năng:

```bash
npm test
```



