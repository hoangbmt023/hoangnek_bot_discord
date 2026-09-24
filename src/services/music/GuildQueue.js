const {
  joinVoiceChannel,
  createAudioPlayer,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} = require('@discordjs/voice');
const logger = require('../../utils/logger');
const EmbedBuilderUtility = require('../../utils/embedBuilder');

/**
 * GuildQueue
 * Quản lý hàng đợi nhạc, kết nối Voice và AudioPlayer cho từng Guild
 */
class GuildQueue {
  /**
   * @param {Object} options
   * @param {import('discord.js').Guild} options.guild
   * @param {import('discord.js').VoiceBasedChannel} options.voiceChannel
   * @param {import('discord.js').TextBasedChannel} options.textChannel
   * @param {Function} options.onDestroy Callback khi hàng đợi bị hủy
   */
  constructor({ guild, voiceChannel, textChannel, onDestroy }) {
    this.guild = guild;
    this.voiceChannel = voiceChannel;
    this.textChannel = textChannel;
    this.onDestroy = onDestroy;

    /** @type {import('./Track')[]} */
    this.tracks = [];
    /** @type {import('./Track')|null} */
    this.currentTrack = null;
    /** @type {import('./Track')[]} */
    this.history = [];

    /** @type {'off'|'track'|'queue'} */
    this.loopMode = 'off';
    this.volume = 80; // Mức âm lượng mặc định 80%
    this.isManualStop = false;
    this.isDestroyed = false;

    this.connection = null;
    this.player = createAudioPlayer();
    this.currentResource = null;
    this.idleTimer = null;
    /** @type {import('discord.js').Message|null} */
    this.nowPlayingMessage = null;

    this.setupPlayerListeners();
  }

