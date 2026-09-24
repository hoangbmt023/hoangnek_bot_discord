const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Tạo Embed cho bài hát đang phát (Now Playing)
 * @param {object} params
 * @param {import('../../services/music/Track')} params.track
 * @param {import('../../services/music/GuildQueue')} params.queue
 * @returns {EmbedBuilder}
 */
function createNowPlayingEmbed({ track, queue }) {
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
 * @param {import('../../services/music/Track')} params.track
 * @param {number} params.position
 * @returns {EmbedBuilder}
 */
function createTrackAddedEmbed({ track, position }) {
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
function createPlaylistAddedEmbed({ tracksCount, playlistName, source, requestedBy }) {
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
function createSearchingEmbed({ query, user }) {
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
 * @param {import('../../services/music/GuildQueue')} params.queue
 * @param {number} [params.page=1]
 * @returns {EmbedBuilder}
 */
function createQueueEmbed({ queue, page = 1 }) {
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
function createMusicStatusEmbed({ title, description, success = true }) {
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
 * Tạo các hàng nút bấm điều khiển phát nhạc (ActionRowBuilder)
 * @param {object} params
 * @param {import('../../services/music/GuildQueue')} params.queue
 * @param {boolean} [params.disabled=false]
 * @returns {ActionRowBuilder[]}
 */
function createMusicControlRows({ queue, disabled = false }) {
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
function createQueuePaginationRow({ currentPage, totalPages, disabled = false }) {
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

module.exports = {
  createNowPlayingEmbed,
  createTrackAddedEmbed,
  createPlaylistAddedEmbed,
  createSearchingEmbed,
  createQueueEmbed,
  createMusicStatusEmbed,
  createMusicControlRows,
  createQueuePaginationRow,
};
