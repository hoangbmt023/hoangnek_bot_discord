const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * EmbedBuilderUtility
 * Tuân thủ Single Responsibility Principle (SRP): Chuyên xây dựng các Embed Message trực quan.
 */
class EmbedBuilderUtility {
  /**
   * Bảng màu tối giản, hiện đại (1-2 tone màu chủ đạo)
   */
  static COLORS = {
    WELCOME: 0x5865f2, // Discord Blurple hiện đại, tinh tế
    LEAVE: 0x64748b,   // Slate Gray trầm ấm, lịch sự
    WARNING: 0xf59e0b, // Amber Warning (OFFENSIVE)
    DANGER: 0xef4444,  // Red Danger (HATE / Timeout / Kick / Ban)
  };

  /**
   * Tạo Embed chào mừng thành viên mới
   * @param {import('discord.js').GuildMember} member
   * @returns {EmbedBuilder}
   */
  static createWelcomeEmbed(member) {
    const { guild, user } = member;
    const memberCount = guild.memberCount;
    const userAvatar = user.displayAvatarURL({ dynamic: true, size: 256 });
    const guildIcon = guild.iconURL({ dynamic: true, size: 128 });
    const accountCreatedTimestamp = Math.floor(user.createdTimestamp / 1000);

    return new EmbedBuilder()
      .setColor(this.COLORS.WELCOME)
      .setAuthor({
        name: `${guild.name}`,
        iconURL: guildIcon || undefined,
      })
      .setTitle(`✦ CHÀO MỪNG THÀNH VIÊN MỚI`)
      .setDescription(
        `## Hân hạnh chào đón <@${user.id}>!\n` +
        `> Bạn đã là thành viên thứ **#${memberCount}** của **${guild.name}**.\n\n` +
        `**Chi tiết tài khoản:**\n` +
        `• **Người dùng:** \`${user.tag}\`\n` +
        `• **Ngày tham gia Discord:** <t:${accountCreatedTimestamp}:D> (<t:${accountCreatedTimestamp}:R>)`
      )
      .setThumbnail(userAvatar)
      .setFooter({
        text: `ID: ${user.id} • Chúc bạn có trải nghiệm tuyệt vời!`,
      })
      .setTimestamp();
  }

  /**
   * Tạo Embed thông báo thành viên rời server
   * @param {import('discord.js').GuildMember} member
   * @returns {EmbedBuilder}
   */
  static createLeaveEmbed(member) {
    const { guild, user } = member;
    const memberCount = guild.memberCount;
    const userAvatar = user.displayAvatarURL({ dynamic: true, size: 256 });
    const guildIcon = guild.iconURL({ dynamic: true, size: 128 });

    let joinedInfo = 'Không rõ';
    if (member.joinedTimestamp) {
      const joinedTimestamp = Math.floor(member.joinedTimestamp / 1000);
      joinedInfo = `<t:${joinedTimestamp}:D> (<t:${joinedTimestamp}:R>)`;
    }

    return new EmbedBuilder()
      .setColor(this.COLORS.LEAVE)
      .setAuthor({
        name: `${guild.name}`,
        iconURL: guildIcon || undefined,
      })
      .setTitle(`◈ THÀNH VIÊN RỜI SERVER`)
      .setDescription(
        `## Tạm biệt <@${user.id}>!\n` +
        `> **${user.tag}** vừa rời khỏi cộng đồng.\n\n` +
        `**Thông tin ghi nhận:**\n` +
        `• **Thời gian đã gắn bó:** ${joinedInfo}\n` +
        `• **Số lượng thành viên hiện tại:** \`${memberCount}\` người`
      )
      .setThumbnail(userAvatar)
      .setFooter({
        text: `ID: ${user.id} • Goodbye!`,
      })
      .setTimestamp();
  }

