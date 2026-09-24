/**
 * Cấu hình nhóm lệnh /setup knowledge
 * @param {import('discord.js').SlashCommandSubcommandGroupBuilder} group
 */
function buildKnowledgeSubcommands(group) {
  return group
    .setName('knowledge')
    .setDescription('Cung cấp tài liệu, nội quy, kênh chat và FAQ riêng của Server cho AI học hỏi')
    .addSubcommand((sub) =>
      sub
        .setName('add-channel')
        .setDescription('Chỉ định kênh chứa nội quy / tài liệu để AI tự động đọc tin nhắn ghim')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Kênh văn bản chứa nội quy / tài liệu')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove-channel')
        .setDescription('Xóa kênh khỏi danh sách tài liệu của AI')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Kênh văn bản cần xóa')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('add-message')
        .setDescription('Chỉ định link tin nhắn hoặc ID tin nhắn cụ thể chứa nội quy để AI học')
        .addStringOption((opt) =>
          opt
            .setName('message')
            .setDescription('Link tin nhắn (Copy Message Link) hoặc Message ID')
            .setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Kênh chứa tin nhắn (nếu chỉ điền Message ID)')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove-message')
        .setDescription('Xóa tin nhắn khỏi danh sách tri thức của AI')
        .addStringOption((opt) =>
          opt
            .setName('message')
            .setDescription('Link tin nhắn hoặc Message ID cần xóa')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('add-text')
        .setDescription('Nhập trực tiếp đoạn văn bản nội quy / thông tin Server cho AI ghi nhớ')
        .addStringOption((opt) =>
          opt
            .setName('content')
            .setDescription('Nội dung văn bản quy định / thông tin cần nạp cho AI')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove-text')
        .setDescription('Xóa đoạn văn bản theo số thứ tự (Xem số thứ tự bằng /setup knowledge status)')
        .addIntegerOption((opt) =>
          opt
            .setName('index')
            .setDescription('Số thứ tự của đoạn văn bản cần xóa')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('Xóa toàn bộ dữ liệu tùy chỉnh của Server cho AI (trở về mặc định)')
    )
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('Xem tổng hợp dữ liệu tri thức Server hiện có cho AI')
    );
}

module.exports = { buildKnowledgeSubcommands };
