const MusicManager = require('../music/MusicManager');
const channelSetupService = require('./channelSetupService');
const EmbedBuilderUtility = require('../utils/embedBuilder');
const logger = require('../utils/logger');

/**
 * MusicButtonHandler
 * Xử lý tất cả các tương tác Nút bấm điều khiển phát nhạc (Player Buttons)
 * và Nút bấm phân trang hàng đợi (Queue Pagination Buttons).
 * Tuân thủ Single Responsibility Principle (SRP).
 */
class MusicButtonHandler {
  /**
   * Kiểm tra xem Custom ID có phải là nút của hệ thống nhạc không
   * @param {string} customId
   * @returns {boolean}
   */
  isMusicButton(customId) {
    if (!customId || typeof customId !== 'string') return false;
    return customId.startsWith('music_') || customId.startsWith('queue_page_');
  }

  /**
   * Kiểm tra điều kiện Voice Channel của người tương tác
   * @param {import('discord.js').ButtonInteraction} interaction
   * @param {import('../music/GuildQueue')} queue
   * @returns {boolean}
   */
  validateVoiceState(interaction, queue) {
    const memberVoice = interaction.member?.voice?.channel;
    if (!memberVoice) {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Chưa Tham Gia Voice Channel',
        description: '⚠️ Bạn cần phải tham gia vào một **Kênh thoại (Voice Channel)** để điều khiển trình phát nhạc!',
        success: false,
      });
      interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
      return false;
    }

    if (queue && queue.voiceChannel && memberVoice.id !== queue.voiceChannel.id) {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Khác Kênh Thoại',
        description: `⚠️ Bạn cần phải ở cùng Kênh thoại <#${queue.voiceChannel.id}> với bot để sử dụng nút điều khiển!`,
        success: false,
      });
      interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
      return false;
    }

    return true;
  }

  /**
   * Kiểm tra phân quyền kênh văn bản
   * @param {import('discord.js').ButtonInteraction} interaction
   * @returns {boolean}
   */
  validateChannel(interaction) {
    const { guildId, channelId } = interaction;
    const check = channelSetupService.isChannelAllowed(guildId, channelId, 'music');
    if (!check.allowed) {
      const allowedList = check.configuredChannels?.map((id) => `<#${id}>`).join(', ') || 'Chưa cấu hình';
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Kênh Không Được Phép',
        description:
          `❌ Bạn không thể điều khiển nhạc tại kênh này.\n\n` +
          `**Các kênh được phép:** ${allowedList}\n` +
          `*Vui lòng sang đúng kênh để thao tác!*`,
        success: false,
      });
      interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
      return false;
    }
    return true;
  }

  /**
   * Điều phối và xử lý sự kiện Nút bấm
   * @param {import('discord.js').ButtonInteraction} interaction
   */
  async handleButtonInteraction(interaction) {
    const { customId, guildId } = interaction;

    // 1. Phân trang hàng đợi nhạc
    if (customId.startsWith('queue_page_')) {
      await this.handleQueuePagination(interaction);
      return;
    }

    // 2. Các nút điều khiển phát nhạc Player
    const queue = MusicManager.getQueue(guildId);

    // Nút xem Hàng đợi không bắt buộc phải ở cùng Voice (cho phép người khác xem danh sách bài hát)
    if (customId === 'music_queue') {
      await this.handleQuickQueue(interaction, queue);
      return;
    }

    if (!queue || (!queue.currentTrack && queue.tracks.length === 0)) {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Hàng Đợi Trống',
        description: 'Bot hiện không tham gia phát nhạc hoặc hàng đợi đã hết.',
        success: false,
      });
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (!this.validateVoiceState(interaction, queue)) return;

    switch (customId) {
      case 'music_pause_resume':
        await this.handlePauseResume(interaction, queue);
        break;

      case 'music_skip':
        await this.handleSkip(interaction, queue);
        break;

      case 'music_stop':
        await this.handleStop(interaction, queue);
        break;

      case 'music_shuffle':
        await this.handleShuffle(interaction, queue);
        break;

      case 'music_loop':
        await this.handleLoop(interaction, queue);
        break;

      case 'music_vol_down':
        await this.handleVolumeChange(interaction, queue, -10);
        break;

      case 'music_vol_up':
        await this.handleVolumeChange(interaction, queue, +10);
        break;

      default:
        break;
    }
  }

  /**
   * Xử lý nút Tạm dừng / Tiếp tục
   * @param {import('discord.js').ButtonInteraction} interaction
   * @param {import('../music/GuildQueue')} queue
   */
  async handlePauseResume(interaction, queue) {
    if (queue.isPaused()) {
      const resumed = queue.resume();
      if (resumed) {
        const rows = EmbedBuilderUtility.createMusicControlRows({ queue });
        if (interaction.message?.editable) {
          await interaction.update({ components: rows }).catch(() => {});
        } else {
          await interaction.deferUpdate().catch(() => {});
        }
        const embed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: 'Tiếp Tục Phát Nhạc',
          description: `▶️ <@${interaction.user.id}> đã tiếp tục phát bài hát: **${queue.currentTrack?.title || 'Hiện tại'}**`,
          success: true,
        });
        await interaction.followUp({ embeds: [embed] }).catch(() => {});
      } else {
        await interaction.reply({ content: '❌ Không thể tiếp tục phát nhạc.', ephemeral: true });
      }
    } else {
      const paused = queue.pause();
      if (paused) {
        const rows = EmbedBuilderUtility.createMusicControlRows({ queue });
        if (interaction.message?.editable) {
          await interaction.update({ components: rows }).catch(() => {});
        } else {
          await interaction.deferUpdate().catch(() => {});
        }
        const embed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: 'Tạm Dừng Phát Nhạc',
          description: `⏸️ <@${interaction.user.id}> đã tạm dừng phát bài hát: **${queue.currentTrack?.title || 'Hiện tại'}**`,
          success: true,
        });
        await interaction.followUp({ embeds: [embed] }).catch(() => {});
      } else {
        await interaction.reply({ content: '❌ Không thể tạm dừng bài hát lúc này.', ephemeral: true });
      }
    }
  }

  /**
   * Xử lý nút Bỏ qua bài hát
   * @param {import('discord.js').ButtonInteraction} interaction
   * @param {import('../music/GuildQueue')} queue
   */
  async handleSkip(interaction, queue) {
    const skippedTrack = queue.currentTrack;
    const embed = EmbedBuilderUtility.createMusicStatusEmbed({
      title: 'Đã Bỏ Qua Bài Hát',
      description: `⏭️ <@${interaction.user.id}> đã bỏ qua bài hát: **${skippedTrack?.title || 'Hiện tại'}**`,
      success: true,
    });

    // 1. Phản hồi xác nhận đã skip
    await interaction.reply({ embeds: [embed] });

    // 2. Chuyển sang bài mới -> Thông báo Now Playing mới sẽ hiển thị dưới
    await queue.skip();
  }

  /**
   * Xử lý nút Dừng phát và dọn hàng đợi
   * @param {import('discord.js').ButtonInteraction} interaction
   * @param {import('../music/GuildQueue')} queue
   */
  async handleStop(interaction, queue) {
    queue.stop();

    // Vô hiệu hóa nút trên tin nhắn cũ
    if (interaction.message?.editable) {
      const disabledRows = EmbedBuilderUtility.createMusicControlRows({ queue, disabled: true });
      await interaction.update({ components: disabledRows }).catch(() => {});
    } else {
      await interaction.deferUpdate().catch(() => {});
    }

    const embed = EmbedBuilderUtility.createMusicStatusEmbed({
      title: 'Đã Dừng Phát Nhạc',
      description: `⏹️ <@${interaction.user.id}> đã dừng phát nhạc và làm trống hàng đợi.`,
      success: true,
    });
    await interaction.followUp({ embeds: [embed] }).catch(() => {});
  }

  /**
   * Xử lý nút Trộn bài (Shuffle)
   * @param {import('discord.js').ButtonInteraction} interaction
   * @param {import('../music/GuildQueue')} queue
   */
  async handleShuffle(interaction, queue) {
    if (!queue.tracks || queue.tracks.length === 0) {
      await interaction.reply({
        content: '⚠️ Hàng đợi chỉ có 1 bài hoặc đang trống, không thể xáo trộn!',
        ephemeral: true,
      });
      return;
    }

    queue.shuffle();
    const embed = EmbedBuilderUtility.createMusicStatusEmbed({
      title: 'Đã Xáo Trộn Hàng Đợi',
      description: `🔀 <@${interaction.user.id}> đã xáo trộn ngẫu nhiên **${queue.tracks.length}** bài hát trong hàng đợi.`,
      success: true,
    });
    await interaction.reply({ embeds: [embed] });
  }

  /**
   * Xử lý nút Chế độ Lặp lại
   * @param {import('discord.js').ButtonInteraction} interaction
   * @param {import('../music/GuildQueue')} queue
   */
  async handleLoop(interaction, queue) {
    let nextMode = 'off';
    if (queue.loopMode === 'off') {
      nextMode = 'track';
    } else if (queue.loopMode === 'track') {
      nextMode = 'queue';
    } else {
      nextMode = 'off';
    }

    if (typeof queue.setLoop === 'function') {
      queue.setLoop(nextMode);
    } else if (typeof queue.setLoopMode === 'function') {
      queue.setLoopMode(nextMode);
    } else {
      queue.loopMode = nextMode;
    }

    const rows = EmbedBuilderUtility.createMusicControlRows({ queue });
    if (interaction.message?.editable) {
      await interaction.update({ components: rows }).catch(() => {});
    } else {
      await interaction.deferUpdate().catch(() => {});
    }

    const modeDisplay = {
      off: '❌ Đã tắt chế độ lặp',
      track: '🔂 Đang lặp lại bài hát hiện tại',
      queue: '🔁 Đang lặp lại toàn bộ hàng đợi',
    };

    const embed = EmbedBuilderUtility.createMusicStatusEmbed({
      title: 'Cập Nhật Chế Độ Lặp',
      description: `🔄 <@${interaction.user.id}> đã cài đặt chế độ lặp: **${modeDisplay[nextMode]}**`,
      success: true,
    });
    await interaction.followUp({ embeds: [embed] }).catch(() => {});
  }

  /**
   * Xử lý nút Tăng / Giảm âm lượng
   * @param {import('discord.js').ButtonInteraction} interaction
   * @param {import('../music/GuildQueue')} queue
   * @param {number} delta
   */
  async handleVolumeChange(interaction, queue, delta) {
    const newVol = Math.max(10, Math.min(100, queue.volume + delta));
    queue.setVolume(newVol);

    const rows = EmbedBuilderUtility.createMusicControlRows({ queue });
    if (interaction.message?.editable) {
      await interaction.update({ components: rows }).catch(() => {});
    } else {
      await interaction.deferUpdate().catch(() => {});
    }

    const embed = EmbedBuilderUtility.createMusicStatusEmbed({
      title: 'Điều Chỉnh Âm Lượng',
      description: `🔊 <@${interaction.user.id}> đã điều chỉnh âm lượng thành **${newVol}%**`,
      success: true,
    });
    await interaction.followUp({ embeds: [embed] }).catch(() => {});
  }

  /**
   * Xử lý nút Mở nhanh Hàng đợi (Quick Queue)
   * @param {import('discord.js').ButtonInteraction} interaction
   * @param {import('../music/GuildQueue')} queue
   */
  async handleQuickQueue(interaction, queue) {
    if (!queue || (!queue.currentTrack && queue.tracks.length === 0)) {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Hàng Đợi Trống',
        description: 'Hiện chưa có bài hát nào trong hàng đợi.',
        success: true,
      });
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    const itemsPerPage = 10;
    const totalPages = Math.ceil(queue.tracks.length / itemsPerPage) || 1;
    const queueEmbed = EmbedBuilderUtility.createQueueEmbed({ queue, page: 1 });
    const components = totalPages > 1 ? [EmbedBuilderUtility.createQueuePaginationRow({ currentPage: 1, totalPages })] : [];

    await interaction.reply({ embeds: [queueEmbed], components, ephemeral: true });
  }

  /**
   * Xử lý nút Chuyển trang trong Hàng đợi nhạc (Queue Pagination)
   * @param {import('discord.js').ButtonInteraction} interaction
   */
  async handleQueuePagination(interaction) {
    const { customId, guildId } = interaction;
    const queue = MusicManager.getQueue(guildId);

    if (!queue) {
      await interaction.reply({
        content: '⚠️ Hàng đợi nhạc này không còn hoạt động.',
        ephemeral: true,
      });
      return;
    }

    const itemsPerPage = 10;
    const totalPages = Math.ceil(queue.tracks.length / itemsPerPage) || 1;
    let targetPage = 1;

    if (customId === 'queue_page_first') {
      targetPage = 1;
    } else if (customId.startsWith('queue_page_prev_')) {
      targetPage = parseInt(customId.replace('queue_page_prev_', ''), 10) || 1;
    } else if (customId.startsWith('queue_page_next_')) {
      targetPage = parseInt(customId.replace('queue_page_next_', ''), 10) || 1;
    } else if (customId.startsWith('queue_page_last_')) {
      targetPage = parseInt(customId.replace('queue_page_last_', ''), 10) || totalPages;
    }

    targetPage = Math.max(1, Math.min(totalPages, targetPage));

    const newEmbed = EmbedBuilderUtility.createQueueEmbed({ queue, page: targetPage });
    const newRow = EmbedBuilderUtility.createQueuePaginationRow({ currentPage: targetPage, totalPages });

    await interaction.update({
      embeds: [newEmbed],
      components: [newRow],
    });
  }
}

module.exports = new MusicButtonHandler();
