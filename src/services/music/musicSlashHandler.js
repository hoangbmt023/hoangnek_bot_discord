const MusicManager = require('./MusicManager');
const MusicSourceResolver = require('./MusicSourceResolver');
const EmbedBuilderUtility = require('../../utils/embedBuilder');
const guildSettingsService = require('../settings/guildSettingsService');
const channelSetupService = require('../settings/channelSetupService');

/**
 * MusicSlashHandler
 * Xử lý Slash Command /music (play, pause, resume, skip, stop, queue, nowplaying, volume, loop, leave)
 */
class MusicSlashHandler {
  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async handleSlashCommand(interaction) {
    const { guildId, member } = interaction;

    // 0. Kiểm tra tính năng nhạc có đang bật không
    const isMusicEnabled = guildSettingsService.isFeatureEnabled(guildId, 'music');
    if (!isMusicEnabled) {
      const embed = EmbedBuilderUtility.createWarningEmbed(
        'Tính Năng Đang Bị Tắt',
        '⚠️ Tính năng **Phát nhạc (Music System)** hiện đang bị tắt bởi Quản trị viên trên máy chủ này.\n\n' +
        '> Quản trị viên có thể bật lại bằng lệnh `/setup feature enable feature:music` hoặc `!setup feature enable music`.'
      );
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // 1. Kiểm tra phân quyền kênh
    const check = channelSetupService.isChannelAllowed(guildId, interaction.channelId, 'music');
    if (!check.allowed) {
      if (check.reason === 'NO_CHANNELS_CONFIGURED') {
        const embed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: 'Chưa Cấu Hình Kênh Phát Nhạc',
          description:
            '⚠️ **Server chưa thiết lập kênh nào được phép phát nhạc!**\n\n' +
            '> Mặc định toàn bộ các kênh đều bị khóa lệnh nhạc.\n' +
            '> Quản trị viên vui lòng dùng `/setup channel add` để cấp phép kênh phát nhạc.',
          success: false,
        });
        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const allowedList = check.configuredChannels.map((id) => `<#${id}>`).join(', ');
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Kênh Không Được Phép',
        description:
          `❌ Bạn không thể dùng lệnh phát nhạc tại kênh này.\n\n` +
          `**Các kênh được phép:** ${allowedList}`,
        success: false,
      });
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // 2. Kiểm tra trạng thái Voice của người dùng
    const voiceChannel = member.voice?.channel;
    if (!voiceChannel) {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Chưa Tham Gia Voice Channel',
        description: 'Bạn cần phải tham gia vào một **Kênh thoại (Voice Channel)** trước khi điều khiển nhạc!',
        success: false,
      });
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const botVoice = interaction.guild.members.me?.voice?.channel;
    if (botVoice && botVoice.id !== voiceChannel.id) {
      const queue = MusicManager.getQueue(interaction.guildId);
      const requester = queue?.currentTrack?.requestedBy;
      const userStr = requester ? (requester.tag || requester.username || `<@${requester.id || requester}>`) : 'người dùng khác';
      const currentSongStr = queue?.currentTrack ? `\n> 🎶 **Đang phát:** *"${queue.currentTrack.title}"*` : '';

      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Bot Đang Được Sử Dụng Ở Kênh Khác',
        description:
          `⚠️ **Bot hiện đang phát nhạc tại phòng thoại <#${botVoice.id}>!**\n` +
          `> 👤 **Người đang sử dụng:** ${userStr}` +
          currentSongStr +
          `\n\n*Vui lòng tham gia cùng phòng thoại <#${botVoice.id}> hoặc đợi bài hát kết thúc để sử dụng bot!*`,
        success: false,
      });
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const subCommand = interaction.options.getSubcommand();

    switch (subCommand) {
      case 'play': {
        const query = interaction.options.getString('query', true);
        await interaction.deferReply();

        try {
          const result = await MusicSourceResolver.resolve(query, interaction.user);
          const queue = await MusicManager.createQueue({
            guild: interaction.guild,
            voiceChannel,
            textChannel: interaction.channel,
          });

          if (result.isPlaylist) {
            await queue.addTracks(result.tracks);
            const playlistEmbed = EmbedBuilderUtility.createPlaylistAddedEmbed({
              tracksCount: result.tracks.length,
              playlistName: result.playlistName,
              source: result.source,
              requestedBy: interaction.user,
            });
            await interaction.editReply({ embeds: [playlistEmbed] });
          } else {
            const track = result.tracks[0];
            const isPlaying = queue.isPlaying();
            const position = queue.tracks.length + 1;

            await queue.addTrack(track);

            if (isPlaying) {
              const addedEmbed = EmbedBuilderUtility.createTrackAddedEmbed({
                track,
                position,
              });
              await interaction.editReply({ embeds: [addedEmbed] });
            } else {
              const startEmbed = EmbedBuilderUtility.createMusicStatusEmbed({
                title: 'Bắt Đầu Phát Nhạc',
                description: `🎶 Đang chuẩn bị phát: **${track.title}**`,
                success: true,
              });
              await interaction.editReply({ embeds: [startEmbed] });
            }
          }
        } catch (error) {
          const errEmbed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Không Thể Phát Nhạc',
            description: error.message || 'Lỗi không xác định khi tìm bài hát.',
            success: false,
          });
          await interaction.editReply({ embeds: [errEmbed] });
        }
        break;
      }

      case 'pause': {
        const queue = MusicManager.getQueue(guildId);
        if (!queue || !queue.isPlaying()) {
          const embed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Không Có Nhạc Đang Phát',
            description: 'Hiện không có bài hát nào đang phát.',
            success: false,
          });
          return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const paused = queue.pause();
        const embed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: paused ? 'Tạm Dừng Phát Nhạc' : 'Không Thể Tạm Dừng',
          description: paused ? '⏸️ Đã tạm dừng phát nhạc.' : 'Nhạc đã tạm dừng từ trước.',
          success: paused,
        });
        return await interaction.reply({ embeds: [embed] });
      }

      case 'resume': {
        const queue = MusicManager.getQueue(guildId);
        if (!queue || !queue.currentTrack) {
          const embed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Không Có Nhạc Đang Phát',
            description: 'Không có bài hát nào để tiếp tục phát.',
            success: false,
          });
          return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const resumed = queue.resume();
        const embed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: resumed ? 'Tiếp Tục Phát Nhạc' : 'Không Thể Tiếp Tục',
          description: resumed ? '▶️ Đã tiếp tục phát nhạc.' : 'Nhạc đang phát bình thường.',
          success: resumed,
        });
        return await interaction.reply({ embeds: [embed] });
      }

      case 'skip': {
        const queue = MusicManager.getQueue(guildId);
        if (!queue || (!queue.currentTrack && queue.tracks.length === 0)) {
          const embed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Không Có Bài Hát',
            description: 'Không có bài hát nào trong hàng đợi để bỏ qua.',
            success: false,
          });
          return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const skippedTrack = queue.currentTrack;
        const embed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: 'Đã Bỏ Qua Bài Hát',
          description: `⏭️ Đã bỏ qua bài hát: **${skippedTrack?.title || 'Hiện tại'}**`,
          success: true,
        });

        await interaction.reply({ embeds: [embed] });
        await queue.skip();
        break;
      }

      case 'stop': {
        const queue = MusicManager.getQueue(guildId);
        if (!queue) {
          const embed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Không Có Hàng Đợi',
            description: 'Bot hiện không phát nhạc.',
            success: false,
          });
          return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        queue.stop();
        const embed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: 'Đã Dừng Phát Nhạc',
          description: '⏹️ Đã dừng phát nhạc và làm trống hàng đợi.',
          success: true,
        });
        return await interaction.reply({ embeds: [embed] });
      }

      case 'queue': {
        const queue = MusicManager.getQueue(guildId);
        if (!queue || (!queue.currentTrack && queue.tracks.length === 0)) {
          const embed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Hàng Đợi Trống',
            description: 'Hiện chưa có bài hát nào trong hàng đợi.',
            success: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }

        const itemsPerPage = 10;
        const totalPages = Math.ceil(queue.tracks.length / itemsPerPage) || 1;
        const page = interaction.options.getInteger('page') || 1;

        if (page < 1 || page > totalPages) {
          const embed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Trang Không Tồn Tại',
            description: `⚠️ **Số trang không hợp lệ!**\n> Hàng đợi hiện chỉ có **${totalPages}** trang (từ trang 1 đến trang ${totalPages}).`,
            success: false,
          });
          return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const queueEmbed = EmbedBuilderUtility.createQueueEmbed({ queue, page });
        const components = totalPages > 1 ? [EmbedBuilderUtility.createQueuePaginationRow({ currentPage: page, totalPages })] : [];
        return await interaction.reply({ embeds: [queueEmbed], components });
      }

      case 'nowplaying': {
        const queue = MusicManager.getQueue(guildId);
        if (!queue || !queue.currentTrack) {
          const embed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Không Có Bài Hát Đang Phát',
            description: 'Hiện tại bot không phát bài hát nào.',
            success: false,
          });
          return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const npEmbed = EmbedBuilderUtility.createNowPlayingEmbed({
          track: queue.currentTrack,
          queue,
        });
        const npRows = EmbedBuilderUtility.createMusicControlRows({ queue });
        return await interaction.reply({ embeds: [npEmbed], components: npRows });
      }

      case 'volume': {
        const queue = MusicManager.getQueue(guildId);
        if (!queue) {
          const embed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Không Có Hàng Đợi',
            description: 'Bot hiện không phát nhạc.',
            success: false,
          });
          return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const level = interaction.options.getInteger('level', true);
        const newVol = queue.setVolume(level);
        const embed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: 'Đã Thay Đổi Âm Lượng',
          description: `🔊 Âm lượng đã được đặt thành **${newVol}%**.`,
          success: true,
        });
        return await interaction.reply({ embeds: [embed] });
      }

      case 'loop': {
        const queue = MusicManager.getQueue(guildId);
        if (!queue) {
          const embed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Không Có Hàng Đợi',
            description: 'Bot hiện không phát nhạc.',
            success: false,
          });
          return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const mode = interaction.options.getString('mode', true);
        const appliedMode = queue.setLoop(mode);
        const modeNames = {
          off: '❌ Tắt lặp lại',
          track: '🔂 Lặp lại bài hát hiện tại',
          queue: '🔁 Lặp lại toàn bộ hàng đợi',
        };

        const embed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: 'Cài Đặt Lặp Lại',
          description: `Chế độ lặp lại đã được chuyển thành: **${modeNames[appliedMode]}**`,
          success: true,
        });
        return await interaction.reply({ embeds: [embed] });
      }

      case 'leave': {
        const queue = MusicManager.getQueue(guildId);
        const botVoice = interaction.guild.members.me?.voice;

        if (!queue && (!botVoice || !botVoice.channel)) {
          const embed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Bot Chưa Tham Gia Kênh Thoại',
            description: 'Hiện tại bot không ở trong bất kỳ kênh thoại nào để rời đi.',
            success: false,
          });
          return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (!queue) {
          if (botVoice && botVoice.channel) {
            botVoice.disconnect().catch(() => {});
          }
          const embed = EmbedBuilderUtility.createMusicStatusEmbed({
            title: 'Đã Rời Kênh Thoại',
            description: '👋 Bot đã ngắt kết nối và rời khỏi kênh thoại.',
            success: true,
          });
          return await interaction.reply({ embeds: [embed] });
        }

        queue.destroy();
        const embed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: 'Đã Rời Kênh Thoại',
          description: '👋 Đã dừng phát nhạc, giải phóng hàng đợi và rời khỏi kênh thoại.',
          success: true,
        });
        return await interaction.reply({ embeds: [embed] });
      }
    }
  }
}

module.exports = new MusicSlashHandler();
