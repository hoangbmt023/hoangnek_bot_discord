const MusicManager = require('../music/MusicManager');
const MusicSourceResolver = require('../music/MusicSourceResolver');
const channelSetupService = require('./channelSetupService');
const guildSettingsService = require('./guildSettingsService');
const EmbedBuilderUtility = require('../utils/embedBuilder');
const logger = require('../utils/logger');

/**
 * MusicCommandHandler
 * Xử lý các câu lệnh điều khiển phát nhạc dạng Prefix (bắt đầu bằng s!)
 */
class MusicCommandHandler {
  constructor() {
    this.prefix = 's!';
  }

  /**
   * Kiểm tra xem tin nhắn có phải lệnh nhạc không
   * @param {string} content
   * @returns {boolean}
   */
  isMusicCommand(content) {
    if (!content || typeof content !== 'string') return false;
    const lower = content.trim().toLowerCase();
    if (!lower.startsWith(this.prefix)) return false;

    const command = lower.slice(this.prefix.length).split(/\s+/)[0];
    const musicCommands = [
      'play', 'p',
      'pause',
      'resume', 'unpause',
      'skip', 'next', 'fs',
      'stop',
      'queue', 'q',
      'nowplaying', 'np',
      'volume', 'vol', 'v',
      'loop', 'repeat',
      'shuffle',
      'remove', 'rm',
      'clear',
      'leave', 'disconnect', 'dc',
      'music',
    ];

    return musicCommands.includes(command);
  }