  /**
   * Khởi tạo kết nối Voice Channel
   */
  async init() {
    this.connection = joinVoiceChannel({
      channelId: this.voiceChannel.id,
      guildId: this.guild.id,
      adapterCreator: this.guild.voiceAdapterCreator,
      selfDeaf: true,
    });

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      if (this.isDestroyed) return;
      try {
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
        // Tự khôi phục kết nối thành công
      } catch {
        if (this.isDestroyed) return;
        // Mất kết nối hẳn
        logger.warn(`[GuildQueue] Bot bị ngắt kết nối Voice tại Guild ${this.guild.name} (${this.guild.id})`);
        this.destroy();
      }
    });

    this.connection.on(VoiceConnectionStatus.Destroyed, () => {
      if (this.isDestroyed) return;
      this.destroy();
    });

    // Đợi kết nối sẵn sàng trước khi subscribe AudioPlayer (tránh rè/bụp lúc vừa vào voice)
    await entersState(this.connection, VoiceConnectionStatus.Ready, 15_000);
    this.connection.subscribe(this.player);
    logger.info(`[GuildQueue] Đã kết nối Voice Channel "${this.voiceChannel.name}" tại Server "${this.guild.name}"`);
  }

  /**
   * Thiết lập các sự kiện lắng nghe của AudioPlayer
   */
  setupPlayerListeners() {
    this.player.on(AudioPlayerStatus.Playing, () => {
      this.clearIdleTimer();
      logger.info(`[GuildQueue] Đang phát: "${this.currentTrack?.title}" tại Guild ${this.guild.name}`);
    });

    this.player.on(AudioPlayerStatus.Idle, () => {
      if (this.isDestroyed || this.isManualStop) {
        this.isManualStop = false;
        return;
      }
      this.handleSongFinished();
    });

    this.player.on('error', (error) => {
      if (this.isDestroyed) return;
      logger.error(`[GuildQueue] Lỗi AudioPlayer tại Guild ${this.guild.name}:`, error);
      if (this.textChannel) {
        const errorEmbed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: 'Lỗi Phát Nhạc',
          description: `Đã xảy ra sự cố khi phát bài hát **${this.currentTrack?.title || 'Hiện tại'}**: \`${error.message}\`. Đang chuyển sang bài tiếp theo...`,
          success: false,
        });
        this.textChannel.send({ embeds: [errorEmbed] }).catch(() => {});
      }
      this.handleSongFinished();
    });
  }

  /**
   * Xử lý khi bài hát hiện tại phát xong
   */
  async handleSongFinished() {
    if (this.isDestroyed || this.isManualStop) return;

    if (this.currentTrack) {
      this.history.push(this.currentTrack);
      if (this.history.length > 50) this.history.shift();

      if (this.loopMode === 'track') {
        // Lặp lại bài hát hiện tại
        await this.playTrack(this.currentTrack);
        return;
      } else if (this.loopMode === 'queue') {
        // Đẩy bài vừa phát vào cuối hàng đợi
        this.tracks.push(this.currentTrack);
      }
    }

    this.currentTrack = null;
    this.currentResource = null;

    if (this.tracks.length > 0) {
      const nextTrack = this.tracks.shift();
      await this.playTrack(nextTrack);
    } else {
      if (this.isDestroyed) return;
      // Ẩn nút trên tin nhắn Now Playing của bài vừa phát xong
      if (this.nowPlayingMessage) {
        this.nowPlayingMessage.edit({ components: [] }).catch(() => {});
        this.nowPlayingMessage = null;
      }

      // Hàng đợi đã hết
      logger.info(`[GuildQueue] Hàng đợi tại Guild ${this.guild.name} đã hết.`);
      if (this.textChannel) {
        const finishedEmbed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: 'Hàng Đợi Kết Thúc',
          description: 'Tất cả các bài hát trong hàng đợi đã được phát xong. Bot sẽ tự động rời kênh sau 3 phút nếu không có yêu cầu mới.',
          success: true,
        });
        this.textChannel.send({ embeds: [finishedEmbed] }).catch(() => {});
      }
      this.startIdleTimer();
    }
  }

  /**
   * Thêm một bài hát vào hàng đợi
   * @param {import('./Track')} track
   */
  async addTrack(track) {
    this.tracks.push(track);
    if (!this.isPlaying()) {
      const nextTrack = this.tracks.shift();
      await this.playTrack(nextTrack);
    }
  }

  /**
   * Thêm nhiều bài hát vào hàng đợi (Playlist)
   * @param {import('./Track')[]} newTracks
   */
  async addTracks(newTracks) {
    this.tracks.push(...newTracks);
    if (!this.isPlaying()) {
      const nextTrack = this.tracks.shift();
      await this.playTrack(nextTrack);
    }
  }

  /**
   * Phát một bài hát cụ thể
   * @param {import('./Track')} track
   */
  async playTrack(track) {
    try {
      this.clearIdleTimer();
      this.currentTrack = track;

      // Hủy stream trước đó (nếu có) để tránh rè/click âm thanh khi đổi bài
      if (this.currentResource && this.currentResource.playStream) {
        try {
          this.currentResource.playStream.destroy();
        } catch {}
      }
      this.currentResource = null;

      const resource = await track.createAudioResource(this.volume);
      this.currentResource = resource;

      // Áp dụng âm lượng nếu có VolumeTransformer (cho direct stream)
      if (resource.volume) {
        resource.volume.setVolumeLogarithmic(this.volume / 100);
      }

      this.player.play(resource);

      // Ẩn/xóa nút bấm trên tin nhắn Now Playing của bài trước đó
      if (this.nowPlayingMessage) {
        this.nowPlayingMessage.edit({ components: [] }).catch(() => {});
        this.nowPlayingMessage = null;
      }

      // Gửi thông báo Now Playing kèm nút bấm điều khiển
      if (this.textChannel) {
        const npEmbed = EmbedBuilderUtility.createNowPlayingEmbed({
          track: this.currentTrack,
          queue: this,
        });
        const npRows = EmbedBuilderUtility.createMusicControlRows({ queue: this });
        this.textChannel.send({ embeds: [npEmbed], components: npRows }).then((msg) => {
          this.nowPlayingMessage = msg;
        }).catch(() => {});
      }
    } catch (error) {
      logger.error(`[GuildQueue] Không thể phát bài "${track.title}":`, error);
      if (this.textChannel) {
        const errorEmbed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: 'Không Thể Phát Bài Hát',
          description: `Không thể tạo luồng phát cho bài hát **${track.title}**: \`${error.message}\`. Đang bỏ qua...`,
          success: false,
        });
        this.textChannel.send({ embeds: [errorEmbed] }).catch(() => {});
      }
      // Chuyển bài kế tiếp
      await this.handleSongFinished();
    }
  }

  /**
   * Bỏ qua bài hát hiện tại và phát ngay bài kế tiếp trong hàng đợi
   * @returns {Promise<import('./Track')|null>}
   */
  async skip() {
    const skippedTrack = this.currentTrack;
    if (!skippedTrack && this.tracks.length === 0) {
      return null;
    }

    this.isManualStop = true; // Tránh sự kiện Idle kích hoạt trùng lặp

    // 1. Lưu bài vừa skip vào lịch sử
    if (skippedTrack) {
      this.history.push(skippedTrack);
      if (this.history.length > 50) this.history.shift();
      if (this.loopMode === 'queue') {
        this.tracks.push(skippedTrack);
      }
    }

    // 2. Dọn sạch stream cũ
    if (this.currentResource && this.currentResource.playStream) {
      try {
        this.currentResource.playStream.destroy();
      } catch {}
    }
    this.currentResource = null;
    this.currentTrack = null;

    try {
      this.player.stop(true);
    } catch {}

    // 3. Nếu còn bài tiếp theo -> Phát ngay lập tức
    if (this.tracks.length > 0) {
      const nextTrack = this.tracks.shift();
      await this.playTrack(nextTrack);
    } else {
      logger.info(`[GuildQueue] Hàng đợi tại Guild ${this.guild.name} đã hết sau khi skip.`);
      if (this.textChannel) {
        const finishedEmbed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: 'Hàng Đợi Kết Thúc',
          description: 'Tất cả các bài hát trong hàng đợi đã được phát xong. Bot sẽ tự động rời kênh sau 3 phút nếu không có yêu cầu mới.',
          success: true,
        });
        this.textChannel.send({ embeds: [finishedEmbed] }).catch(() => {});
      }
      this.startIdleTimer();
    }

    this.isManualStop = false;
    return skippedTrack;
  }

  /**
   * Tạm dừng phát nhạc
   * @returns {boolean}
   */
  pause() {
    if (this.player.state.status === AudioPlayerStatus.Playing) {
      return this.player.pause();
    }
    return false;
  }

  /**
   * Tiếp tục phát nhạc
   * @returns {boolean}
   */
  resume() {
    if (this.player.state.status === AudioPlayerStatus.Paused) {
      return this.player.unpause();
    }
    return false;
  }

  /**
   * Dừng phát nhạc và dọn dẹp hàng đợi
   */
  stop() {
    this.isManualStop = true;
    this.tracks = [];
    this.currentTrack = null;

    if (this.nowPlayingMessage) {
      this.nowPlayingMessage.edit({ components: [] }).catch(() => {});
      this.nowPlayingMessage = null;
    }

    if (this.currentResource && this.currentResource.playStream) {
      try {
        this.currentResource.playStream.destroy();
      } catch {}
    }
    this.currentResource = null;
    this.player.stop(true);
    this.startIdleTimer();
  }

  /**
   * Đặt mức âm lượng (1-100)
   * @param {number} volume
   * @returns {number}
   */
  setVolume(volume) {
    const clamped = Math.max(1, Math.min(100, Number(volume) || 80));
    this.volume = clamped;
    if (this.currentResource && this.currentResource.volume) {
      this.currentResource.volume.setVolumeLogarithmic(clamped / 100);
    }
    return clamped;
  }

  /**
   * Thiết lập chế độ lặp
   * @param {'off'|'track'|'queue'} mode
   * @returns {'off'|'track'|'queue'}
   */
  setLoop(mode) {
    const validModes = ['off', 'track', 'queue'];
    if (validModes.includes(mode)) {
      this.loopMode = mode;
    }
    return this.loopMode;
  }

  /**
   * Alias cho setLoop
   * @param {'off'|'track'|'queue'} mode
   */
  setLoopMode(mode) {
    return this.setLoop(mode);
  }

  /**
   * Xáo trộn danh sách bài hát trong hàng đợi
   */
  shuffle() {
    for (let i = this.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
    }
    return this.tracks;
  }

  /**
   * Xóa một bài hát tại vị trí index (1-based)
   * @param {number} index
   * @returns {import('./Track')|null}
   */
  removeTrack(index) {
    const idx = Number(index) - 1;
    if (idx >= 0 && idx < this.tracks.length) {
      const removed = this.tracks.splice(idx, 1);
      return removed[0];
    }
    return null;
  }

  /**
   * Dọn sạch hàng đợi mà không dừng bài đang phát
   * @returns {number} Số lượng bài đã xóa
   */
  clearQueue() {
    const count = this.tracks.length;
    this.tracks = [];
    return count;
  }

  /**
   * Kiểm tra xem player có đang phát nhạc không
   * @returns {boolean}
   */
  isPlaying() {
    return (
      this.player.state.status === AudioPlayerStatus.Playing ||
      this.player.state.status === AudioPlayerStatus.Buffering
    );
  }

  /**
   * Kiểm tra xem player có đang tạm dừng không
   * @returns {boolean}
   */
  isPaused() {
    return this.player.state.status === AudioPlayerStatus.Paused;
  }

  /**
   * Bắt đầu hẹn giờ tự rời voice sau 3 phút idle
   */
  startIdleTimer() {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      logger.info(`[GuildQueue] Guild ${this.guild.name}: Tự động rời Voice sau 3 phút không hoạt động.`);
      if (this.textChannel) {
        const leaveEmbed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: 'Tự Động Rời Kênh Thoại',
          description: 'Bot đã rời kênh thoại do không có hoạt động phát nhạc nào trong 3 phút qua.',
          success: true,
        });
        this.textChannel.send({ embeds: [leaveEmbed] }).catch(() => {});
      }
      this.destroy();
    }, 3 * 60 * 1000);
  }

  /**
   * Hủy hẹn giờ idle
   */
  clearIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  /**
   * Hủy bỏ toàn bộ kết nối và giải phóng tài nguyên
   */
  destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.isManualStop = true;
    this.clearIdleTimer();
    this.tracks = [];
    this.currentTrack = null;

    if (this.nowPlayingMessage) {
      this.nowPlayingMessage.edit({ components: [] }).catch(() => {});
      this.nowPlayingMessage = null;
    }

    if (this.currentResource && this.currentResource.playStream) {
      try {
        this.currentResource.playStream.destroy();
      } catch {}
    }
    this.currentResource = null;

    try {
      this.player.stop(true);
    } catch {}

    try {
      if (this.connection) {
        this.connection.destroy();
      }
    } catch {}

    if (typeof this.onDestroy === 'function') {
      this.onDestroy(this.guild.id);
    }

    logger.info(`[GuildQueue] Đã giải phóng hàng đợi và kết nối Voice tại Guild "${this.guild.name}"`);
  }
}

module.exports = GuildQueue;
