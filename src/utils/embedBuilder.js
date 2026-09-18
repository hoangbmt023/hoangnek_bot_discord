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
   * Tạo Embed hướng dẫn sử dụng (Help) theo từng tính năng hoặc tổng thể
   * @param {object} params
   * @param {string} [params.feature='all'] - 'all' | 'whitelist' | 'feature' | 'moderation' | 'notifications'
   * @returns {EmbedBuilder}
   */
  static createHelpEmbed({ feature = 'all' } = {}) {
    const norm = (feature || 'all').toLowerCase();

    let title = 'BẢNG HƯỚNG DẪN SỬ DỤNG';
    let desc = '';

    if (norm === 'whitelist' || norm === 'wl') {
      title = 'HƯỚNG DẪN • QUẢN LÝ WHITELIST';
      desc =
        `## Quản Lý Danh Sách Trắng Qua /setup whitelist\n` +
        `> Miễn trừ kiểm duyệt tin nhắn độc hại cho **Người dùng**, **Vai trò (Role)** và **Kênh chat**.\n\n` +
        `**1. Thêm đối tượng vào Whitelist:**\n` +
        `• \`/setup whitelist add target:users value:@user1, @user2\`\n` +
        `• \`/setup whitelist add target:roles value:@Admin, @VIP\`\n` +
        `• \`/setup whitelist add target:channels value:#general, #bot-commands\`\n` +
        `• \`s!setup whitelist add role @VIP\` hoặc \`!wl add role @VIP\`\n\n` +
        `**2. Xóa đối tượng khỏi Whitelist:**\n` +
        `• \`/setup whitelist remove target:users value:@user1\`\n` +
        `• \`/setup whitelist remove target:roles value:@VIP\`\n` +
        `• \`!wl remove role @VIP\`\n\n` +
        `**3. Xem danh sách Whitelist:**\n` +
        `• \`/setup whitelist list\` *(Xem tất cả đối tượng)*\n` +
        `• \`/setup whitelist list target:roles\` *(Xem riêng danh sách Role)*\n` +
        `• \`!wl list\`\n\n` +
        `**4. Dọn dẹp danh sách:**\n` +
        `• \`/setup whitelist clear\` *(Xóa toàn bộ)*\n` +
        `• \`/setup whitelist clear target:roles\` *(Xóa toàn bộ Role)*\n\n` +
        `*Yêu cầu quyền: Quản trị viên (Administrator / Manage Server).*`;
    } else if (norm === 'feature' || norm === 'toggle') {
      title = 'HƯỚNG DẪN • BẬT/TẮT TÍNH NĂNG BOT';
      desc =
        `## Quản Lý Bật/Tắt Tính Năng Qua /setup feature\n` +
        `> Quản lý bật hoặc tắt linh hoạt từng module hoạt động của Bot trong Server.\n\n` +
        `**1. Bật tính năng:**\n` +
        `• \`/setup feature enable feature:moderation\`\n` +
        `• \`s!setup feature enable moderation\`\n\n` +
        `**2. Tắt tính năng:**\n` +
        `• \`/setup feature disable feature:welcome\`\n` +
        `• \`s!setup feature disable welcome\`\n\n` +
        `**3. Xem trạng thái tính năng:**\n` +
        `• \`/setup feature status feature:moderation\` (hoặc để trống xem tất cả)\n` +
        `• \`s!setup feature status moderation\`\n\n` +
        `*Yêu cầu quyền: Quản trị viên (Administrator / Manage Server).*`;
    } else if (norm === 'moderation' || norm === 'toxic' || norm === 'hate') {
      title = 'HƯỚNG DẪN • HỆ THỐNG LỌC NGÔN TỪ';
      desc =
        `## Cơ Chế Kiểm Duyệt Tự Động\n` +
        `> Sử dụng AI Model nhận diện và xử lý ngôn từ độc hại theo thời gian thực.\n\n` +
        `**Phân loại mức độ vi phạm:**\n` +
        `• \`TRONG SẠCH\`: Tin nhắn an toàn, chuẩn mực văn minh.\n` +
        `• \`XÚC PHẠM\`: Chửi bậy, lăng mạ thông thường (+1 điểm cảnh cáo, xóa tin nhắn).\n` +
        `• \`THÙ GHÉT\`: Kỳ thị chủng tộc, tôn giáo, vùng miền, đe dọa bạo lực (+2 điểm cảnh cáo, xóa tin nhắn).\n\n` +
        `**Hệ thống hình phạt lũy tiến:**\n` +
        `• **1 - 2 cảnh cáo:** Xóa tin nhắn vi phạm & Gửi cảnh báo riêng (DM) cho người vi phạm.\n` +
        `• **3 - 4 cảnh cáo:** Tạm khóa chat (Timeout 10 phút).\n` +
        `• **5 - 6 cảnh cáo:** Trục xuất khỏi Server (Kick).\n` +
        `• **7+ cảnh cáo:** Cấm vĩnh viễn khỏi Server (Ban).\n\n` +
        `*Cảnh báo được gửi riêng qua tin nhắn trực tiếp (DM) để không làm loãng kênh chat.*`;
    } else if (norm === 'notifications' || norm === 'welcome' || norm === 'leave') {
      title = 'HƯỚNG DẪN • THÔNG BÁO THÀNH VIÊN';
      desc =
        `## Thông Báo Chào Mừng & Tạm Biệt\n` +
        `> Tự động phát hiện kênh thích hợp (welcome, general, chat-tong...) để gửi thiệp Embed.\n\n` +
        `**1. Chào mừng thành viên mới (Welcome):**\n` +
        `• Hiển thị Avatar, tên người dùng, thứ tự thành viên và ngày tạo tài khoản Discord.\n\n` +
        `**2. Tạm biệt thành viên (Leave):**\n` +
        `• Hiển thị Avatar, tên người dùng, thời gian đã gắn bó với Server và số lượng thành viên còn lại.\n\n` +
        `**Bật/Tắt module:**\n` +
        `• \`/setup feature enable feature:welcome\``;
    } else if (norm === 'music' || norm === 'nhac') {
      title = 'HƯỚNG DẪN • HỆ THỐNG PHÁT NHẠC (MUSIC)';
      desc =
        `## Hệ Thống Phát Nhạc Cao Cấp (Prefix: \`s!\`)\n` +
        `> Hỗ trợ phát nhạc từ YouTube, Spotify và file audio trực tiếp.\n\n` +
        `**1. Danh sách lệnh phát nhạc:**\n` +
        `• \`s!play <tên bài | link>\` hoặc \`s!p\`: Phát nhạc từ YouTube/Spotify\n` +
        `• \`s!pause\`: Tạm dừng phát nhạc\n` +
        `• \`s!resume\` / \`s!unpause\`: Tiếp tục phát nhạc\n` +
        `• \`s!skip\` / \`s!next\`: Bỏ qua bài hát hiện tại\n` +
        `• \`s!stop\`: Dừng phát và dọn sạch hàng đợi\n` +
        `• \`s!queue [trang]\` / \`s!q [trang]\`: Xem danh sách bài hát trong hàng đợi\n` +
        `• \`s!np\` / \`s!nowplaying\`: Xem thông tin bài hát đang phát\n` +
        `• \`s!volume <1-100>\` / \`s!vol\`: Điều chỉnh âm lượng phát nhạc\n` +
        `• \`s!loop <off|track|queue>\`: Bật/tắt lặp bài hoặc toàn bộ hàng đợi\n` +
        `• \`s!shuffle\`: Xáo trộn thứ tự các bài trong hàng đợi\n` +
        `• \`s!remove <vị trí>\`: Xóa một bài khỏi hàng đợi\n` +
        `• \`s!clear\`: Dọn sạch danh sách chờ\n` +
        `• \`s!leave\` / \`s!dc\`: Ngắt kết nối và rời khỏi kênh thoại\n\n` +
        `*Lưu ý: Kênh văn bản cần được cấp phép bằng lệnh \`/setup channel add channel:#kênh\` trước khi dùng.*`;
    } else if (norm === 'setup' || norm === 'channel') {
      title = 'HƯỚNG DẪN • TRUNG TÂM CẤU HÌNH (/setup)';
      desc =
        `## Trung Tâm Quản Trị Hệ Thống (/setup & s!setup)\n` +
        `> Cấu trúc trực quan chia làm 3 nhóm: \`channel\`, \`whitelist\`, \`feature\`.\n\n` +
        `**1. Cấu hình Kênh (channel):**\n` +
        `• \`/setup channel add channel:#music-chat\`\n` +
        `• \`s!setup channel add #music-chat\`\n` +
        `• \`s!setup channel list\`\n\n` +
        `**2. Cấu hình Bật/Tắt Tính Năng (feature):**\n` +
        `• \`/setup feature enable feature:moderation\`\n` +
        `• \`s!setup feature disable moderation\`\n` +
        `• \`s!setup feature status moderation\`\n\n` +
        `**3. Cấu hình Whitelist (whitelist):**\n` +
        `• \`/setup whitelist add feature:moderation users:@user1\`\n` +
        `• \`s!setup whitelist add moderation @user1\`\n\n` +
        `*Yêu cầu quyền: Quản trị viên (Administrator / Manage Server).*`;
    } else {
      // 'all' / Tổng quan
      title = 'TỔNG QUAN HƯỚNG DẪN SỬ DỤNG BOT';
      desc =
        `## Danh Sách Lệnh & Tính Năng\n` +
        `> Sử dụng \`/help <chức_năng>\` để xem chi tiết từng mục, hoặc \`s!help\` để xem nhanh lệnh nhạc.\n\n` +
        `**1. Phát Nhạc (Music - Lệnh \`s!\`):**\n` +
        `• \`s!play\`, \`s!pause\`, \`s!skip\`, \`s!queue\`, \`s!np\`, \`s!vol\`, \`s!loop\`, \`s!leave\`\n` +
        `  *Xem chi tiết: \`s!help\` hoặc \`/help feature:music\`*\n\n` +
        `**2. Trung Tâm Cấu Hình (/setup & s!setup):**\n` +
        `• Quản lý phân quyền kênh, bật/tắt tính năng, và danh sách Whitelist.\n` +
        `  *Xem chi tiết: \`/help feature:setup\`*\n\n` +
        `**3. Kiểm Duyệt Tự Động (Moderation):**\n` +
        `• Tự động quét và xử lý ngôn từ xúc phạm / thù ghét thời gian thực.\n` +
        `  *Xem chi tiết: \`/help feature:moderation\`*`;
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

    // Hàng 2: [🔉 Giảm âm] [🔊 Tăng âm] [🔂 Lặp lại]
    const loopLabel = loopMode === 'track' ? 'Lặp: Bài' : loopMode === 'queue' ? 'Lặp: Hàng đợi' : 'Lặp: Tắt';
    const loopEmoji = '🔂';
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
}

module.exports = EmbedBuilderUtility;

