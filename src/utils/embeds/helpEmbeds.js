const { EmbedBuilder } = require('discord.js');

/**
 * Tạo Embed hướng dẫn sử dụng (Help) theo từng tính năng hoặc tổng thể
 * @param {object} params
 * @param {string} [params.feature='all'] - 'all' | 'whitelist' | 'feature' | 'moderation' | 'notifications' | 'ai' | 'setup' | 'knowledge' | 'music'
 * @returns {EmbedBuilder}
 */
function createHelpEmbed({ feature = 'all' } = {}) {
  const norm = (feature || 'all').toLowerCase();

  let title = 'BẢNG HƯỚNG DẪN SỬ DỤNG';
  let desc = '';

  if (norm === 'whitelist' || norm === 'wl') {
    title = 'HƯỚNG DẪN • QUẢN LÝ WHITELIST';
    desc =
      `## Danh Sách Miễn Trừ Kiểm Duyệt (Whitelist)\n` +
      `> Miễn trừ kiểm duyệt ngôn từ độc hại cho **Người dùng**, **Vai trò (Role)** và **Kênh chat**.\n\n` +
      `**1. Thêm đối tượng vào Whitelist:**\n` +
      `• \`/setup whitelist add target:users value:@user1, @user2\`\n` +
      `• \`/setup whitelist add target:roles value:@Admin, @VIP\`\n` +
      `• \`/setup whitelist add target:channels value:#general, #bot-commands\`\n` +
      `• \`!setup whitelist add user @user1\` | \`!setup whitelist add role @VIP\`\n\n` +
      `**2. Xóa đối tượng khỏi Whitelist:**\n` +
      `• \`/setup whitelist remove target:users value:@user1\`\n` +
      `• \`/setup whitelist remove target:roles value:@VIP\`\n` +
      `• \`!setup whitelist remove user @user1\` | \`!setup whitelist remove channel #general\`\n\n` +
      `**3. Xem danh sách Whitelist:**\n` +
      `• \`/setup whitelist list\` *(Xem tất cả)* | \`/setup whitelist list target:roles\` *(Xem Role)*\n` +
      `• \`!setup whitelist list\` | \`!setup whitelist list role\` | \`!setup whitelist list channel\`\n\n` +
      `**4. Dọn dẹp danh sách:**\n` +
      `• \`/setup whitelist clear\` *(Xóa toàn bộ)* | \`/setup whitelist clear target:roles\`\n` +
      `• \`!setup whitelist clear\` | \`!setup whitelist clear role\`\n\n` +
      `*Để xem tất cả các nhóm lệnh cấu hình khác, sử dụng \`!help setup\` hoặc \`/help feature:setup\`.*`;
  } else if (norm === 'feature' || norm === 'toggle') {
    title = 'HƯỚNG DẪN • BẬT/TẮT TÍNH NĂNG BOT';
    desc =
      `## Quản Lý Bật/Tắt Tính Năng Server\n` +
      `> Quản trị viên có thể bật/tắt độc lập 5 module: \`moderation\`, \`welcome\`, \`leave\`, \`ai\`, \`music\` (hoặc \`all\`).\n\n` +
      `**1. Bật tính năng:**\n` +
      `• \`/setup feature enable feature:<tên_tính_năng>\`\n` +
      `• \`!setup feature enable <moderation | welcome | leave | ai | music | all>\`\n\n` +
      `**2. Tắt tính năng:**\n` +
      `• \`/setup feature disable feature:<tên_tính_năng>\`\n` +
      `• \`!setup feature disable <moderation | welcome | leave | ai | music | all>\`\n\n` +
      `**3. Tra cứu trạng thái & Đảo trạng thái (Toggle):**\n` +
      `• \`/setup feature status [feature:<tên_tính_năng>]\`\n` +
      `• \`!setup feature status [tên_tính_năng]\`\n` +
      `• \`!setup feature toggle <tên_tính_năng>\`\n\n` +
      `*Để xem tất cả các nhóm lệnh cấu hình khác, sử dụng \`!help setup\` hoặc \`/help feature:setup\`.*`;
  } else if (norm === 'moderation' || norm === 'toxic' || norm === 'hate') {
    title = 'HƯỚNG DẪN • HỆ THỐNG LỌC NGÔN TỪ TỰ ĐỘNG';
    desc =
      `## Cơ Chế Bảo Vệ Máy Chủ 24/7 (Zero-Command)\n` +
      `> Hệ thống hoạt động tự động theo thời gian thực — Thành viên không cần gõ bất kỳ câu lệnh nào.\n\n` +
      `**1. Ba Cấp Độ Đánh Giá Tin Nhắn:**\n` +
      `• 🟢 \`TRONG SẠCH\`: Tin nhắn giao tiếp văn minh, an toàn.\n` +
      `• 🟡 \`XÚC PHẠM\`: Chửi thề, lăng mạ thông thường *(+1 điểm cảnh cáo & Tự động xóa tin vi phạm)*.\n` +
      `• 🔴 \`THÙ GHÉT\`: Phân biệt chủng tộc, kỳ thị vùng miền, đe dọa bạo lực *(+2 điểm cảnh cáo & Tự động xóa tin vi phạm)*.\n\n` +
      `**2. Khung Xử Phạt Lũy Tiến Tự Động:**\n` +
      `• 📩 **1 - 2 cảnh cáo:** Xóa tin nhắn + Gửi thông báo nhắc nhở riêng qua tin nhắn trực tiếp (DM).\n` +
      `• ⏳ **3 - 4 cảnh cáo:** Tạm khóa chat (Timeout 10 phút).\n` +
      `• 👢 **5 - 6 cảnh cáo:** Trục xuất khỏi Server (Kick).\n` +
      `• ⛔ **7+ cảnh cáo:** Cấm vĩnh viễn khỏi Server (Ban).\n\n` +
      `*💡 Dành cho Admin: Để thêm người/role/kênh miễn trừ kiểm duyệt, xem \`!help setup\`.*`;
  } else if (norm === 'notifications' || norm === 'welcome' || norm === 'leave' || norm === 'notify') {
    title = 'HƯỚNG DẪN • THÔNG BÁO THÀNH VIÊN VÀO/RA';
    desc =
      `## Thẻ Chào Mừng & Tạm Biệt Tự Động\n` +
      `> Tự động phát hiện và gửi thẻ Embed sinh động khi có thành viên tham gia hoặc rời khỏi Server.\n\n` +
      `**1. Chức Năng Chào Mừng (Welcome Cards):**\n` +
      `• Tự động gửi khi có người mới vào Server.\n` +
      `• Hiển thị Avatar, tên tài khoản, ngày tạo tài khoản và thứ tự thành viên trong Server.\n\n` +
      `**2. Chức Năng Tạm Biệt (Leave Cards):**\n` +
      `• Tự động gửi khi có thành viên rời Server hoặc bị kick/ban.\n` +
      `• Hiển thị thông tin thành viên và tổng số lượng thành viên còn lại.\n\n` +
      `**3. Cơ Chế Kênh Gửi:**\n` +
      `• Mặc định tự động gửi vào **Kênh hệ thống (System Channel)** của Discord.\n` +
      `• Quản trị viên có thể tùy biến kênh riêng cho Welcome và Leave.\n\n` +
      `*💡 Dành cho Admin: Để đổi kênh thông báo hoặc bật/tắt module, xem \`!help setup\`.*`;
  } else if (norm === 'music' || norm === 'nhac') {
    title = 'HƯỚNG DẪN • HỆ THỐNG PHÁT NHẠC (MUSIC)';
    desc =
      `## Trình Phát Nhạc Trực Tuyến Chất Lượng Cao\n` +
      `> Hỗ trợ phát nhạc từ YouTube, Spotify (Track/Album/Playlist) và file âm thanh trực tiếp.\n\n` +
      `**Danh Sách Lệnh Người Dùng (Tiền tố duy nhất \`s!\` & Slash \`/music\`):**\n` +
      `• \`s!play <tên bài | link>\` | \`/music play query:<...>\`: Tìm kiếm và phát bài hát\n` +
      `• \`s!pause\` | \`/music pause\`: Tạm dừng phát nhạc\n` +
      `• \`s!resume\` | \`/music resume\`: Tiếp tục phát nhạc\n` +
      `• \`s!skip\` | \`/music skip\`: Bỏ qua bài hát hiện tại\n` +
      `• \`s!stop\` | \`/music stop\`: Dừng phát và dọn sạch hàng đợi\n` +
      `• \`s!queue [trang]\` | \`/music queue [page:1]\`: Xem danh sách hàng đợi (có phân trang)\n` +
      `• \`s!np\` | \`/music np\`: Xem thông tin bài hát đang phát chi tiết\n` +
      `• \`s!vol <1-100>\` | \`/music volume amount:<1-100>\`: Điều chỉnh âm lượng\n` +
      `• \`s!loop <off | track | queue>\` | \`/music loop mode:<...>\`: Chế độ lặp bài / lặp hàng đợi\n` +
      `• \`s!shuffle\` | \`/music shuffle\`: Trộn ngẫu nhiên bài hát trong hàng đợi\n` +
      `• \`s!remove <vị trí>\` | \`/music remove position:<...>\`: Xóa 1 bài khỏi hàng đợi\n` +
      `• \`s!clear\` | \`/music clear\`: Xóa toàn bộ danh sách chờ\n` +
      `• \`s!leave\` | \`/music leave\`: Ngắt kết nối và rời kênh thoại\n\n` +
      `*💡 Dành cho Admin: Để phân quyền kênh văn bản được phép phát nhạc, xem \`!help setup\`.*`;
  } else if (norm === 'ai' || norm === 'ask' || norm === 'assistant') {
    title = 'HƯỚNG DẪN • TRỢ LÝ AI ASSISTANT';
    desc =
      `## Trợ Lý AI Đa Năng Tích Hợp Tri Thức Server\n` +
      `> Hỗ trợ giải đáp thắc mắc, hỏi đáp kiến thức chung và tra cứu thông tin nội bộ Server qua RAG & Web Search.\n\n` +
      `**1. Lệnh Hỏi Đáp Người Dùng:**\n` +
      `• \`!ask <câu hỏi>\` *(Gõ trực tiếp trên kênh chat)*\n` +
      `• \`/ask question:<câu hỏi>\` *(Sử dụng Slash Command)*\n\n` +
      `**2. Các Khả Năng Nổi Bật Của AI:**\n` +
      `• 📚 **Hỏi đáp kiến thức tổng quát:** Lập trình, khoa học, dịch thuật, tóm tắt nội dung...\n` +
      `• 🏠 **Tra cứu nội bộ Server:** Hỏi về nội quy, danh sách kênh, vai trò, hướng dẫn sử dụng bot...\n` +
      `• 🌐 **Tìm kiếm Internet thời gian thực:** Tự động tra cứu dữ liệu mới nhất khi cần thiết.\n\n` +
      `**3. Một Số Câu Hỏi Mẫu:**\n` +
      `• \`!ask Node.js là gì?\`\n` +
      `• \`!ask Nội quy server là gì?\`\n` +
      `• \`!ask Server có những kênh và role nào?\`\n` +
      `• \`!ask Làm thế nào để mở nhạc?\`\n\n` +
      `*Lưu ý: Giới hạn tần suất 1 câu hỏi / 5 giây đối với mỗi người dùng.*\n` +
      `*💡 Dành cho Admin: Để đổi Model AI hoặc nạp dữ liệu Server, xem \`!help setup\`.*`;
  } else if (norm === 'knowledge' || norm === 'data' || norm === 'doc' || norm === 'trithuc') {
    title = 'HƯỚNG DẪN • CẤU HÌNH TRI THỨC SERVER CHO AI (RAG)';
    desc =
      `## Nạp Dữ Liệu Nội Bộ Cho AI Assistant\n` +
      `> Cho phép Bot học và ghi nhớ các quy tắc, nội quy, phân cấp vai trò và tài liệu của Server từ 3 nguồn khác nhau để ưu tiên trả lời chính xác cho thành viên (0ms RAM Cache).\n\n` +
      `**1. Nạp Kênh Tri Thức (Tự động đọc tin nhắn ghim):**\n` +
      `• \`/setup knowledge add-channel channel:#kênh\` | \`!setup knowledge add-channel #kênh\`\n` +
      `• \`/setup knowledge remove-channel channel:#kênh\` | \`!setup knowledge remove-channel #kênh\`\n\n` +
      `**2. Nạp Tin Nhắn Cụ Thể (Specific Message ID):**\n` +
      `• \`/setup knowledge add-message message_id:<id_tin_nhắn>\` | \`!setup knowledge add-message <id>\`\n` +
      `• \`/setup knowledge remove-message message_id:<id_tin_nhắn>\` | \`!setup knowledge remove-message <id>\`\n\n` +
      `**3. Nạp Văn Bản Tùy Chỉnh (Custom Notes / FAQ):**\n` +
      `• \`/setup knowledge add-text content:<nội_dung>\` | \`!setup knowledge add-text <nội_dung>\`\n` +
      `• \`/setup knowledge remove-text index:<số_thứ_tự>\` | \`!setup knowledge remove-text <stt>\`\n\n` +
      `**4. Tra Cứu & Đặt Lại Tri Thức:**\n` +
      `• \`/setup knowledge status\` | \`!setup knowledge status\` *(Xem tổng kết tri thức đã nạp)*\n` +
      `• \`/setup knowledge reset\` | \`!setup knowledge reset\` *(Xóa toàn bộ tri thức tùy chỉnh)*\n\n` +
      `*💡 Cơ chế phân luồng: Khi hỏi \`!ask\`, Bot ưu tiên tra cứu tri thức Server trước. Nếu không khớp sẽ tự động tìm kiếm Web qua Tavily.*`;
  } else if (norm === 'setup' || norm === 'channel') {
    title = 'TRUNG TÂM CẤU HÌNH HỆ THỐNG (/setup & !setup)';
    desc =
      `## Toàn Bộ Danh Sách Lệnh Quản Trị Hệ Thống\n` +
      `> Chỉ dành cho thành viên có quyền **Administrator** hoặc **Manage Server**.\n\n` +
      `### 1. 📢 Phân Quyền Kênh Lệnh (channel):\n` +
      `• \`/setup channel add channel:#kênh\` | \`!setup channel add #kênh\` *(Cấp quyền kênh)*\n` +
      `• \`/setup channel remove channel:#kênh\` | \`!setup channel remove #kênh\` *(Thu hồi quyền)*\n` +
      `• \`/setup channel list\` | \`!setup channel list\` *(Xem danh sách kênh được cấp)*\n` +
      `• \`/setup channel clear\` | \`!setup channel clear\` *(Xóa toàn bộ phân quyền kênh)*\n\n` +
      `### 2. 🔔 Cấu Hình Kênh Thông Báo Vào/Ra (notify):\n` +
      `• \`/setup notify set type:welcome channel:#chào-mừng\` | \`!setup notify welcome #kênh\`\n` +
      `• \`/setup notify set type:leave channel:#tạm-biệt\` | \`!setup notify leave #kênh\`\n` +
      `• \`/setup notify set type:all channel:#thông-báo\` | \`!setup notify all #kênh\`\n` +
      `• \`/setup notify reset type:all\` | \`!setup notify reset [welcome|leave|all]\` *(Về kênh mặc định)*\n` +
      `• \`/setup notify status\` | \`!setup notify status\` *(Xem kênh thông báo hiện tại)*\n\n` +
      `### 3. 🎛️ Bật / Tắt Tính Năng Bot (feature):\n` +
      `• \`/setup feature enable feature:<tên>\` | \`!setup feature enable <moderation|welcome|leave|ai|music|all>\`\n` +
      `• \`/setup feature disable feature:<tên>\` | \`!setup feature disable <tên>\`\n` +
      `• \`/setup feature status [feature:<tên>]\` | \`!setup feature status [tên]\`\n` +
      `• \`!setup feature toggle <tên>\` *(Đảo trạng thái BẬT ⇋ TẮT)*\n\n` +
      `### 4. 🛡️ Quản Lý Danh Sách Trắng (whitelist):\n` +
      `• \`/setup whitelist add target:<users|roles|channels> value:<tags/IDs>\` | \`!setup whitelist add <user|role|channel> <tags/IDs>\`\n` +
      `• \`/setup whitelist remove target:... value:...\` | \`!setup whitelist remove <user|role|channel> <tags/IDs>\`\n` +
      `• \`/setup whitelist list [target:...]\` | \`!setup whitelist list [user|role|channel]\`\n` +
      `• \`/setup whitelist clear [target:...]\` | \`!setup whitelist clear [user|role|channel]\`\n\n` +
      `### 5. 🤖 Cấu Hình Model AI (ai):\n` +
      `• \`/setup ai set-model provider:<gemini|openrouter> model:<tên_model>\` | \`!setup ai set <gemini|openrouter> <model>\`\n` +
      `• \`/setup ai set-primary provider:<gemini|openrouter>\` | \`!setup ai primary <gemini|openrouter>\`\n` +
      `• \`/setup ai reset-model provider:<gemini|openrouter|all>\` | \`!setup ai reset [gemini|openrouter|all]\`\n` +
      `• \`/setup ai status\` | \`!setup ai status\` *(Xem nhà cung cấp & Model đang dùng)*\n\n` +
      `### 6. 🧠 Cấu Hình Tri Thức Server Cho AI RAG (knowledge):\n` +
      `• \`/setup knowledge add-channel channel:#kênh\` | \`!setup knowledge add-channel #kênh\` *(Đọc tin nhắn ghim)*\n` +
      `• \`/setup knowledge remove-channel channel:#kênh\` | \`!setup knowledge remove-channel #kênh\`\n` +
      `• \`/setup knowledge add-message message_id:<id>\` | \`!setup knowledge add-message <id>\` *(Nạp tin nhắn cụ thể)*\n` +
      `• \`/setup knowledge remove-message message_id:<id>\` | \`!setup knowledge remove-message <id>\`\n` +
      `• \`/setup knowledge add-text content:<nội_dung>\` | \`!setup knowledge add-text <nội_dung>\` *(Nạp ghi chú)*\n` +
      `• \`/setup knowledge remove-text index:<stt>\` | \`!setup knowledge remove-text <stt>\`\n` +
      `• \`/setup knowledge reset\` | \`!setup knowledge reset\` *(Xóa toàn bộ tri thức tùy chỉnh)*\n` +
      `• \`/setup knowledge status\` | \`!setup knowledge status\` *(Xem tổng kết tri thức đã nạp)*`;
  } else {
    // 'all' / Tổng quan
    title = 'TỔNG QUAN HƯỚNG DẪN SỬ DỤNG BOT';
    desc =
      `## Hệ Thống Tính Năng Đa Dụng\n` +
      `> Gõ \`!help <tính_năng>\` hoặc \`/help feature:<tính_năng>\` để xem hướng dẫn chi tiết từng mục.\n\n` +
      `**1. 🤖 Trợ Lý AI Assistant (\`!help ai\`):**\n` +
      `• Lệnh: \`!ask <câu hỏi>\` hoặc \`/ask question:<câu hỏi>\`\n` +
      `• Trả lời kiến thức, giải đáp thắc mắc, hỏi đáp thông tin nội bộ server và tra cứu Internet.\n\n` +
      `**2. 🎵 Hệ Thống Phát Nhạc (\`s!help\` hoặc \`!help music\`):**\n` +
      `• Lệnh: \`s!play\`, \`s!pause\`, \`s!resume\`, \`s!skip\`, \`s!stop\`, \`s!queue\`, \`s!np\`, \`s!vol\`, \`s!loop\`, \`s!leave\`\n` +
      `• Phát nhạc chất lượng cao từ YouTube & Spotify.\n\n` +
      `**3. 🧠 Cấu Hình Tri Thức Server Cho AI (\`!help knowledge\`):**\n` +
      `• Nạp tin nhắn ghim, tin nhắn chỉ định, văn bản nội bộ để AI trả lời tức thì (0ms).\n\n` +
      `**4. 🛡️ Kiểm Duyệt Ngôn Từ Tự Động (\`!help moderation\`):**\n` +
      `• Tự động quét và xử phạt lũy tiến (Cảnh báo ➔ Timeout ➔ Kick ➔ Ban) 24/7 mà không cần gõ lệnh.\n\n` +
      `**5. 🌟 Thông Báo Thành Viên Vào/Ra (\`!help notifications\`):**\n` +
      `• Tự động gửi thẻ Welcome & Leave Embed sinh động khi có thành viên mới hoặc thành viên rời đi.\n\n` +
      `**6. ⚙️ Trung Tâm Cấu Hình Admin (\`!help setup\`):**\n` +
      `• Cấu hình toàn bộ: Kênh lệnh, Kênh thông báo, Bật/Tắt module, Whitelist, AI Model & Tri thức server.`;
  }

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({
      name: 'HỆ THỐNG TRỢ GIÚP • HOANGNEK BOT',
    })
    .setTitle(title)
    .setDescription(desc)
    .setFooter({
      text: 'Hoangnek Bot • Gõ /help <chức năng> để xem chi tiết',
    })
    .setTimestamp();
}

module.exports = {
  createHelpEmbed,
};
