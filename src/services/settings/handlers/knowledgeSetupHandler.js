const EmbedBuilderUtility = require('../../../utils/embedBuilder');
const guildSettingsService = require('../guildSettingsService');

/**
 * KnowledgeSetupHandler
 * Xử lý lệnh cấu hình dữ liệu Server cho AI (!setup knowledge channel/message/text/reset/status)
 */
class KnowledgeSetupHandler {
  /**
   * Trích xuất Channel ID từ cú pháp tag hoặc ID
   * @param {string} input
   * @returns {string|null}
   */
  extractChannelId(input) {
    if (!input) return null;
    const match = input.match(/^<#(\d+)>$/) || input.match(/^(\d{17,20})$/);
    return match ? match[1] : null;
  }

  /**
   * Trích xuất Channel ID và Message ID từ link tin nhắn hoặc ID
   * @param {string} input
   * @param {string} [fallbackChannelId]
   * @returns {{ channelId: string, messageId: string } | null}
   */
  extractMessageInfo(input, fallbackChannelId) {
    if (!input) return null;
    const linkMatch = input.match(/discord(?:app)?\.com\/channels\/(?:\d+|@me)\/(\d+)\/(\d+)/i);
    if (linkMatch) {
      return { channelId: linkMatch[1], messageId: linkMatch[2] };
    }
    const idMatch = input.match(/^(\d{17,20})$/);
    if (idMatch && fallbackChannelId) {
      return { channelId: fallbackChannelId, messageId: idMatch[1] };
    }
    return null;
  }

  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} knowledgeArgs
   */
  async handle(message, knowledgeArgs) {
    const { guild } = message;
    const action = (knowledgeArgs[0] || 'status').toLowerCase();

    // 1. Thêm kênh dữ liệu: !setup knowledge channel <#channel> hoặc !setup knowledge add-channel <#channel>
    if (action === 'channel' || action === 'add-channel' || action === 'set-channel') {
      const channelArg = knowledgeArgs[1];
      const channelId = this.extractChannelId(channelArg);

      if (!channelId || !guild.channels.cache.has(channelId)) {
        const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Kênh Không Hợp Lệ',
          description:
            '❌ Vui lòng tag kênh (ví dụ: `#noi-quy`) hoặc cung cấp ID kênh hợp lệ trong Server.\n\n' +
            '**Cú pháp:** `!setup knowledge channel #channel`',
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      const addResult = guildSettingsService.addKnowledgeChannel(guild.id, channelId);

      if (addResult.alreadyExists) {
        const warnEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Kênh Đã Tồn Tại',
          description: `Kênh <#${channelId}> đã có trong danh sách kênh tri thức rồi.`,
          success: false,
        });
        return await message.reply({ embeds: [warnEmbed] });
      }

      const channelListDisplay = addResult.channelIds.map((id) => `<#${id}>`).join('\n• ') || '*Trống*';
      const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
        title: 'Thêm Kênh Tri Thức Thành Công',
        description:
          `Đã thêm kênh <#${channelId}> vào danh sách **Kênh dữ liệu máy chủ** cho AI.\n\n` +
          `**Danh sách kênh tri thức hiện tại (${addResult.channelIds.length} kênh):**\n• ${channelListDisplay}\n\n` +
          `> *AI sẽ đọc tin nhắn ghim từ tất cả các kênh này khi trả lời câu hỏi.*`,
        success: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    // 1b. Xóa kênh dữ liệu: !setup knowledge remove-channel <#channel>
    if (action === 'remove-channel' || action === 'remove') {
      const channelArg = knowledgeArgs[1];
      const channelId = this.extractChannelId(channelArg);

      if (!channelId) {
        const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Thiếu Kênh',
          description:
            '❌ Vui lòng tag kênh hoặc cung cấp ID kênh cần xóa.\n\n' +
            '**Cú pháp:** `!setup knowledge remove-channel #channel`',
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      const removeResult = guildSettingsService.removeKnowledgeChannel(guild.id, channelId);

      if (removeResult.notFound) {
        const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Kênh Không Có Trong Danh Sách',
          description: `Kênh <#${channelId}> không nằm trong danh sách kênh tri thức.`,
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      const remainingDisplay = removeResult.channelIds.length
        ? removeResult.channelIds.map((id) => `<#${id}>`).join('\n• ')
        : '*Không có kênh nào*';
      const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
        title: 'Xóa Kênh Tri Thức Thành Công',
        description:
          `Đã xóa kênh <#${channelId}> khỏi danh sách.\n\n` +
          `**Kênh còn lại (${removeResult.channelIds.length} kênh):**\n• ${remainingDisplay}`,
        success: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    // 2. Thêm tin nhắn dữ liệu cụ thể: !setup knowledge message <link_or_id> [#channel]
    if (action === 'message' || action === 'add-message' || action === 'set-message' || action === 'msg') {
      const msgArg = knowledgeArgs[1];
      const channelArg = knowledgeArgs[2];
      const fallbackChannelId = this.extractChannelId(channelArg) || message.channelId;
      const msgInfo = this.extractMessageInfo(msgArg, fallbackChannelId);

      if (!msgInfo) {
        const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Tin Nhắn Không Hợp Lệ',
          description:
            '❌ Vui lòng cung cấp **Link tin nhắn Discord** hoặc **ID tin nhắn kèm kênh**.\n\n' +
            '**Cách lấy link tin nhắn:** Click chuột phải vào tin nhắn -> chọn *Copy Message Link* (Sao chép liên kết tin nhắn).\n\n' +
            '**Cú pháp:** `!setup knowledge message <link_tin_nhắn>`\n' +
            '**Hoặc:** `!setup knowledge message <message_id> #channel`',
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      let targetChannel = guild.channels.cache.get(msgInfo.channelId);
      if (!targetChannel) {
        targetChannel = await guild.channels.fetch(msgInfo.channelId).catch(() => null);
      }

      if (!targetChannel || !targetChannel.isTextBased()) {
        const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Kênh Không Tồn Tại',
          description: `❌ Không tìm thấy kênh văn bản chứa tin nhắn ID \`${msgInfo.messageId}\`. Vui lòng kiểm tra lại quyền truy cập!`,
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      let fetchedMsg = null;
      try {
        fetchedMsg = await targetChannel.messages.fetch(msgInfo.messageId);
      } catch {
        fetchedMsg = null;
      }

      if (!fetchedMsg) {
        const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Không Tìm Thấy Tin Nhắn',
          description: `❌ Không thể tìm thấy tin nhắn với ID \`${msgInfo.messageId}\` trong kênh <#${msgInfo.channelId}>. Vui lòng kiểm tra lại link hoặc ID!`,
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      const addRes = guildSettingsService.addKnowledgeMessage(guild.id, msgInfo.channelId, msgInfo.messageId);

      if (addRes.alreadyExists) {
        const warnEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Tin Nhắn Đã Tồn Tại',
          description: `Tin nhắn \`${msgInfo.messageId}\` tại kênh <#${msgInfo.channelId}> đã có trong danh sách tri thức của Server rồi.`,
          success: false,
        });
        return await message.reply({ embeds: [warnEmbed] });
      }

      const snippet =
        fetchedMsg.content && fetchedMsg.content.length > 250
          ? fetchedMsg.content.slice(0, 247) + '...'
          : fetchedMsg.content || '*(Tin nhắn chứa embed/tệp tin)*';

      const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
        title: 'Thêm Tin Nhắn Tri Thức Thành Công',
        description:
          `Đã thêm tin nhắn vào **Nguồn tri thức máy chủ** cho AI:\n\n` +
          `• 💬 **Kênh:** <#${msgInfo.channelId}>\n` +
          `• 👤 **Tác giả:** ${fetchedMsg.author?.tag || fetchedMsg.author?.username || 'Admin'}\n` +
          `• 📜 **Nội dung trích đoạn:**\n> *${snippet}*\n\n` +
          `• 📚 **Tổng số tin nhắn tri thức:** \`${addRes.messages.length} tin nhắn\`\n\n` +
          `> *AI sẽ tự động đọc nội dung tin nhắn này khi trả lời câu hỏi.*`,
        success: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    // 2b. Xóa tin nhắn dữ liệu: !setup knowledge remove-message <link_or_id>
    if (action === 'remove-message' || action === 'del-message' || action === 'rm-message') {
      const msgArg = knowledgeArgs[1];
      if (!msgArg) {
        const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Thiếu Tham Số',
          description: '❌ Vui lòng nhập link tin nhắn hoặc ID tin nhắn cần xóa.\n\n**Cú pháp:** `!setup knowledge remove-message <link_hoặc_id>`',
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      const msgInfo = this.extractMessageInfo(msgArg, message.channelId);
      const targetMsgId = msgInfo ? msgInfo.messageId : msgArg.trim();

      const removeRes = guildSettingsService.removeKnowledgeMessage(guild.id, targetMsgId);

      if (removeRes.notFound) {
        const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Không Tìm Thấy Tin Nhắn',
          description: `❌ Tin nhắn \`${targetMsgId}\` không nằm trong danh sách tri thức của Server.`,
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
        title: 'Xóa Tin Nhắn Tri Thức Thành Công',
        description:
          `Đã xóa tin nhắn \`${targetMsgId}\` khỏi danh sách nguồn tri thức.\n\n` +
          `• 📚 **Tin nhắn còn lại:** \`${removeRes.messages.length} tin nhắn\``,
        success: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    // 3. Thêm văn bản dữ liệu: !setup knowledge text <nội dung>
    if (action === 'text' || action === 'add-text' || action === 'set-text') {
      const text = knowledgeArgs.slice(1).join(' ').trim();

      if (!text) {
        const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Thiếu Nội Dung Văn Bản',
          description:
            '❌ Vui lòng nhập nội dung thông tin / quy định server bạn muốn AI nắm bắt.\n\n' +
            '**Cú pháp:** `!setup knowledge text <nội dung>`',
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      const addTextRes = guildSettingsService.addKnowledgeText(guild.id, text);

      const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
        title: 'Thêm Văn Bản Tri Thức Thành Công',
        description:
          `Đã lưu thêm đoạn văn bản tùy chỉnh cho Server:\n\n` +
          `> *${text.length > 300 ? text.substring(0, 300) + '...' : text}*\n\n` +
          `• 📝 **Tổng số đoạn văn bản:** \`${addTextRes.customTexts.length} đoạn\`\n\n` +
          `> *AI Assistant sẽ ưu tiên dùng kiến thức này để giải đáp thắc mắc.*`,
        success: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    // 3b. Xóa văn bản dữ liệu: !setup knowledge remove-text <số thứ tự>
    if (action === 'remove-text' || action === 'del-text' || action === 'rm-text') {
      const indexArg = knowledgeArgs[1];
      if (!indexArg) {
        const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Thiếu Số Thứ Tự',
          description: '❌ Vui lòng nhập số thứ tự của đoạn văn bản cần xóa.\n\n**Cú pháp:** `!setup knowledge remove-text <số_thứ_tự>`\n*(Xem số thứ tự qua `!setup knowledge status`)*',
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      const removeTextRes = guildSettingsService.removeKnowledgeText(guild.id, indexArg);

      if (removeTextRes.notFound) {
        const errEmbed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
          title: 'Không Tìm Thấy Văn Bản',
          description: `❌ Không tìm thấy đoạn văn bản số \`#${indexArg}\`. Vui lòng dùng \`!setup knowledge status\` để xem danh sách số thứ tự.`,
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
        title: 'Xóa Văn Bản Tri Thức Thành Công',
        description:
          `Đã xóa đoạn văn bản số \`#${indexArg}\` khỏi danh sách tri thức.\n\n` +
          `• 📝 **Số đoạn văn bản còn lại:** \`${removeTextRes.customTexts.length} đoạn\``,
        success: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    // 4. Đặt lại mặc định: !setup knowledge reset / !setup knowledge clear
    if (action === 'reset' || action === 'clear') {
      guildSettingsService.resetKnowledgeConfig(guild.id);

      const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
        title: 'Đặt Lại Dữ Liệu Server Cho AI',
        description:
          'Đã xóa toàn bộ cấu hình kênh kiến thức, tin nhắn chỉ định và văn bản tùy chỉnh. AI sẽ dùng thông tin kênh/vai trò mặc định của Server.',
        success: true,
        isDestructive: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    // 5. Xem trạng thái: !setup knowledge status / !setup knowledge
    const kConfig = guildSettingsService.getKnowledgeConfig(guild.id);
    const channelIds = kConfig.channelIds || [];
    const channelDisplay =
      channelIds.length > 0
        ? channelIds.map((id) => `<#${id}> (\`${id}\`)`).join('\n  • ')
        : '*Chưa thiết lập*';

    const messages = kConfig.messages || [];
    let messageDisplay = '*Chưa thiết lập*';
    if (messages.length > 0) {
      messageDisplay = messages
        .map(
          (m, idx) =>
            `[${idx + 1}] Tin nhắn \`${m.messageId}\` tại <#${m.channelId}> ([Mở link](https://discord.com/channels/${guild.id}/${m.channelId}/${m.messageId}))`
        )
        .join('\n  • ');
    }

    const customTexts = kConfig.customTexts || [];
    let textDisplay = '*Chưa thiết lập*';
    if (customTexts.length > 0) {
      textDisplay = customTexts
        .map((t, idx) => `**[#${idx + 1}]** ${t.length > 150 ? t.substring(0, 147) + '...' : t}`)
        .join('\n\n');
    }

    const desc =
      `Cấu hình nguồn kiến thức máy chủ cho AI Assistant tại **${guild.name}**:\n\n` +
      `• 📜 **Kênh kiến thức (${channelIds.length} kênh):**\n  • ${channelDisplay}\n\n` +
      `• 💬 **Tin nhắn chỉ định (${messages.length} tin nhắn):**\n  • ${messageDisplay}\n\n` +
      `• 📝 **Văn bản tùy chỉnh (${customTexts.length} đoạn):**\n${textDisplay}\n\n` +
      `**Các lệnh cấu hình:**\n` +
      `• Thêm kênh: \`!setup knowledge channel #channel\`\n` +
      `• Xóa kênh: \`!setup knowledge remove-channel #channel\`\n` +
      `• Thêm tin nhắn: \`!setup knowledge add-message <link_hoặc_id> [#kênh]\`\n` +
      `• Xóa tin nhắn: \`!setup knowledge remove-message <link_hoặc_id>\`\n` +
      `• Thêm văn bản: \`!setup knowledge text <nội dung>\`\n` +
      `• Xóa văn bản: \`!setup knowledge remove-text <số_thứ_tự>\`\n` +
      `• Đặt lại mặc định: \`!setup knowledge reset\``;

    const embed = EmbedBuilderUtility.createKnowledgeSetupResponseEmbed({
      title: `Dữ Liệu Server Cho AI • ${guild.name}`,
      description: desc,
      success: true,
    });
    return await message.reply({ embeds: [embed] });
  }
}

module.exports = new KnowledgeSetupHandler();
