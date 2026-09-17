const { EmbedBuilder } = require('discord.js');

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
        `## Lệnh Quản Lý Danh Sách Trắng (/wl)\n` +
        `> Miễn trừ kiểm duyệt tin nhắn cho các thành viên được chỉ định.\n\n` +
        `**1. Thêm thành viên vào Whitelist:**\n` +
        `• \`/wl add feature:<toxic|all> users:<@user1, @user2...>\`\n` +
        `  *Hỗ trợ tag trực tiếp @user hoặc nhập Discord ID, có thể nhập nhiều người dùng cách nhau bởi dấu phẩy.*\n\n` +
        `**2. Xóa thành viên khỏi Whitelist:**\n` +
        `• \`/wl remove feature:<toxic|all> users:<@user1, @user2...>\`\n\n` +
        `**3. Xem danh sách thành viên:**\n` +
        `• \`/wl list\` *(xem toàn bộ)*\n` +
        `• \`/wl list feature:<toxic|all>\` *(xem theo từng chức năng)*\n\n` +
        `**4. Xóa toàn bộ danh sách:**\n` +
        `• \`/wl clear [feature:<toxic|all>]\`\n\n` +
        `*Yêu cầu quyền: Quản trị viên (Administrator / Manage Server / Manage Messages).*`;
    } else if (norm === 'feature' || norm === 'toggle') {
      title = 'HƯỚNG DẪN • BẬT/TẮT TÍNH NĂNG BOT';
      desc =
        `## Lệnh Cấu Hình Tính Năng (/feature)\n` +
        `> Quản lý bật hoặc tắt linh hoạt từng module hoạt động của Bot trong Server.\n\n` +
        `**1. Bật tính năng:**\n` +
        `• \`/feature enable feature:<moderation|welcome|leave|all>\`\n\n` +
        `**2. Tắt tính năng:**\n` +
        `• \`/feature disable feature:<moderation|welcome|leave|all>\`\n\n` +
        `**3. Xem trạng thái các tính năng:**\n` +
        `• \`/feature status\` *(xem toàn bộ)*\n` +
        `• \`/feature status filter:enabled\` *(chỉ xem các tính năng đang BẬT)*\n` +
        `• \`/feature status filter:disabled\` *(chỉ xem các tính năng đang TẮT)*\n\n` +
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
        `• \`/feature enable welcome\` hoặc \`/feature disable leave\``;
    } else {
      // 'all' / Tổng quan
      title = 'TỔNG QUAN HƯỚNG DẪN SỬ DỤNG BOT';
      desc =
        `## Danh Sách Lệnh & Tính Năng\n` +
        `> Sử dụng \`/help <tên_chức_năng>\` để xem chi tiết từng mục.\n\n` +
        `**1. Lệnh Trợ Giúp (/help):**\n` +
        `• \`/help all\`: Tổng quan toàn bộ chức năng của Bot.\n` +
        `• \`/help whitelist\`: Hướng dẫn quản lý Whitelist miễn trừ kiểm duyệt.\n` +
        `• \`/help feature\`: Hướng dẫn bật/tắt và kiểm tra trạng thái tính năng.\n` +
        `• \`/help moderation\`: Giải thích cơ chế lọc ngôn từ và các mức cảnh cáo.\n` +
        `• \`/help notifications\`: Thông tin hệ thống thông báo Chào mừng & Tạm biệt.\n\n` +
        `**2. Quản Lý Whitelist (/wl):**\n` +
        `• \`/wl add\`, \`/wl remove\`, \`/wl list\`, \`/wl clear\`\n\n` +
        `**3. Bật/Tắt Tính Năng (/feature):**\n` +
        `• \`/feature enable\`, \`/feature disable\`, \`/feature status\`\n\n` +
        `*Gõ trực tiếp các lệnh bắt đầu bằng dấu \`/\` để nhận gợi ý tự động từ Discord.*`;
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
}

module.exports = EmbedBuilderUtility;

