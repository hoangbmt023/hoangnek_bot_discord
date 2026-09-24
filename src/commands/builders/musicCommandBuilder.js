const { SlashCommandBuilder, InteractionContextType } = require('discord.js');

/**
 * Xây dựng cấu hình Slash Command cho /music (Hệ thống phát nhạc)
 */
function buildMusicCommand() {
  return new SlashCommandBuilder()
    .setName('music')
    .setDescription('Hệ thống điều khiển phát nhạc chuyên nghiệp trong phòng Voice')
    .setContexts([InteractionContextType.Guild])
    .addSubcommand((sub) =>
      sub
        .setName('play')
        .setDescription('Phát nhạc từ YouTube, Spotify, hoặc tìm kiếm theo từ khóa')
        .addStringOption((opt) =>
          opt
            .setName('query')
            .setDescription('Tên bài hát, Link YouTube, Spotify playlist/track hoặc tệp âm thanh')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('pause')
        .setDescription('Tạm dừng bài hát đang phát')
    )
    .addSubcommand((sub) =>
      sub
        .setName('resume')
        .setDescription('Tiếp tục phát bài hát đang tạm dừng')
    )
    .addSubcommand((sub) =>
      sub
        .setName('skip')
        .setDescription('Bỏ qua bài hát hiện tại để phát bài kế tiếp')
    )
    .addSubcommand((sub) =>
      sub
        .setName('stop')
        .setDescription('Dừng phát nhạc và dọn sạch hàng đợi')
    )
    .addSubcommand((sub) =>
      sub
        .setName('queue')
        .setDescription('Xem danh sách bài hát trong hàng đợi')
        .addIntegerOption((opt) =>
          opt
            .setName('page')
            .setDescription('Số trang cần xem')
            .setRequired(false)
            .setMinValue(1)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('nowplaying')
        .setDescription('Xem thông tin bài hát đang phát')
    )
    .addSubcommand((sub) =>
      sub
        .setName('volume')
        .setDescription('Điều chỉnh âm lượng phát nhạc')
        .addIntegerOption((opt) =>
          opt
            .setName('level')
            .setDescription('Mức âm lượng từ 1 đến 100')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('loop')
        .setDescription('Cài đặt chế độ lặp lại')
        .addStringOption((opt) =>
          opt
            .setName('mode')
            .setDescription('Chế độ lặp lại')
            .setRequired(true)
            .addChoices(
              { name: 'Tắt lặp (off)', value: 'off' },
              { name: 'Lặp lại bài hiện tại (track)', value: 'track' },
              { name: 'Lặp lại toàn bộ hàng đợi (queue)', value: 'queue' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('leave')
        .setDescription('Ngắt kết nối bot khỏi kênh thoại')
    );
}

module.exports = { buildMusicCommand };
