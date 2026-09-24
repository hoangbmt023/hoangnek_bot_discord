const { EmbedBuilder } = require('discord.js');

/**
 * Tạo Embed giao diện trạng thái Đang suy nghĩ cho AI Assistant
 * @param {object} params
 * @param {string} params.question - Câu hỏi của người dùng
 * @param {import('discord.js').User} [params.user] - Người đặt câu hỏi
 * @param {import('discord.js').Guild} [params.guild] - Server Discord
 * @returns {EmbedBuilder}
 */
function createAIThinkingEmbed({ question, user, guild } = {}) {
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
function createAIAnswerEmbed({ answer, model = 'none', responseTime = 0, user } = {}) {
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
function createAIErrorEmbed({ errorMessage, user } = {}) {
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

module.exports = {
  createAIThinkingEmbed,
  createAIAnswerEmbed,
  createAIErrorEmbed,
};
