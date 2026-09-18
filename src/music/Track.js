const { createAudioResource, StreamType } = require('@discordjs/voice');
const logger = require('../utils/logger');

/**
 * Lớp đại diện cho một bài hát (Track)
 */
class Track {
  /**
   * @param {Object} data
   * @param {string} data.title
   * @param {string} data.url
   * @param {string} [data.originalUrl]
   * @param {string} [data.source='youtube'] 'youtube' | 'spotify' | 'direct'
   * @param {string} [data.artist='Unknown Artist']
   * @param {string} [data.duration='00:00']
   * @param {number} [data.durationSec=0]
   * @param {string} [data.thumbnail='']
   * @param {import('discord.js').User|Object} data.requestedBy
   */
  constructor(data) {
    this.title = data.title || 'Unknown Title';
    this.url = data.url;
    this.originalUrl = data.originalUrl || data.url;
    this.source = data.source || 'youtube';
    this.artist = data.artist || 'Unknown Artist';
    this.duration = data.duration || '00:00';
    this.durationSec = Number(data.durationSec) || 0;
    this.thumbnail = data.thumbnail || '';
    this.requestedBy = data.requestedBy || null;
  }

  /**
   * Tạo AudioResource phát qua @discordjs/voice
   * @param {number} [volume=80] Mức âm lượng (1-100)
   * @returns {Promise<import('@discordjs/voice').AudioResource>}
   */
  async createAudioResource(volume = 80) {
    try {
      if (this.source === 'direct') {
        return createAudioResource(this.url, {
          inputType: StreamType.Arbitrary,
          inlineVolume: false,
        });
      }

      const YtDlpService = require('./YtDlpService');

      // Nguồn YouTube / Spotify (đã resolve sang URL YouTube qua FFmpeg OggOpus chuẩn 20ms frame)
      const ytStream = await YtDlpService.getAudioStream(this.url, volume);
      return createAudioResource(ytStream, {
        inputType: StreamType.OggOpus,
        inlineVolume: false,
        silencePaddingFrames: 5,
      });
    } catch (error) {
      logger.error(`[Track] Lỗi khi tạo audio stream cho "${this.title}" (${this.url}):`, error);
      throw error;
    }
  }

  /**
   * Định dạng thời lượng bài hát
   * @param {number} seconds
   * @returns {string}
   */
  static formatDuration(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
    const totalSecs = Math.floor(seconds);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const pad = (n) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${hrs}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }
}

module.exports = Track;
