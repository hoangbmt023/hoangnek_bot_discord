const EmbedBuilderUtility = require('../../../utils/embedBuilder');
const guildSettingsService = require('../guildSettingsService');

/**
 * AISetupHandler
 * Xử lý lệnh cấu hình AI Model & Provider (!setup ai set/primary/reset/status)
 */
class AISetupHandler {
  /**
   * @param {import('discord.js').Message} message
   * @param {string[]} aiArgs
   */
  async handle(message, aiArgs) {
    const { guild } = message;
    const action = (aiArgs[0] || 'status').toLowerCase();

    // 1. Cài đặt Provider chính: !setup ai primary <gemini|openrouter>
    if (action === 'set-primary' || action === 'primary') {
      const provider = (aiArgs[1] || '').toLowerCase();

      if (!provider || (provider !== 'gemini' && provider !== 'openrouter')) {
        const errEmbed = EmbedBuilderUtility.createAISetupResponseEmbed({
          title: 'Nhà Cung Cấp Không Hợp Lệ',
          description:
            '❌ Vui lòng chọn nhà cung cấp AI muốn làm chính: `gemini` (Google Gemini) hoặc `openrouter` (OpenRouter).\n\n' +
            '**Cú pháp:** `!setup ai primary <gemini|openrouter>`\n' +
            '**Ví dụ:** `!setup ai primary openrouter` hoặc `!setup primary gemini`',
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      guildSettingsService.setAIPrimaryProvider(guild.id, provider);
      const providerName = provider === 'openrouter' ? 'OpenRouter' : 'Google Gemini';
      const fallbackName = provider === 'openrouter' ? 'Google Gemini' : 'OpenRouter';

      const embed = EmbedBuilderUtility.createAISetupResponseEmbed({
        title: 'Cài Đặt Nhà Cung Cấp AI Chính Thành Công',
        description:
          `Đã chuyển **${providerName}** thành **Nhà cung cấp AI Chính (Primary)** cho Server:\n\n` +
          `• 🌟 **Chính (Ưu tiên gọi trước):** \`${providerName}\`\n` +
          `• 🔄 **Dự phòng (Fallback):** \`${fallbackName}\`\n\n` +
          `> *Mỗi khi gọi \`!ask\` hoặc \`/ask\`, bot sẽ ưu tiên gọi ${providerName} trước, nếu có sự cố sẽ tự động fallback sang ${fallbackName}.*`,
        success: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    // 2. Cài đặt model: !setup ai set <gemini|openrouter> <model_name>
    if (action === 'set' || action === 'set-model') {
      const provider = (aiArgs[1] || '').toLowerCase();
      const model = aiArgs.slice(2).join(' ').trim();

      if (!provider || (provider !== 'gemini' && provider !== 'openrouter')) {
        const errEmbed = EmbedBuilderUtility.createAISetupResponseEmbed({
          title: 'Nhà Cung Cấp Không Hợp Lệ',
          description:
            '❌ Vui lòng chọn nhà cung cấp AI là `gemini` (Google Gemini) hoặc `openrouter` (OpenRouter).\n\n' +
            '**Cú pháp:** `!setup ai set <gemini|openrouter> <tên_model>`\n' +
            '**Ví dụ:** `!setup ai set gemini gemini-3.6-flash`',
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      if (!model) {
        const errEmbed = EmbedBuilderUtility.createAISetupResponseEmbed({
          title: 'Thiếu Tên Model AI',
          description:
            '❌ Vui lòng nhập tên model AI bạn muốn sử dụng.\n\n' +
            '**Ví dụ Gemini:** `gemini-3.6-flash`, `gemini-3.5-flash-lite`\n' +
            '**Ví dụ OpenRouter:** `openrouter/free`, `nex-agi/nex-n2.5-mini:free`, `liquid/lfm-2.5-2.6b:free`',
          success: false,
        });
        return await message.reply({ embeds: [errEmbed] });
      }

      guildSettingsService.setAIModel(guild.id, provider, model);
      const providerName = provider === 'gemini' ? 'Google Gemini' : 'OpenRouter';

      const embed = EmbedBuilderUtility.createAISetupResponseEmbed({
        title: 'Cài Đặt AI Model Thành Công',
        description:
          `Đã cấu hình Model cho **${providerName}** tại Server:\n` +
          `• **Model:** \`${model}\`\n\n` +
          `> *Model này sẽ được ưu tiên sử dụng mỗi khi thành viên gọi lệnh \`!ask\` hoặc \`/ask\`.*`,
        success: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    // 3. Đặt lại model: !setup ai reset [gemini|openrouter|primary|all]
    if (action === 'reset' || action === 'clear' || action === 'reset-model') {
      const provider = (aiArgs[1] || 'all').toLowerCase();
      guildSettingsService.resetAIModel(guild.id, provider);

      let provText = 'toàn bộ cấu hình AI (Gemini, OpenRouter & Provider chính)';
      if (provider === 'gemini') provText = 'Google Gemini';
      else if (provider === 'openrouter') provText = 'OpenRouter';
      else if (provider === 'primary') provText = 'Nhà cung cấp AI chính (Primary Provider)';

      const embed = EmbedBuilderUtility.createAISetupResponseEmbed({
        title: 'Đặt Lại AI Model Về Mặc Định',
        description:
          `Đã khôi phục Model của **${provText}** về cấu hình mặc định của Bot.\n\n` +
          `> *Sử dụng \`!setup ai status\` để kiểm tra Model hiện tại.*`,
        success: true,
        isDestructive: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    // 4. Xem trạng thái: !setup ai status / !setup ai
    const aiSettings = guildSettingsService.getAISettings(guild.id);

    const primaryName = aiSettings.primaryProvider === 'openrouter' ? 'OpenRouter' : 'Google Gemini';
    const primaryStatus = aiSettings.isCustomPrimary
      ? `\`${primaryName}\` *(Tùy chỉnh riêng Server)*`
      : `\`${primaryName}\` *(Mặc định hệ thống)*`;

    const geminiStatus = aiSettings.isCustomGemini
      ? `\`${aiSettings.geminiModel}\` *(Tùy chỉnh riêng Server)*`
      : `\`${aiSettings.geminiModel}\` *(Mặc định hệ thống)*`;

    const openrouterStatus = aiSettings.isCustomOpenrouter
      ? `\`${aiSettings.openrouterModel}\` *(Tùy chỉnh riêng Server)*`
      : `\`${aiSettings.openrouterModel}\` *(Mặc định hệ thống)*`;

    const desc =
      `Thông tin mô hình AI đang phục vụ cho Server **${guild.name}**:\n\n` +
      `• 🌟 **Nhà cung cấp chính (Primary):** ${primaryStatus}\n` +
      `• 🔷 **Google Gemini:** ${geminiStatus}\n` +
      `• 🔶 **OpenRouter:** ${openrouterStatus}\n\n` +
      `**Các câu lệnh tùy chỉnh:**\n` +
      `• Đổi provider chính: \`!setup ai primary <gemini|openrouter>\` *(hoặc \`!setup primary <gemini|openrouter>\`)*\n` +
      `• Đổi model: \`!setup ai set <gemini|openrouter> <tên_model>\`\n` +
      `• Đặt lại mặc định: \`!setup ai reset [gemini|openrouter|primary|all]\``;

    const embed = EmbedBuilderUtility.createAISetupResponseEmbed({
      title: `Cấu Hình AI Model • ${guild.name}`,
      description: desc,
      success: true,
    });
    return await message.reply({ embeds: [embed] });
  }
}

module.exports = new AISetupHandler();
