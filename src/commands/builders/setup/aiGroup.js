/**
 * Cấu hình nhóm lệnh /setup ai
 * @param {import('discord.js').SlashCommandSubcommandGroupBuilder} group
 */
function buildAISubcommands(group) {
  return group
    .setName('ai')
    .setDescription('Cấu hình mô hình AI Assistant (Gemini / OpenRouter) cho Server')
    .addSubcommand((sub) =>
      sub
        .setName('set-primary')
        .setDescription('Thiết lập nhà cung cấp AI chính (ưu tiên gọi trước)')
        .addStringOption((opt) =>
          opt
            .setName('provider')
            .setDescription('Nhà cung cấp AI chính muốn sử dụng')
            .setRequired(true)
            .addChoices(
              { name: 'Google Gemini (Mặc định, ổn định, tiếng Việt xuất sắc)', value: 'gemini' },
              { name: 'OpenRouter (Kho model đa dạng, nhiều model miễn phí)', value: 'openrouter' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('set-model')
        .setDescription('Chỉ định model cụ thể cho Gemini hoặc OpenRouter')
        .addStringOption((opt) =>
          opt
            .setName('provider')
            .setDescription('Nhà cung cấp AI cần đổi model')
            .setRequired(true)
            .addChoices(
              { name: 'Google Gemini', value: 'gemini' },
              { name: 'OpenRouter', value: 'openrouter' }
            )
        )
        .addStringOption((opt) =>
          opt
            .setName('model')
            .setDescription('Tên model AI muốn sử dụng (gợi ý tự động khi gõ)')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset-model')
        .setDescription('Khôi phục model AI về cấu hình mặc định ban đầu')
        .addStringOption((opt) =>
          opt
            .setName('provider')
            .setDescription('Nhà cung cấp AI cần khôi phục (hoặc tất cả)')
            .setRequired(false)
            .addChoices(
              { name: 'Tất cả cấu hình AI (all)', value: 'all' },
              { name: 'Google Gemini (gemini)', value: 'gemini' },
              { name: 'OpenRouter (openrouter)', value: 'openrouter' },
              { name: 'Nhà cung cấp chính (primary)', value: 'primary' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('Xem thông tin model AI hiện đang phục vụ cho Server')
    );
}

module.exports = { buildAISubcommands };