  /**
   * Kiểm tra quyền kênh văn bản cho phép sử dụng lệnh nhạc
   * @param {import('discord.js').Message} message
   * @returns {boolean}
   */
  validateChannel(message) {
    const { guild, channel } = message;
    const check = channelSetupService.isChannelAllowed(guild.id, channel.id, 'music');

    if (check.allowed) return true;

    if (check.reason === 'NO_CHANNELS_CONFIGURED') {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Chưa Cấu Hình Kênh Phát Nhạc',
        description:
          '⚠️ **Server chưa thiết lập kênh nào được phép phát nhạc!**\n\n' +
          '> Mặc định toàn bộ các kênh đều bị khóa lệnh nhạc.\n' +
          '> Quản trị viên vui lòng sử dụng lệnh `/setup channel add` hoặc `!setup channel add #kênh` để cấp phép kênh phát nhạc.',
        success: false,
      });
      message.reply({ embeds: [embed] }).catch(() => {});
      return false;
    }

    // CHANNEL_NOT_ALLOWED
    const allowedList = check.configuredChannels.map((id) => `<#${id}>`).join(', ');
    const embed = EmbedBuilderUtility.createMusicStatusEmbed({
      title: 'Kênh Không Được Phép',
      description:
        `❌ Bạn không thể dùng lệnh phát nhạc tại kênh này.\n\n` +
        `**Các kênh được phép sử dụng:** ${allowedList}\n` +
        `*Vui lòng di chuyển sang đúng kênh để yêu cầu phát nhạc!*`,
      success: false,
    });
    message.reply({ embeds: [embed] }).catch(() => {});
    return false;
  }

  /**
   * Kiểm tra điều kiện Voice Channel của người dùng
   * @param {import('discord.js').Message} message
   * @returns {import('discord.js').VoiceBasedChannel|null}
   */
  validateVoiceState(message) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Chưa Tham Gia Voice Channel',
        description: '⚠️ Bạn cần phải tham gia vào một **Kênh thoại (Voice Channel)** trước khi dùng lệnh nhạc!',
        success: false,
      });
      message.reply({ embeds: [embed] }).catch(() => {});
      return null;
    }

    const botVoice = message.guild.members.me?.voice?.channel;
    if (botVoice && botVoice.id !== voiceChannel.id) {
      const queue = MusicManager.getQueue(message.guild.id);
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
      message.reply({ embeds: [embed] }).catch(() => {});
      return null;
    }

    return voiceChannel;
  }

  /**
   * Xử lý lệnh Prefix Music (s!...)
   * @param {import('discord.js').Message} message
   */
  async handleCommand(message) {
    if (!message || !message.guild) return;

    // Kiểm tra tính năng Phát nhạc có được bật trong Server không
    if (!guildSettingsService.isFeatureEnabled(message.guild.id, 'music')) {
      const disabledEmbed = EmbedBuilderUtility.createFeatureToggleResponseEmbed({
        title: 'Tính Năng Đã Bị Tắt',
        description:
          '⚠️ Tính năng **Phát nhạc (Music)** hiện đang bị tắt trong Server này bởi Quản trị viên.\n' +
          'Quản trị viên có thể bật lại bằng `/setup feature enable feature:music` hoặc `!setup feature enable music`.',
        enabled: false,
      });
      await message.reply({ embeds: [disabledEmbed] }).catch(() => {});
      return;
    }

    if (!this.validateChannel(message)) return;

    const raw = message.content.trim().slice(this.prefix.length);
    const args = raw.split(/\s+/);
    const command = args.shift().toLowerCase();
    const query = args.join(' ').trim();

    try {
      switch (command) {
        case 'play':
        case 'p':
          await this.handlePlay(message, query);
          break;

        case 'pause':
          await this.handlePause(message);
          break;

        case 'resume':
        case 'unpause':
          await this.handleResume(message);
          break;

        case 'skip':
        case 'next':
        case 'fs':
          await this.handleSkip(message);
          break;

        case 'stop':
          await this.handleStop(message);
          break;

        case 'queue':
        case 'q':
          await this.handleQueue(message, args[0]);
          break;

        case 'nowplaying':
        case 'np':
          await this.handleNowPlaying(message);
          break;

        case 'volume':
        case 'vol':
        case 'v':
          await this.handleVolume(message, args[0]);
          break;

        case 'loop':
        case 'repeat':
          await this.handleLoop(message, args[0]);
          break;

        case 'shuffle':
          await this.handleShuffle(message);
          break;

        case 'remove':
        case 'rm':
          await this.handleRemove(message, args[0]);
          break;

        case 'clear':
          await this.handleClear(message);
          break;

        case 'leave':
        case 'disconnect':
        case 'dc':
          await this.handleLeave(message);
          break;

        case 'music':
        default:
          await message.reply({ embeds: [EmbedBuilderUtility.createHelpEmbed({ feature: 'music' })] });
          break;
      }
    } catch (error) {
      logger.error(`[MusicCommandHandler] Lỗi khi thực thi lệnh "${command}":`, error);
      const errEmbed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Đã Xảy Ra Lỗi',
        description: error.message || 'Không thể thực hiện yêu cầu này. Vui lòng thử lại sau!',
        success: false,
      });
      await message.reply({ embeds: [errEmbed] }).catch(() => {});
    }
  }

  /**
   * Xử lý s!play <tên bài | link>
   */
  async handlePlay(message, query) {
    if (!query) {
      const errEmbed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Thiếu Tên Bài Hát',
        description: 'Vui lòng cung cấp tên bài hát hoặc đường link (YouTube, Spotify, Direct Audio).\n\n**Ví dụ:** `s!play Never Gonna Give You Up`',
        success: false,
      });
      return await message.reply({ embeds: [errEmbed] });
    }

    const voiceChannel = this.validateVoiceState(message);
    if (!voiceChannel) return;

    const searchingEmbed = EmbedBuilderUtility.createSearchingEmbed({
      query,
      user: message.author,
    });
    const loadingMsg = await message.reply({ embeds: [searchingEmbed] }).catch(() => null);

    try {
      const result = await MusicSourceResolver.resolve(query, message.author);

      const queue = await MusicManager.createQueue({
        guild: message.guild,
        voiceChannel,
        textChannel: message.channel,
      });

      if (result.isPlaylist) {
        await queue.addTracks(result.tracks);
        const playlistEmbed = EmbedBuilderUtility.createPlaylistAddedEmbed({
          tracksCount: result.tracks.length,
          playlistName: result.playlistName,
          source: result.source,
          requestedBy: message.author,
        });
        if (loadingMsg) await loadingMsg.edit({ content: null, embeds: [playlistEmbed] });
        else await message.channel.send({ embeds: [playlistEmbed] });
      } else {
        const track = result.tracks[0];
        const isCurrentlyPlaying = queue.isPlaying();
        const position = queue.tracks.length + 1;

        await queue.addTrack(track);

        if (isCurrentlyPlaying) {
          const addedEmbed = EmbedBuilderUtility.createTrackAddedEmbed({
            track,
            position,
          });
          if (loadingMsg) await loadingMsg.edit({ content: null, embeds: [addedEmbed] });
          else await message.channel.send({ embeds: [addedEmbed] });
        } else {
          if (loadingMsg) await loadingMsg.delete().catch(() => {});
        }
      }
    } catch (error) {
      if (loadingMsg) {
        const errEmbed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: 'Không Thể Phát Nhạc',
          description: error.message,
          success: false,
        });
        await loadingMsg.edit({ content: null, embeds: [errEmbed] });
      } else {
        throw error;
      }
    }
  }

  /**
   * Xử lý s!pause
   */
  async handlePause(message) {
    if (!this.validateVoiceState(message)) return;
    const queue = MusicManager.getQueue(message.guild.id);

    if (!queue || !queue.isPlaying()) {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Không Có Nhạc Đang Phát',
        description: 'Hiện không có bài hát nào đang phát trong Server.',
        success: false,
      });
      return await message.reply({ embeds: [embed] });
    }

    const paused = queue.pause();
    const embed = EmbedBuilderUtility.createMusicStatusEmbed({
      title: paused ? 'Tạm Dừng Phát Nhạc' : 'Không Thể Tạm Dừng',
      description: paused
        ? '⏸️ Đã tạm dừng phát nhạc. Sử dụng `s!resume` để tiếp tục.'
        : 'Bài hát đã ở trạng thái tạm dừng trước đó.',
      success: paused,
    });
    await message.reply({ embeds: [embed] });
  }

  /**
   * Xử lý s!resume
   */
  async handleResume(message) {
    if (!this.validateVoiceState(message)) return;
    const queue = MusicManager.getQueue(message.guild.id);

    if (!queue || !queue.currentTrack) {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Không Có Nhạc Đang Phát',
        description: 'Không có bài hát nào để tiếp tục phát.',
        success: false,
      });
      return await message.reply({ embeds: [embed] });
    }

    const resumed = queue.resume();
    const embed = EmbedBuilderUtility.createMusicStatusEmbed({
      title: resumed ? 'Tiếp Tục Phát Nhạc' : 'Không Thể Tiếp Tục',
      description: resumed
        ? '▶️ Đã tiếp tục phát nhạc.'
        : 'Trình phát nhạc không ở trạng thái tạm dừng.',
      success: resumed,
    });
    await message.reply({ embeds: [embed] });
  }

  /**
   * Xử lý s!skip
   */
  async handleSkip(message) {
    if (!this.validateVoiceState(message)) return;
    const queue = MusicManager.getQueue(message.guild.id);

    if (!queue || (!queue.currentTrack && queue.tracks.length === 0)) {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Không Có Bài Hát',
        description: 'Không có bài hát nào trong hàng đợi để bỏ qua.',
        success: false,
      });
      return await message.reply({ embeds: [embed] });
    }

    const skippedTrack = queue.currentTrack;
    const embed = EmbedBuilderUtility.createMusicStatusEmbed({
      title: 'Đã Bỏ Qua Bài Hát',
      description: `⏭️ Đã bỏ qua bài hát: **${skippedTrack?.title || 'Hiện tại'}**`,
      success: true,
    });

    // 1. Gửi phản hồi "Đã Bỏ Qua Bài Hát" TRƯỚC để hiển thị bên trên
    await message.reply({ embeds: [embed] });

    // 2. Chuyển sang bài mới sau -> Thông báo "ĐANG PHÁT NHẠC" sẽ hiển thị ở DƯỚI
    await queue.skip();
  }

  /**
   * Xử lý s!stop
   */
  async handleStop(message) {
    if (!this.validateVoiceState(message)) return;
    const queue = MusicManager.getQueue(message.guild.id);

    if (!queue) {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Không Có Hàng Đợi',
        description: 'Bot hiện không tham gia phát nhạc trong Server này.',
        success: false,
      });
      return await message.reply({ embeds: [embed] });
    }

    queue.stop();
    const embed = EmbedBuilderUtility.createMusicStatusEmbed({
      title: 'Đã Dừng Phát Nhạc',
      description: '⏹️ Đã dừng phát nhạc và làm trống danh sách hàng đợi.',
      success: true,
    });
    await message.reply({ embeds: [embed] });
  }

  /**
   * Xử lý s!queue
   */
  async handleQueue(message, pageArg) {
    const queue = MusicManager.getQueue(message.guild.id);

    if (!queue || (!queue.currentTrack && queue.tracks.length === 0)) {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Hàng Đợi Trống',
        description: 'Hiện chưa có bài hát nào trong hàng đợi. Hãy dùng `s!play <tên bài>` để thêm bài mới!',
        success: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    const itemsPerPage = 10;
    const totalPages = Math.ceil(queue.tracks.length / itemsPerPage) || 1;

    let page = 1;
    if (pageArg) {
      page = parseInt(pageArg, 10);
      if (isNaN(page) || page < 1 || page > totalPages) {
        const embed = EmbedBuilderUtility.createMusicStatusEmbed({
          title: 'Trang Không Tồn Tại',
          description: `⚠️ **Số trang không hợp lệ!**\n> Hàng đợi hiện chỉ có **${totalPages}** trang (từ trang 1 đến trang ${totalPages}).\n\n*Ví dụ xem trang hợp lệ:* \`s!q ${Math.min(2, totalPages)}\``,
          success: false,
        });
        return await message.reply({ embeds: [embed] });
      }
    }

    const queueEmbed = EmbedBuilderUtility.createQueueEmbed({ queue, page });
    const components = totalPages > 1 ? [EmbedBuilderUtility.createQueuePaginationRow({ currentPage: page, totalPages })] : [];
    await message.reply({ embeds: [queueEmbed], components });
  }

  /**
   * Xử lý s!nowplaying
   */
  async handleNowPlaying(message) {
    const queue = MusicManager.getQueue(message.guild.id);

    if (!queue || !queue.currentTrack) {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Không Có Bài Hát Đang Phát',
        description: 'Hiện tại bot không phát bài hát nào.',
        success: false,
      });
      return await message.reply({ embeds: [embed] });
    }

    const npEmbed = EmbedBuilderUtility.createNowPlayingEmbed({
      track: queue.currentTrack,
      queue,
    });
    const npRows = EmbedBuilderUtility.createMusicControlRows({ queue });
    await message.reply({ embeds: [npEmbed], components: npRows });
  }

  /**
   * Xử lý s!volume <1-100>
   */
  async handleVolume(message, volArg) {
    if (!this.validateVoiceState(message)) return;
    const queue = MusicManager.getQueue(message.guild.id);

    if (!queue) {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Không Có Hàng Đợi',
        description: 'Bot hiện không phát nhạc trong Server này.',
        success: false,
      });
      return await message.reply({ embeds: [embed] });
    }

    if (!volArg) {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Âm Lượng Hiện Tại',
        description: `🔊 Âm lượng hiện tại của bot là **${queue.volume}%**.\n\n*Để chỉnh âm lượng: \`s!volume <1-100>\`*`,
        success: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    const volNum = parseInt(volArg, 10);
    if (isNaN(volNum) || volNum < 1 || volNum > 100) {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Âm Lượng Không Hợp Lệ',
        description: 'Vui lòng nhập mức âm lượng từ **1** đến **100** (ví dụ: `s!volume 80`).',
        success: false,
      });
      return await message.reply({ embeds: [embed] });
    }

    const newVol = queue.setVolume(volNum);
    const embed = EmbedBuilderUtility.createMusicStatusEmbed({
      title: 'Đã Thay Đổi Âm Lượng',
      description: `🔊 Âm lượng đã được đặt thành **${newVol}%**.`,
      success: true,
    });
    await message.reply({ embeds: [embed] });
  }

  /**
   * Xử lý s!loop <off|track|queue>
   */
  async handleLoop(message, modeArg) {
    if (!this.validateVoiceState(message)) return;
    const queue = MusicManager.getQueue(message.guild.id);

    if (!queue) {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Không Có Hàng Đợi',
        description: 'Bot hiện không phát nhạc.',
        success: false,
      });
      return await message.reply({ embeds: [embed] });
    }

    let targetMode = (modeArg || '').toLowerCase();
    if (!['off', 'track', 'queue', 'all', 'one', 'single'].includes(targetMode)) {
      // Toggle tuần tự: off -> track -> queue -> off
      if (queue.loopMode === 'off') targetMode = 'track';
      else if (queue.loopMode === 'track') targetMode = 'queue';
      else targetMode = 'off';
    }

    if (targetMode === 'one' || targetMode === 'single') targetMode = 'track';
    if (targetMode === 'all') targetMode = 'queue';

    const appliedMode = queue.setLoop(targetMode);
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
    await message.reply({ embeds: [embed] });
  }

  /**
   * Xử lý s!shuffle
   */
  async handleShuffle(message) {
    if (!this.validateVoiceState(message)) return;
    const queue = MusicManager.getQueue(message.guild.id);

    if (!queue || queue.tracks.length < 2) {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Không Thể Xáo Trộn',
        description: 'Cần ít nhất 2 bài hát trong danh sách chờ để xáo trộn.',
        success: false,
      });
      return await message.reply({ embeds: [embed] });
    }

    queue.shuffle();
    const embed = EmbedBuilderUtility.createMusicStatusEmbed({
      title: 'Đã Xáo Trộn Hàng Đợi',
      description: `🔀 Đã xáo trộn ngẫu nhiên **${queue.tracks.length}** bài hát trong danh sách chờ.`,
      success: true,
    });
    await message.reply({ embeds: [embed] });
  }

  /**
   * Xử lý s!remove <index>
   */
  async handleRemove(message, indexArg) {
    if (!this.validateVoiceState(message)) return;
    const queue = MusicManager.getQueue(message.guild.id);

    if (!queue || queue.tracks.length === 0) {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Hàng Đợi Trống',
        description: 'Không có bài hát nào trong danh sách chờ để xóa.',
        success: false,
      });
      return await message.reply({ embeds: [embed] });
    }

    const index = parseInt(indexArg, 10);
    if (isNaN(index) || index < 1 || index > queue.tracks.length) {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Vị Trí Không Hợp Lệ',
        description: `Vui lòng nhập vị trí bài hát hợp lệ từ **1** đến **${queue.tracks.length}** (ví dụ: \`s!remove 2\`).`,
        success: false,
      });
      return await message.reply({ embeds: [embed] });
    }

    const removed = queue.removeTrack(index);
    const embed = EmbedBuilderUtility.createMusicStatusEmbed({
      title: 'Đã Xóa Bài Hát Khỏi Hàng Đợi',
      description: `🗑️ Đã xóa bài hát **#${index}. ${removed?.title}** khỏi danh sách chờ.`,
      success: true,
    });
    await message.reply({ embeds: [embed] });
  }

  /**
   * Xử lý s!clear
   */
  async handleClear(message) {
    if (!this.validateVoiceState(message)) return;
    const queue = MusicManager.getQueue(message.guild.id);

    if (!queue || queue.tracks.length === 0) {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Hàng Đợi Trống',
        description: 'Danh sách chờ hiện đang trống.',
        success: true,
      });
      return await message.reply({ embeds: [embed] });
    }

    const count = queue.clearQueue();
    const embed = EmbedBuilderUtility.createMusicStatusEmbed({
      title: 'Đã Dọn Sạch Hàng Đợi',
      description: `🧹 Đã xóa toàn bộ **${count}** bài hát khỏi danh sách chờ (Bài đang phát vẫn tiếp tục).`,
      success: true,
    });
    await message.reply({ embeds: [embed] });
  }

  /**
   * Xử lý s!leave
   */
  async handleLeave(message) {
    if (!this.validateVoiceState(message)) return;
    const queue = MusicManager.getQueue(message.guild.id);
    const botVoice = message.guild.members.me?.voice;

    if (!queue && (!botVoice || !botVoice.channel)) {
      const embed = EmbedBuilderUtility.createMusicStatusEmbed({
        title: 'Bot Chưa Tham Gia Kênh Thoại',
        description: 'Hiện tại bot không ở trong bất kỳ kênh thoại nào để rời đi.',
        success: false,
      });
      return await message.reply({ embeds: [embed] });
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
      return await message.reply({ embeds: [embed] });
    }

    queue.destroy();
    const embed = EmbedBuilderUtility.createMusicStatusEmbed({
      title: 'Đã Rời Kênh Thoại',
      description: '👋 Đã dừng phát nhạc, giải phóng hàng đợi và rời khỏi kênh thoại.',
      success: true,
    });
    await message.reply({ embeds: [embed] });
  }
}

module.exports = new MusicCommandHandler();
