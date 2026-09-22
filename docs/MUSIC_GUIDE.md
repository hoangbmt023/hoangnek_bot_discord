# 🎵 Hướng Dẫn Hệ Thống Phát Nhạc Discord (Music System Guide)

Tài liệu hướng dẫn chi tiết về cấu trúc, cơ chế hoạt động, giải quyết nguồn phát âm thanh (Music Source Resolver), cấu hình kênh cho phép (`/setup` & `!setup`) và danh sách các câu lệnh điều khiển phát nhạc (`s!`).

---

## 🏗️ 1. Kiến Trúc Hệ Thống Phát Nhạc

```
                       [ Yêu cầu của người dùng ]
                    s!play <tên bài | link> / /music play
                                   │
                                   ▼
                       ┌────────────────────────┐
                       │  Message / Interaction │
                       │        Handler         │
                       └───────────┬────────────┘
                                   │ (Kiểm tra quyền kênh tại channelSetupService)
                                   ▼
                       ┌────────────────────────┐
                       │  MusicSourceResolver   │
                       │  (In-Memory RAM Cache) │
                       └───────────┬────────────┘
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
   🔴 YouTube              🟢 Spotify                 📁 Direct Audio File
 (yt-dlp Video/PL)  (Lấy Metadata: Tên + Nghệ sĩ)    (.mp3, .flac, .wav, .ogg)
         │                         │                         │
         │                         ▼                         │
         │                Thuật toán So khớp                 │
         │               Hybrid Album Matcher                │
         │               (Official First & PL)               │
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   │ (URL YouTube hợp lệ)
                                   ▼
                        ┌──────────────────────┐
                        │    YtDlpService      │
                        │ (yt-dlp Android Pipe │
                        │  -> FFmpeg libopus)  │
                        └──────────┬───────────┘
                                   ▼
                        ┌──────────────────────┐
                        │   @discordjs/voice   │
                        │ StreamType.OggOpus   │
                        │  (Native C Decoding) │
                        └──────────┬───────────┘
                                   ▼
                        🔊 Voice Channel Discord
```

---

## 🔍 2. Cơ Chế Giải Quyết Nguồn Âm Thanh (Music Source Resolver)

Hệ thống hỗ trợ các nền tảng sau theo đúng chuẩn xử lý âm thanh:

### 1. YouTube (`yt-dlp + FFmpeg Native OggOpus`)
- **Đầu vào:** Link video (`https://www.youtube.com/watch?v=...`, `https://youtu.be/...`), Playlist hoặc từ khóa tìm kiếm (`s!play <tên>` / `s!p <tên>`).
- **Xử lý:** Trích xuất metadata và tạo audio stream native OggOpus chuẩn Discord 20ms frame (`-c:a libopus -b:a 128k -ar 48000 -ac 2 -application audio -frame_duration 20 -f ogg` cùng bộ lọc âm lượng native `-filter:a volume=...`). Toàn bộ stream được giải mã và gửi thẳng qua UDP, tắt hoàn toàn phần mềm re-encoding `opusscript` của Node.js, loại bỏ triệt để hiện tượng rè tiếng (crackling), méo tiếng khi skip bài hoặc đổi bài.

