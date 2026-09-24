const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS } = require('./colors');

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
function createModerationWarningEmbed({ user, label, pointsAdded, totalWarnings, actionTaken, violatedContent }) {
  const isHate = label === 'THÙ GHÉT' || label === 'HATE';
  const color = isHate || actionTaken !== 'NONE' ? COLORS.DANGER : COLORS.WARNING;

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
 * @param {object} params
 * @param {string} params.title
 * @param {string} params.description
 * @param {string} [params.featureName]
 * @param {boolean} [params.success=true]
 * @param {boolean} [params.isDestructive=false]
 * @returns {EmbedBuilder}
 */
function createWhitelistResponseEmbed({ title, description, featureName, success = true, isDestructive = false }) {
  const color = !success || isDestructive ? 0xed4245 : 0x5865f2;

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
 * Tạo ActionRow nút bấm phân trang cho Whitelist List
 * @param {object} params
 * @param {number} params.currentPage
 * @param {number} params.totalPages
 * @param {string} [params.targetType='all']
 * @param {boolean} [params.disabled=false]
 * @returns {ActionRowBuilder}
 */
function createWhitelistPaginationRow({ currentPage, totalPages, targetType = 'all', disabled = false }) {
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

module.exports = {
  createModerationWarningEmbed,
  createWhitelistResponseEmbed,
  createWhitelistPaginationRow,
};
