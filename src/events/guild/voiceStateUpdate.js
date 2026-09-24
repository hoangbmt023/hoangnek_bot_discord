const { Events } = require('discord.js');
const BaseEvent = require('../BaseEvent');
const MusicManager = require('../../services/music/MusicManager');
const EmbedBuilderUtility = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

/**
 * VoiceStateUpdateEvent
 * Bắt sự kiện thay đổi trạng thái Voice trong Guild:
 * 1. Bot bị người dùng ngắt kết nối hoặc kick khỏi Voice Channel -> Báo động & Dọn dẹp hàng đợi.
 * 2. Bot bị Admin chuyển sang Voice Channel khác -> Cập nhật kênh và thông báo.
 * 3. Tất cả thành viên rời khỏi Voice Channel (bot ở một mình) -> Cảnh báo và tự động đếm ngược rời kênh.
 */
class VoiceStateUpdateEvent extends BaseEvent {
  constructor() {
    super(Events.VoiceStateUpdate);
  }

  /**
   * @param {import('discord.js').VoiceState} oldState
   * @param {import('discord.js').VoiceState} newState
   */
  async execute(oldState, newState) {
    const client = oldState.client;
    const guild = oldState.guild || newState.guild;
    if (!guild) return;

    const botId = client.user.id;
    const queue = MusicManager.getQueue(guild.id);

    // =========================================================================
    // 1. SỰ KIỆN LIÊN QUAN ĐẾN CHÍNH BOT
    // =========================================================================
    if (oldState.id === botId) {
      // 1.1 Bot bị ngắt kết nối (Disconnect / Kick khỏi Voice đột ngột)
      if (oldState.channelId && !newState.channelId) {
        if (queue && !queue.isDestroyed) {
          logger.warn(`[VoiceState] Bot đã bị ngắt kết nối đột ngột khỏi phòng "${oldState.channel?.name}" tại Guild "${guild.name}"`);

          if (queue.textChannel) {
            const embed = EmbedBuilderUtility.createMusicStatusEmbed({
              title: 'Kết Nối Thoại Đã Bị Ngắt',
              description:
                `⚠️ **Bot đã bị ngắt kết nối khỏi kênh thoại <#${oldState.channelId}>.**\n` +
                `> Hàng đợi phát nhạc đã được dọn dẹp và giải phóng tài nguyên an toàn.`,
              success: false,
            });
            queue.textChannel.send({ embeds: [embed] }).catch(() => {});
          }
          queue.destroy();
        }
        return;
      }

      // 1.2 Bot bị Admin di chuyển sang phòng Voice khác
      if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        logger.info(`[VoiceState] Bot đã được di chuyển từ "${oldState.channel?.name}" sang "${newState.channel?.name}" tại Guild "${guild.name}"`);

        if (queue) {
          queue.voiceChannel = newState.channel;
          if (queue.textChannel) {
            const embed = EmbedBuilderUtility.createMusicStatusEmbed({
              title: 'Đã Chuyển Phòng Thoại',
              description: `🔄 Bot đã được chuyển sang phòng thoại <#${newState.channelId}>. Bài hát vẫn tiếp tục phát!`,
              success: true,
            });
            queue.textChannel.send({ embeds: [embed] }).catch(() => {});
          }
        }
        return;
      }
    }

    // =========================================================================
    // 2. SỰ KIỆN THÀNH VIÊN RỜI PHÒNG (KIỂM TRA NẾU BOT Ở MỘT MÌNH)
    // =========================================================================
    if (queue && queue.voiceChannel) {
      const botVoiceChannel = guild.members.me?.voice?.channel;
      if (botVoiceChannel && (oldState.channelId === botVoiceChannel.id || newState.channelId === botVoiceChannel.id)) {
        const humanMembers = botVoiceChannel.members.filter((m) => !m.user.bot);

        // Nếu trong phòng không còn thành viên người thật nào
        if (humanMembers.size === 0) {
          logger.info(`[VoiceState] Phòng thoại "${botVoiceChannel.name}" không còn người nghe. Bắt đầu đếm ngược tự ngắt kết nối.`);

          if (queue.textChannel) {
            const embed = EmbedBuilderUtility.createMusicStatusEmbed({
              title: 'Phòng Thoại Đang Trống',
              description:
                `⚠️ **Tất cả thành viên đã rời khỏi phòng thoại <#${botVoiceChannel.id}>.**\n` +
                `> Bot sẽ tự động ngắt kết nối sau 3 phút nếu không có ai quay lại nghe nhạc.`,
              success: false,
            });
            queue.textChannel.send({ embeds: [embed] }).catch(() => {});
          }
          queue.startIdleTimer();
        } else {
          // Nếu có người tham gia lại, hủy đếm ngược nếu đang phát nhạc
          if (queue.isPlaying()) {
            queue.clearIdleTimer();
          }
        }
      }
    }
  }
}

module.exports = VoiceStateUpdateEvent;