### 2. Spotify (`Metadata Resolver -> Natural YouTube AI Ranking`)
- **Bản chất:** Spotify chủ yếu cung cấp metadata (tên bài, nghệ sĩ, album, duration), không phải nguồn audio công khai để bot tải/phát trực tiếp.
- **Cơ chế hoạt động Bộ Giải Quyết & Tìm Kiếm Chuẩn Xác:**
  1. **In-Memory RAM Cache (0ms):** Tự động lưu 1,000 bài hát gần nhất với TTL 2 giờ. Dung lượng RAM tiêu thụ chỉ ~1MB. Khi phát lại bài hát, lặp bài hoặc phát bài trùng, bot phản hồi trong 0ms.
  2. **Chuẩn hóa & Làm sạch Tiêu đề (Clean Title & No-Diacritics):** Tự động loại bỏ các tag thừa như `[Official MV]`, `[Audio]`, `(Lyrics)` và chuẩn hóa tên nghệ sĩ để ghép query chuẩn: `Tên bài + Tên nghệ sĩ`.
  3. **Thuật toán Xếp hạng Tự nhiên (Natural YouTube AI Ranking):**
     - Tận dụng thuật toán xếp hạng chuẩn xác của YouTube (kết quả #1 luôn là bản Audio/MV chính thức nhiều view và uy tín nhất).
     - Không can thiệp điểm số nhân tạo làm sai lệch thứ hạng gốc của YouTube.
  4. **Bộ lọc nhiễu 7 tiêu chí (Smart Noise Filtering):** Duyệt từ kết quả #1 trở đi và tự động loại bỏ các video không mong muốn:
     - ❌ **Shorts / Teaser:** Bỏ qua video < 30s.
     - ❌ **Full Album:** Bỏ qua video dài > 20 phút (trừ khi tìm "full album").
     - ❌ **1 Hour Loop:** Bỏ qua video lặp 1 tiếng/10 tiếng (trừ khi tìm "1 hour").
     - ❌ **Karaoke / Beat:** Bỏ qua video nhạc nền không lời (trừ khi tìm "karaoke").
     - ❌ **Reaction / Parody:** Bỏ qua video đánh giá, reaction, review.
     - ❌ **Fancam / Live Stage:** Bỏ qua video quay khán đài, concert fancam (trừ khi tìm "live").
     - ❌ **Speed Up / Slowed:** Bỏ qua video đổi tốc độ (trừ khi tìm "remix").
  5. **Hybrid Album Resolver:** Khi gửi link Album Spotify, bot tự động tìm và nạp Album Playlist chính chủ trên YouTube (~1.8s) cho toàn bộ danh sách bài hát.

### 3. Direct Audio / Server Files
- **Đầu vào:** URL trực tiếp đến file âm thanh có đuôi `.mp3`, `.flac`, `.wav`, `.ogg`, `.m4a`, `.opus` hoặc stream radio.
- **Xử lý:** Phát trực tiếp thông qua `@discordjs/voice` và FFmpeg.

### 4. Chính sách từ chối các URL khác
- Bất kỳ URL nào không thuộc các nguồn trên (ví dụ SoundCloud, Facebook, TikTok, Instagram...) sẽ bị bot từ chối an toàn kèm thông báo nhắc nhở người dùng.

---

## 🛡️ 3. Phân Quyền Kênh Phát Nhạc (`/setup channel` & `!setup channel`)

> [!IMPORTANT]
> **Chính sách an toàn mặc định:** Nhằm tránh việc người dùng spam lệnh nhạc làm loãng các kênh chat chính, **mặc định bot sẽ khóa lệnh phát nhạc ở tất cả các kênh** cho đến khi Quản trị viên chỉ định các kênh được phép.

Quản trị viên sử dụng lệnh `/setup channel` (hoặc `!setup channel`) để quản lý danh sách kênh phát nhạc:

| Lệnh Slash | Lệnh Prefix | Mô Tả |
| :--- | :--- | :--- |
| `/setup channel add channel:#music` | `!setup channel add #music` | Cấp phép cho kênh được sử dụng lệnh Bot & Phát nhạc |
| `/setup channel remove channel:#music` | `!setup channel remove #music` | Xóa quyền sử dụng lệnh nhạc tại kênh chỉ định |
| `/setup channel list` | `!setup channel list` | Hiển thị danh sách các kênh đang được cấp phép |
| `/setup channel clear` | `!setup channel clear` | Xóa toàn bộ phân quyền kênh (khóa lệnh toàn Server) |

> 💡 **Xem thêm tài liệu liên quan**:
> - Xem chi tiết phân quyền hệ thống tại [docs/PERMISSIONS_GUIDE.md](PERMISSIONS_GUIDE.md).
> - Xem cấu hình Lọc ngôn từ độc hại & Whitelist tại [docs/MODERATION_GUIDE.md](MODERATION_GUIDE.md).

*Yêu cầu quyền: Quản trị viên (Administrator / Manage Server / Manage Channels).*

---

## 🎭 4. Trạng Thái Bot Tự Động Xoay Vòng (20s Rotating Presence)

Bot tự động thay đổi trạng thái hoạt động mỗi **20 giây**:
1. 🎧 **Đang nghe**: `s!p | s!play để nghe nhạc`
2. 👀 **Đang xem**: `s!help | Hướng dẫn sử dụng`
3. 🌐 **Đang xem**: `${serverCount} máy chủ • ${totalMembers} thành viên`
4. 🎶 **Đang nghe**: `YouTube, Spotify & Audio Files 🎧`

---

## 🎶 5. Danh Sách Lệnh Điều Khiển Nhạc (`Prefix: s!`)

| Lệnh Prefix | Lệnh Viết Tắt | Slash Command | Mô Tả |
| :--- | :--- | :--- | :--- |
| `s!play <tên bài \| link>` | `s!p` | `/music play query:<...>` | Phát nhạc từ YouTube, Spotify hoặc file direct audio (.mp3, .flac) |
| `s!pause` | - | `/music pause` | Tạm dừng phát bài hát hiện tại |
| `s!resume` | `s!unpause` | `/music resume` | Tiếp tục phát nhạc đang tạm dừng |
| `s!skip` | `s!next`, `s!fs` | `/music skip` | Bỏ qua bài hát hiện tại để phát bài kế tiếp |
| `s!stop` | - | `/music stop` | Dừng phát nhạc và dọn sạch hàng đợi |
| `s!queue [trang]` | `s!q [trang]` | `/music queue [page:<...>]` | Hiển thị danh sách các bài hát trong hàng đợi (hỗ trợ phân trang: `s!q 2`, `s!q 3`) |
| `s!nowplaying` | `s!np` | `/music nowplaying` | Xem thông tin chi tiết bài hát đang phát (Nguồn, thời lượng, người yêu cầu) |
| `s!volume <1-100>` | `s!vol`, `s!v` | `/music volume level:<...>` | Điều chỉnh mức âm lượng phát nhạc (1 đến 100%) |
| `s!loop <off\|track\|queue>` | `s!repeat` | `/music loop mode:<...>` | Cài đặt chế độ lặp: Tắt (`off`), Lặp bài (`track`), Lặp hàng đợi (`queue`) |
| `s!shuffle` | - | - | Xáo trộn ngẫu nhiên thứ tự các bài trong danh sách chờ |
| `s!remove <vị trí>` | `s!rm` | - | Xóa một bài hát tại vị trí số thứ tự chỉ định khỏi hàng đợi |
| `s!clear` | - | - | Dọn sạch tất cả bài trong danh sách chờ (vẫn giữ bài đang phát) |
| `s!leave` | `s!disconnect`, `s!dc` | `/music leave` | Ngắt kết nối bot và rời khỏi kênh thoại |
| `s!help music` | `s!h music` | `/help feature:music` | Xem bảng hướng dẫn các câu lệnh nhạc |

---

## 🎛️ 6. Hệ Thống Nút Bấm Điều Khiển Trực Quan & Phân Trang Tương Tác

Player của bot được trang bị đầy đủ bộ nút bấm điều khiển trực quan (Discord ActionRow & Buttons) đính kèm dưới tin nhắn `Now Playing` và bảng danh sách `Queue`:

### 1. Nút điều khiển Trình phát nhạc (Player Controls)
- **Hàng 1 (Playback Controls):**
  - `⏯️ Tạm dừng / Tiếp tục`: Chuyển đổi linh hoạt giữa Pause và Resume bài hát.
  - `⏭️ Bỏ qua (Skip)`: Chuyển ngay sang bài hát tiếp theo trong hàng đợi.
  - `⏹️ Dừng phát (Stop)`: Dừng nhạc ngay lập tức, dọn sạch hàng đợi và vô hiệu hóa nút bấm an toàn.
  - `🔀 Trộn bài (Shuffle)`: Đảo ngẫu nhiên vị trí các bài hát trong danh sách chờ.
  - `📜 Hàng đợi (Queue)`: Mở nhanh bảng danh sách các bài hát trong hàng đợi (ẩn/ephemeral).
- **Hàng 2 (Cài đặt âm lượng & Lặp lại):**
  - `🔉 Giảm âm (-10%)`: Giảm âm lượng xuống từng nấc 10% (tối thiểu 10%).
  - `🔊 Tăng âm (+10%)`: Tăng âm lượng lên từng nấc 10% (tối đa 100%).
  - `🔂 Chế độ lặp (Loop)`: Xoay vòng qua 3 chế độ: `Tắt (off)` ➔ `Lặp bài (track)` ➔ `Lặp hàng đợi (queue)` ➔ `Tắt`.

### 2. Nút bấm Phân trang Hàng đợi Tương tác (Queue Pagination Buttons)
- Khi danh sách bài hát có từ 2 trang trở lên (`totalPages > 1`), bot tự động đính kèm hàng nút bấm:
  - `⏮️ Đầu`: Về trang đầu tiên (Trang 1).
  - `◀️ Trước`: Lùi về trang trước đó.
  - `📄 Trang X/Y`: Hiển thị số trang hiện tại / tổng số trang (nút hiển thị).
  - `▶️ Sau`: Chuyển tiếp sang trang kế tiếp.
  - `⏭️ Cuối`: Đến thẳng trang cuối cùng.
- **Tối ưu UX:** Tự động cập nhật nội dung Embed qua `interaction.update()` mà không spam thêm tin nhắn mới vào kênh chat.

---

## ⚙️ 7. Quản Lý Vòng Đời & Tự Động Rời Kênh (Voice Lifecycle)

1. **Tự động ngắt kết nối khi không hoạt động (Auto Leave / Idle Timeout):**
   - Khi phát hết toàn bộ bài hát trong hàng đợi hoặc khi bot bị dừng (`s!stop`), bot sẽ đợi trong vòng **3 phút**.
   - Nếu sau 3 phút không nhận thêm yêu cầu phát nhạc mới, bot sẽ tự động rời khỏi phòng thoại để tiết kiệm tài nguyên máy chủ.
2. **Xử lý sự cố mạng & Tự phục hồi:**
   - Tự động nhận diện khi bot bị di chuyển phòng voice hoặc bị mất kết nối tạm thời để tái kết nối.
3. **Giám sát trạng thái kênh thoại (VoiceStateUpdate Event):**
   - **Báo động khi bị ngắt kết nối đột ngột:** Nếu bot bị kick hoặc ngắt kết nối khỏi kênh thoại, bot lập tức gửi Embed thông báo đến kênh chat nhạc và dọn dẹp hàng đợi an toàn.
   - **Tự động ngắt kết nối khi phòng trống:** Khi tất cả người dùng rời phòng thoại (chỉ còn bot ở lại), bot phát cảnh báo và kích hoạt đếm ngược tự ngắt kết nối sau 3 phút.
   - **Kiểm tra kênh thoại chéo:** Nếu người dùng ở phòng voice khác cố gắng điều khiển, bot sẽ thông báo rõ ai đang sử dụng bot tại phòng nào và bài hát đang phát.
4. **Điều khiển âm lượng & Khử rè tuyệt đối:**
   - Sử dụng bộ lọc native `-filter:a volume=...` từ FFmpeg kết hợp `StreamType.OggOpus` 20ms frame, giải mã đa luồng mã C, loại bỏ hoàn toàn `opusscript` software re-encoding và triệt tiêu 100% tiếng rè khi skip bài hoặc vào bài mới.

---

## 🛠️ 8. Cài Đặt Dependencies & Triển Khai

Để hệ thống hoạt động ổn định trên cả Windows, Linux và cPanel:

```bash
# Cài đặt các gói voice, streaming và metadata
npm install @discordjs/voice spotify-url-info play-dl libsodium-wrappers ffmpeg-static yt-dlp-wrap
```

- **yt-dlp:** Tích hợp `yt-dlp-wrap`, tự động tải và cập nhật binary `yt-dlp` mới nhất, giải quyết triệt để lỗi chặn IP 403 Forbidden của YouTube.
- **FFmpeg:** Dự án đã tích hợp sẵn `ffmpeg-static`, tự động cung cấp binary FFmpeg phù hợp với từng hệ điều hành mà không cần cài đặt thêm thủ công.
- **Opus & Sodium:** Sử dụng `libsodium-wrappers` và luồng Native OggOpus đảm bảo âm thanh chất lượng studio 128kbps với 0% CPU jitter.