  /**
   * Tạo Embed thông báo cảnh cáo vi phạm quy tắc ngôn từ
   * @param {object} params
   * @param {import('discord.js').User} params.user
   * @param {string} params.label - 'XÚC PHẠM' | 'THÙ GHÉT' | 'OFFENSIVE' | 'HATE'
   * @param {number} params.pointsAdded - Số điểm cảnh cáo lần này
   * @param {number} params.totalWarnings - Tổng số cảnh cáo tích lũy
   * @param {string} params.actionTaken - Hành động đã thực thi ('NONE' | 'TIMEOUT' | 'KICK' | 'BAN')
   * @param {string} [params.violatedContent]
   * @returns {EmbedBuilder}
   */
  static createModerationWarningEmbed({ user, label, pointsAdded, totalWarnings, actionTaken, violatedContent }) {
    const isHate = label === 'THÙ GHÉT' || label === 'HATE';
    const color = isHate || actionTaken !== 'NONE' ? this.COLORS.DANGER : this.COLORS.WARNING;

    const displayLabel = isHate ? 'Thù ghét / Độc hại nặng' : 'Xúc phạm / Chửi thề';
    const labelTitle = isHate ? '🛑 PHÁT HIỆN NGÔN TỪ THÙ GHÉT' : '⚠️ CẢNH CÁO NGÔN TỪ XÚC PHẠM';

    let actionText = 'Tin nhắn đã bị xóa tự động khỏi kênh.';
    if (actionTaken === 'TIMEOUT') {
      actionText = 'Tin nhắn đã bị xóa & Bạn bị **Tạm khóa chat (Timeout 10 phút)** do tích lũy đủ 3 cảnh cáo.';
    } else if (actionTaken === 'KICK') {
      actionText = 'Tin nhắn đã bị xóa & Bạn đã bị **Kick khỏi Server** do tích lũy đủ 5 cảnh cáo.';
    } else if (actionTaken === 'BAN') {
      actionText = 'Tin nhắn đã bị xóa & Bạn đã bị **Cấm vĩnh viễn (Ban)** do tích lũy từ 7 cảnh cáo trở lên.';
    }

    const contentSnippet = violatedContent ? `\n• **Nội dung bị phát hiện:** ||${violatedContent}||` : '';

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(labelTitle)
      .setDescription(
        `## Cảnh báo gửi tới <@${user.id}>\n` +
        `> Hệ thống phát hiện tin nhắn của bạn có nội dung mang tính chất **${displayLabel}**, vi phạm chuẩn mực cộng đồng.\n\n` +
        `**Chi tiết vi phạm:**${contentSnippet}\n` +
        `• **Mức độ:** \`${displayLabel}\` (+${pointsAdded} điểm cảnh cáo)\n` +
        `• **Tổng điểm cảnh cáo hiện tại:** **${totalWarnings} / 7**\n` +
        `• **Biện pháp áp dụng:** ${actionText}\n\n` +
        `*(Tin nhắn cảnh báo này chỉ gửi riêng cho bạn. Vui lòng giữ gìn văn hóa trò chuyện văn minh trong Server)*`
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 128 }))
      .setFooter({
        text: `Hệ Thống Kiểm Duyệt Tự Động • ID: ${user.id}`,
      })
      .setTimestamp();

    return embed;
  }

  /**
   * Tạo Embed thông báo kết quả thao tác Whitelist
   * Thiết kế tối giản, 1-2 tone màu chủ đạo (Blurple 0x5865F2 / Danger 0xED4245), bố cục gọn gàng.
   * @param {object} params
   * @param {string} params.title
   * @param {string} params.description
   * @param {string} [params.featureName]
   * @param {boolean} [params.success=true]
   * @param {boolean} [params.isDestructive=false]
   * @returns {EmbedBuilder}
   */
  static createWhitelistResponseEmbed({ title, description, featureName, success = true, isDestructive = false }) {
    // Chỉ dùng 2 tone màu chủ đạo: Blurple (chuẩn/thành công) hoặc Red (lỗi/xóa/nguy hiểm)
    const color = (!success || isDestructive) ? 0xed4245 : 0x5865f2;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({
        name: 'HỆ THỐNG KIỂM DUYỆT • WHITELIST',
      })
      .setTitle(title)
      .setDescription(description)
      .setFooter({
        text: 'Hoangnek Bot • Quản Lý Miễn Trừ Kiểm Duyệt',
      })
      .setTimestamp();

    if (featureName) {
      embed.addFields({
        name: 'Chức năng áp dụng',
        value: `\`${featureName}\``,
        inline: true,
      });
    }

    return embed;
  }

  /**
   * Tạo Embed thông báo bật/tắt hoặc xem trạng thái tính năng của Bot
   * Thiết kế 1-2 tone màu (0x5865F2 Blurple / 0xED4245 Red), bố cục gọn gàng.
   * @param {object} params
   * @param {string} params.title
   * @param {string} params.description
   * @param {boolean} [params.enabled=true]
   * @param {boolean} [params.isStatusList=false]
   * @returns {EmbedBuilder}
   */
  static createFeatureToggleResponseEmbed({ title, description, enabled = true, isStatusList = false }) {
    const color = isStatusList || enabled ? 0x5865f2 : 0xed4245;

    return new EmbedBuilder()
      .setColor(color)
      .setAuthor({
        name: 'HỆ THỐNG CẤU HÌNH • TÍNH NĂNG BOT',
      })
      .setTitle(title)
      .setDescription(description)
      .setFooter({
        text: 'Hoangnek Bot • Cài Đặt Server',
      })
      .setTimestamp();
  }

  /**
   * Tạo Embed thông báo kết quả cài đặt Model AI
   * @param {object} params
   * @param {string} params.title
   * @param {string} params.description
   * @param {boolean} [params.success=true]
   * @param {boolean} [params.isDestructive=false]
   * @returns {EmbedBuilder}
   */
  static createAISetupResponseEmbed({ title, description, success = true, isDestructive = false }) {
    const color = !success ? 0xed4245 : isDestructive ? 0xf59e0b : 0x5865f2;

    return new EmbedBuilder()
      .setColor(color)
      .setAuthor({
        name: 'HỆ THỐNG CẤU HÌNH • AI ASSISTANT',
      })
      .setTitle(title)
      .setDescription(description)
      .setFooter({
        text: 'Hoangnek Bot • Cấu Hình Model AI',
      })
      .setTimestamp();
  }

  /**
   * Tạo Embed thông báo kết quả cấu hình dữ liệu Server cho AI (Knowledge)
   * @param {object} params
   * @param {string} params.title
   * @param {string} params.description
   * @param {boolean} [params.success=true]
   * @param {boolean} [params.isDestructive=false]
   * @returns {EmbedBuilder}
   */
  static createKnowledgeSetupResponseEmbed({ title, description, success = true, isDestructive = false }) {
    const color = !success ? 0xed4245 : isDestructive ? 0xf59e0b : 0x5865f2;

    return new EmbedBuilder()
      .setColor(color)
      .setAuthor({
        name: 'HỆ THỐNG CẤU HÌNH • DỮ LIỆU SERVER (KNOWLEDGE)',
      })
      .setTitle(title)
      .setDescription(description)
      .setFooter({
        text: 'Hoangnek Bot • Cấu Hình Dữ Liệu AI',
      })
      .setTimestamp();
  }

  /**
   * Tạo Embed hướng dẫn sử dụng (Help) theo từng tính năng hoặc tổng thể
   * @param {object} params
   * @param {string} [params.feature='all'] - 'all' | 'whitelist' | 'feature' | 'moderation' | 'notifications' | 'ai' | 'setup' | 'knowledge'
   * @returns {EmbedBuilder}
   */
  static createHelpEmbed({ feature = 'all' } = {}) {
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

  /**
   * Tạo Embed cho bài hát đang phát (Now Playing)
   * @param {object} params
   * @param {import('../music/Track')} params.track
   * @param {import('../music/GuildQueue')} params.queue
   * @returns {EmbedBuilder}
   */
  static createNowPlayingEmbed({ track, queue }) {
    const sourceBadges = {
      youtube: '🔴 YouTube',
      spotify: '🟢 Spotify (via YouTube)',
      direct: '📁 Direct Audio',
    };

    const sourceText = sourceBadges[track.source] || '🎵 Audio';
    const loopStatus = queue.loopMode === 'track' ? '🔂 Bài hiện tại' : queue.loopMode === 'queue' ? '🔁 Toàn bộ hàng đợi' : '❌ Tắt';
    const requesterTag = track.requestedBy ? (track.requestedBy.tag || track.requestedBy.username || `<@${track.requestedBy.id || track.requestedBy}>`) : 'Hệ thống';

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({
        name: '🎵 ĐANG PHÁT NHẠC',
      })
      .setTitle(track.title)
      .setDescription(
        `• **Nghệ sĩ / Kênh:** \`${track.artist}\`\n` +
        `• **Nguồn phát:** \`${sourceText}\`\n` +
        `• **Thời lượng:** \`${track.duration}\`\n` +
        `• **Âm lượng:** \`${queue.volume}%\` • **Lặp lại:** \`${loopStatus}\`\n` +
        `• **Yêu cầu bởi:** ${requesterTag}`
      )
      .setFooter({
        text: `Hàng đợi còn ${queue.tracks.length} bài • Dùng s!queue để xem danh sách`,
      })
      .setTimestamp();

    const targetUrl = track.originalUrl || track.url;
    if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
      embed.setURL(targetUrl);
    }

    if (track.thumbnail) {
      embed.setThumbnail(track.thumbnail);
    }

    return embed;
  }

  /**
   * Tạo Embed thông báo đã thêm bài hát vào hàng đợi
   * @param {object} params
   * @param {import('../music/Track')} params.track
   * @param {number} params.position
   * @returns {EmbedBuilder}
   */
  static createTrackAddedEmbed({ track, position }) {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({
        name: '✅ ĐÃ THÊM VÀO HÀNG ĐỢI',
      })
      .setTitle(track.title)
      .setDescription(
        `• **Nghệ sĩ / Kênh:** \`${track.artist}\`\n` +
        `• **Thời lượng:** \`${track.duration}\`\n` +
        `• **Vị trí trong hàng đợi:** \`#${position}\`\n` +
        `• **Nguồn:** \`${track.source.toUpperCase()}\``
      )
      .setFooter({
        text: 'Hoangnek Music Player • s!play để thêm bài khác',
      })
      .setTimestamp();

    const targetUrl = track.originalUrl || track.url;
    if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
      embed.setURL(targetUrl);
    }

    if (track.thumbnail) {
      embed.setThumbnail(track.thumbnail);
    }

    return embed;
  }

  /**
   * Tạo Embed thông báo đã thêm Playlist vào hàng đợi
   * @param {object} params
   * @param {number} params.tracksCount
   * @param {string} params.playlistName
   * @param {string} params.source
   * @param {import('discord.js').User} params.requestedBy
   * @returns {EmbedBuilder}
   */
  static createPlaylistAddedEmbed({ tracksCount, playlistName, source, requestedBy }) {
    const userTag = requestedBy ? (requestedBy.tag || requestedBy.username || `<@${requestedBy.id}>`) : 'Unknown';

    return new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({
        name: '📑 ĐÃ THÊM PLAYLIST VÀO HÀNG ĐỢI',
      })
      .setTitle(playlistName || 'Playlist')
      .setDescription(
        `• **Số lượng bài hát:** \`${tracksCount}\` bài\n` +
        `• **Nền tảng:** \`${source.toUpperCase()}\`\n` +
        `• **Người yêu cầu:** ${userTag}\n\n` +
        `*Các bài hát đã được nạp vào hàng đợi và sẽ lần lượt được phát.*`
      )
      .setFooter({
        text: 'Hoangnek Music Player • Gõ s!queue để xem danh sách',
      })
      .setTimestamp();
  }

  /**
   * Tạo Embed thông báo đang tìm kiếm bài hát / xử lý nguồn âm thanh
   * @param {object} params
   * @param {string} params.query
   * @param {import('discord.js').User} [params.user]
   * @returns {EmbedBuilder}
   */
  static createSearchingEmbed({ query, user }) {
    const userTag = user ? (user.tag || user.username || `<@${user.id}>`) : 'Người dùng';
    const displayQuery = query.length > 80 ? query.substring(0, 77) + '...' : query;

    return new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({
        name: '🔎 HỆ THỐNG ÂM NHẠC • ĐANG TÌM KIẾM...',
      })
      .setTitle('Đang Trích Xuất & Xử Lý Nguồn Nhạc')
      .setDescription(
        `> 🔍 **Yêu cầu:** \`${displayQuery}\`\n` +
        `> ⏳ **Trạng thái:** Đang kết nối máy chủ âm thanh & trích xuất dữ liệu...\n` +
        `> 👤 **Người yêu cầu:** ${userTag}`
      )
      .setFooter({
        text: 'Hoangnek Music Player • Vui lòng chờ trong giây lát',
      })
      .setTimestamp();
  }

  /**
   * Tạo Embed danh sách hàng đợi (Queue)
   * @param {object} params
   * @param {import('../music/GuildQueue')} params.queue
   * @param {number} [params.page=1]
   * @returns {EmbedBuilder}
   */
  static createQueueEmbed({ queue, page = 1 }) {
    const itemsPerPage = 10;
    const totalPages = Math.ceil(queue.tracks.length / itemsPerPage) || 1;
    const currentPage = Math.max(1, Math.min(totalPages, Number(page) || 1));

    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentTracks = queue.tracks.slice(startIndex, startIndex + itemsPerPage);

    let desc = '';

    if (queue.currentTrack) {
      desc += `**🎧 Đang phát:**\n` +
        `[${queue.currentTrack.title}](${queue.currentTrack.originalUrl || queue.currentTrack.url}) | \`${queue.currentTrack.duration}\` (Yêu cầu bởi: ${queue.currentTrack.requestedBy?.tag || queue.currentTrack.requestedBy || 'Hệ thống'})\n\n`;
    } else {
      desc += `*Hiện không có bài hát nào đang phát.*\n\n`;
    }

    desc += `**📋 Danh sách chờ (${queue.tracks.length} bài):**\n`;

    if (currentTracks.length === 0) {
      desc += `*(Hàng đợi trống. Sử dụng \`s!play <tên bài>\` để thêm bài mới)*\n`;
    } else {
      const listStr = currentTracks
        .map((t, idx) => {
          const pos = startIndex + idx + 1;
          const trackLink = t.url || t.originalUrl || 'https://youtube.com';
          return `\`${pos}.\` [${t.title}](${trackLink}) | \`${t.duration}\``;
        })
        .join('\n');
      desc += `${listStr}\n`;

      if (totalPages > 1) {
        desc += `\n💡 *Gõ \`s!queue <số_trang>\` (ví dụ: \`s!q 2\`) để lật trang.*`;
      }
    }

    const loopStatus = queue.loopMode === 'track' ? '🔂 Bài hiện tại' : queue.loopMode === 'queue' ? '🔁 Toàn bộ hàng đợi' : '❌ Tắt';

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({
        name: `HÀNG ĐỢI NHẠC • ${queue.guild.name}`,
      })
      .setTitle(`Danh Sách Hàng Đợi (Trang ${currentPage}/${totalPages})`)
      .setDescription(desc)
      .setFooter({
        text: `Âm lượng: ${queue.volume}% • Lặp lại: ${loopStatus} • Trang ${currentPage}/${totalPages} • Gõ s!q <trang>`,
      })
      .setTimestamp();

    return embed;
  }

  /**
   * Tạo Embed thông báo trạng thái hoặc kết quả lệnh phát nhạc
   * @param {object} params
   * @param {string} params.title
   * @param {string} params.description
   * @param {boolean} [params.success=true]
   * @returns {EmbedBuilder}
   */
  static createMusicStatusEmbed({ title, description, success = true }) {
    const color = success ? 0x5865f2 : 0xed4245;

    return new EmbedBuilder()
      .setColor(color)
      .setAuthor({
        name: 'HỆ THỐNG PHÁT NHẠC • HOANGNEK BOT',
      })
      .setTitle(title)
      .setDescription(description)
      .setFooter({
        text: 'Hoangnek Music Player',
      })
      .setTimestamp();
  }

  /**
   * Tạo Embed thông báo kết quả cấu hình kênh (/setup)
   * @param {object} params
   * @param {string} params.title
   * @param {string} params.description
   * @param {boolean} [params.success=true]
   * @param {boolean} [params.isDestructive=false]
   * @returns {EmbedBuilder}
   */
  static createChannelSetupResponseEmbed({ title, description, success = true, isDestructive = false }) {
    const color = !success || isDestructive ? 0xed4245 : 0x5865f2;

    return new EmbedBuilder()
      .setColor(color)
      .setAuthor({
        name: 'HỆ THỐNG CẤU HÌNH KÊNH • SETUP',
      })
      .setTitle(title)
      .setDescription(description)
      .setFooter({
        text: 'Hoangnek Bot • Cấu hình phân quyền kênh',
      })
      .setTimestamp();
  }

  /**
   * Tạo Embed thông báo kết quả cấu hình kênh thông báo (/setup notify)
   * @param {object} params
   * @param {string} params.title
   * @param {string} params.description
   * @param {boolean} [params.success=true]
   * @param {boolean} [params.isDestructive=false]
   * @returns {EmbedBuilder}
   */
  static createNotificationSetupResponseEmbed({ title, description, success = true, isDestructive = false }) {
    const color = !success || isDestructive ? 0xed4245 : 0x5865f2;

    return new EmbedBuilder()
      .setColor(color)
      .setAuthor({
        name: 'HỆ THỐNG CẤU HÌNH THÔNG BÁO • SETUP NOTIFY',
      })
      .setTitle(title)
      .setDescription(description)
      .setFooter({
        text: 'Hoangnek Bot • Thông báo Chào mừng & Tạm biệt',
      })
      .setTimestamp();
  }

  /**
   * Tạo các hàng nút bấm điều khiển phát nhạc (ActionRowBuilder)
   * @param {object} params
   * @param {import('../music/GuildQueue')} params.queue
   * @param {boolean} [params.disabled=false]
   * @returns {ActionRowBuilder[]}
   */
  static createMusicControlRows({ queue, disabled = false }) {
    const isPaused = queue ? queue.isPaused() : false;
    const loopMode = queue ? queue.loopMode : 'off';
    const volume = queue ? queue.volume : 80;
    const tracksCount = queue && Array.isArray(queue.tracks) ? queue.tracks.length : 0;

    // Hàng 1: [⏯️ Pause/Resume] [⏭️ Skip] [⏹️ Stop] [🔀 Shuffle] [📜 Queue]
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('music_pause_resume')
        .setLabel(isPaused ? 'Tiếp tục' : 'Tạm dừng')
        .setEmoji(isPaused ? '▶️' : '⏸️')
        .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('music_skip')
        .setLabel('Bỏ qua')
        .setEmoji('⏭️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('music_stop')
        .setLabel('Dừng phát')
        .setEmoji('⏹️')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('music_shuffle')
        .setLabel('Trộn bài')
        .setEmoji('🔀')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || tracksCount === 0),
      new ButtonBuilder()
        .setCustomId('music_queue')
        .setLabel('Hàng đợi')
        .setEmoji('📜')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled)
    );

    // Hàng 2: [🔉 Giảm âm] [🔊 Tăng âm] [🔂/🔁 Lặp lại]
    const loopLabel = loopMode === 'track' ? 'Lặp: Bài' : loopMode === 'queue' ? 'Lặp: Hàng đợi' : 'Lặp: Tắt';
    const loopEmoji = loopMode === 'track' ? '🔂' : '🔁';
    const loopStyle = loopMode === 'track' ? ButtonStyle.Success : loopMode === 'queue' ? ButtonStyle.Primary : ButtonStyle.Secondary;

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('music_vol_down')
        .setLabel('Giảm âm (-10%)')
        .setEmoji('🔉')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || volume <= 10),
      new ButtonBuilder()
        .setCustomId('music_vol_up')
        .setLabel('Tăng âm (+10%)')
        .setEmoji('🔊')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || volume >= 100),
      new ButtonBuilder()
        .setCustomId('music_loop')
        .setLabel(loopLabel)
        .setEmoji(loopEmoji)
        .setStyle(loopStyle)
        .setDisabled(disabled)
    );

    return [row1, row2];
  }

  /**
   * Tạo ActionRow nút bấm phân trang cho Hàng đợi nhạc (Queue)
   * @param {object} params
   * @param {number} params.currentPage
   * @param {number} params.totalPages
   * @param {boolean} [params.disabled=false]
   * @returns {ActionRowBuilder}
   */
  static createQueuePaginationRow({ currentPage, totalPages, disabled = false }) {
    const isFirst = currentPage <= 1;
    const isLast = currentPage >= totalPages;

    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('queue_page_first')
        .setLabel('Đầu')
        .setEmoji('⏮️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || isFirst),
      new ButtonBuilder()
        .setCustomId(`queue_page_prev_${currentPage - 1}`)
        .setLabel('Trước')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled || isFirst),
      new ButtonBuilder()
        .setCustomId(`queue_page_curr_${currentPage}`)
        .setLabel(`Trang ${currentPage}/${totalPages}`)
        .setEmoji('📄')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`queue_page_next_${currentPage + 1}`)
        .setLabel('Sau')
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled || isLast),
      new ButtonBuilder()
        .setCustomId(`queue_page_last_${totalPages}`)
        .setLabel('Cuối')
        .setEmoji('⏭️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || isLast)
    );
  }

  /**
   * Tạo ActionRow nút bấm phân trang cho Whitelist List
   * @param {object} params
   * @param {number} params.currentPage
   * @param {number} params.totalPages
   * @param {string} [params.targetType='all']
   * @param {boolean} [params.disabled=false]
   * @returns {ActionRowBuilder}
   */
  static createWhitelistPaginationRow({ currentPage, totalPages, targetType = 'all', disabled = false }) {
    const isFirst = currentPage <= 1;
    const isLast = currentPage >= totalPages;

    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`wl_page_first_${targetType}`)
        .setLabel('Đầu')
        .setEmoji('⏮️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || isFirst),
      new ButtonBuilder()
        .setCustomId(`wl_page_prev_${targetType}_${currentPage - 1}`)
        .setLabel('Trước')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled || isFirst),
      new ButtonBuilder()
        .setCustomId(`wl_page_curr_${currentPage}`)
        .setLabel(`Trang ${currentPage}/${totalPages}`)
        .setEmoji('📄')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`wl_page_next_${targetType}_${currentPage + 1}`)
        .setLabel('Sau')
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled || isLast),
      new ButtonBuilder()
        .setCustomId(`wl_page_last_${targetType}_${totalPages}`)
        .setLabel('Cuối')
        .setEmoji('⏭️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || isLast)
    );
  }

  /**
   * Tạo Embed giao diện trạng thái Đang suy nghĩ cho AI Assistant
   * @param {object} params
   * @param {string} params.question - Câu hỏi của người dùng
   * @param {import('discord.js').User} [params.user] - Người đặt câu hỏi
   * @param {import('discord.js').Guild} [params.guild] - Server Discord
   * @returns {EmbedBuilder}
   */
  static createAIThinkingEmbed({ question, user, guild } = {}) {
    const userAvatar = user?.displayAvatarURL({ dynamic: true, size: 128 });
    const shortQuestion = question && question.length > 250 ? question.slice(0, 247) + '...' : question || 'Đang đặt câu hỏi...';

    return new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({
        name: 'TRỢ LÝ AI • ĐANG SUY NGHĨ...',
        iconURL: userAvatar || undefined,
      })
      .setTitle('✦ ĐANG XỬ LÝ CÂU HỎI')
      .setDescription(
        `### 💬 Câu hỏi:\n> *${shortQuestion}*\n\n` +
        `⏳ *AI đang phân tích câu hỏi, tổng hợp dữ liệu máy chủ và chuẩn bị câu trả lời... Vui lòng đợi trong giây lát.*`
      )
      .setFooter({
        text: `Yêu cầu bởi ${user?.tag || 'Thành viên'} • Hoangnek AI Assistant`,
      })
      .setTimestamp();
  }

  /**
   * Tạo Embed khung chat trả lời câu hỏi cho AI Assistant (Khung xanh Blurple chuẩn Discord tối giản)
   * @param {object} params
   * @param {string} params.answer - Câu trả lời từ AI
   * @param {string} [params.model='none'] - Tên Model AI
   * @param {number} [params.responseTime=0] - Thời gian phản hồi (ms)
   * @param {import('discord.js').User|object} [params.user] - Người đặt câu hỏi
   * @returns {EmbedBuilder}
   */
  static createAIAnswerEmbed({ answer, model = 'none', responseTime = 0, user } = {}) {
    const latencySec = responseTime ? (responseTime / 1000).toFixed(2) : '0.00';
    const userName = user?.username || user?.tag || (typeof user === 'string' ? user : 'Người dùng');
    const modelName = model || 'none';

    // Discord Embed Description giới hạn 4096 ký tự
    const maxLen = 4000;
    const isTruncated = answer && answer.length > maxLen;
    const displayAnswer = isTruncated
      ? answer.slice(0, maxLen) + '\n\n*(Nội dung còn tiếp bên dưới...)*'
      : answer || 'Không có câu trả lời.';

    // Tự động chuyển màu khung sang Đỏ (0xED4245) nếu phản hồi là lỗi / gián đoạn / model: none
    const isError =
      modelName === 'none' ||
      (typeof answer === 'string' && (answer.startsWith('❌') || answer.startsWith('⚠️') || answer.includes('gián đoạn')));
    const embedColor = isError ? 0xed4245 : 0x5865f2;

    return new EmbedBuilder()
      .setColor(embedColor)
      .setDescription(displayAnswer)
      .setFooter({
        text: `Model: ${modelName} • Phản hồi: ${latencySec}s • Hỏi bởi ${userName}`,
      })
      .setTimestamp();
  }

  /**
   * Tạo Embed thông báo lỗi xử lý câu hỏi AI (Khung đỏ cảnh báo)
   * @param {object} params
   * @param {string} [params.errorMessage]
   * @param {import('discord.js').User|object} [params.user]
   * @returns {EmbedBuilder}
   */
  static createAIErrorEmbed({ errorMessage, user } = {}) {
    const userName = user?.username || user?.tag || (typeof user === 'string' ? user : 'Người dùng');

    return new EmbedBuilder()
      .setColor(0xed4245) // Đỏ cảnh báo lỗi
      .setDescription(
        `❌ **Hiện tại dịch vụ AI đang tạm thời gián đoạn. Vui lòng thử lại sau giây lát!**` +
        (errorMessage ? `\n\n> *${errorMessage}*` : '')
      )
      .setFooter({
        text: `Model: none • Phản hồi: 0.00s • Hỏi bởi ${userName}`,
      })
      .setTimestamp();
  }
}

module.exports = EmbedBuilderUtility;

