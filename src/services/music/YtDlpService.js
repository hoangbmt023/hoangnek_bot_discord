const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const YtDlpWrap = require('yt-dlp-wrap').default;
const logger = require('../../utils/logger');

// Thiết lập thư mục TMP nội bộ của dự án để vượt qua phân vùng /tmp bị chặn noexec trên cPanel
const projectTmpDir = path.resolve(__dirname, '../../tmp');
if (!fs.existsSync(projectTmpDir)) {
  try {
    fs.mkdirSync(projectTmpDir, { recursive: true });
  } catch {}
}
process.env.TMPDIR = projectTmpDir;
process.env.TEMP = projectTmpDir;
process.env.TMP = projectTmpDir;

/**
 * Service quản lý yt-dlp binary và trích xuất audio stream YouTube qua ffmpeg (Raw PCM 48kHz Stereo)
 */
class YtDlpService {
  static instance = null;
  static binaryPath = null;
  static isInitialized = false;

  /**
   * Khởi tạo binary yt-dlp
   * @returns {Promise<YtDlpWrap>}
   */
  static async init() {
    if (this.instance && this.isInitialized) return this.instance;

    const binDir = path.resolve(__dirname, '../../bin');
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    this.binaryPath = path.join(binDir, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

    if (!fs.existsSync(this.binaryPath)) {
      logger.info('[YtDlp] Đang tải bản yt-dlp standalone binary mới nhất từ GitHub...');
      if (process.platform === 'linux') {
        // Trên Linux (cPanel / CentOS / Ubuntu), tải bản standalone ELF (yt-dlp_linux) đã đóng gói sẵn Python 3.10+
        // để không bị lỗi xung đột phiên bản Python cũ của hệ điều hành (như Python 3.6.8).
        const downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';
        await YtDlpWrap.downloadFile(downloadUrl, this.binaryPath);
        fs.chmodSync(this.binaryPath, '755');
      } else {
        await YtDlpWrap.downloadFromGithub(this.binaryPath);
      }
      logger.info('[YtDlp] Đã tải xong yt-dlp binary.');
    }

    this.instance = new YtDlpWrap(this.binaryPath);
    this.isInitialized = true;
    return this.instance;
  }

  /**
   * Lấy thông tin video YouTube
   * @param {string} url
   * @returns {Promise<Object>}
   */
  static async getVideoInfo(url) {
    const ytDlp = await this.init();
    const stdout = await ytDlp.execPromise([
      url,
      '--dump-json',
      '--extractor-args', 'youtube:player_client=android',
      '--js-runtimes', 'node',
      '--no-warnings',
    ]);
    return JSON.parse(stdout);
  }

  /**
   * Tìm kiếm bài hát trên YouTube qua yt-dlp với tốc độ cao (flat-playlist)
   * @param {string} query
   * @param {number} [limit=5]
   * @returns {Promise<Object[]>}
   */
  static async search(query, limit = 5) {
    try {
      const ytDlp = await this.init();
      const stdout = await ytDlp.execPromise([
        `ytsearch${limit}:${query}`,
        '--flat-playlist',
        '--dump-json',
        '--no-warnings',
      ]);

      const lines = stdout.trim().split('\n').filter(Boolean);
      return lines
        .map((l) => {
          try {
            const parsed = JSON.parse(l);
            if (parsed && !parsed.webpage_url && parsed.url) {
              parsed.webpage_url = parsed.url;
            }
            return parsed;
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    } catch (error) {
      logger.warn(`[YtDlp] Lỗi khi tìm kiếm YouTube "${query}": ${error.message}`);
      return [];
    }
  }

  /**
   * Tìm kiếm Playlist / Album trên YouTube với bộ lọc chuyên dụng
   * @param {string} query
   * @param {number} [limit=3]
   * @returns {Promise<Object[]>}
   */
  static async searchPlaylists(query, limit = 3) {
    try {
      const ytDlp = await this.init();
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAw%253D%253D`;
      const stdout = await ytDlp.execPromise([
        searchUrl,
        '--flat-playlist',
        '--dump-json',
        '--playlist-items',
        `1-${limit}`,
        '--no-warnings',
      ]);

      const lines = stdout.trim().split('\n').filter(Boolean);
      return lines
        .map((l) => {
          try {
            const parsed = JSON.parse(l);
            if (parsed && !parsed.webpage_url && parsed.url) {
              parsed.webpage_url = parsed.url;
            }
            return parsed;
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    } catch (error) {
      logger.warn(`[YtDlp] Lỗi khi tìm kiếm Playlist YouTube "${query}": ${error.message}`);
      return [];
    }
  }

  /**
   * Lấy danh sách toàn bộ bài hát trong Playlist nhanh chóng
   * @param {string} playlistUrl
   * @returns {Promise<Object[]>}
   */
  static async getPlaylistTracks(playlistUrl) {
    try {
      const ytDlp = await this.init();
      const stdout = await ytDlp.execPromise([
        playlistUrl,
        '--flat-playlist',
        '--dump-single-json',
        '--no-warnings',
      ]);

      const parsed = JSON.parse(stdout.trim());
      const entries = Array.isArray(parsed?.entries) ? parsed.entries : (parsed?.id ? [parsed] : []);
      return entries.map((entry) => {
        if (!entry.webpage_url && entry.url) {
          entry.webpage_url = entry.url.startsWith('http') ? entry.url : `https://www.youtube.com/watch?v=${entry.id || entry.url}`;
        }
        return entry;
      });
    } catch (error) {
      logger.warn(`[YtDlp] Lỗi khi nạp tracks từ playlist "${playlistUrl}": ${error.message}`);
      return [];
    }
  }

  /**
   * Tạo luồng audio Native OggOpus (48000Hz, Stereo, 128kbps, 20ms frame) từ YouTube URL bằng yt-dlp + ffmpeg
   * Đảm bảo không bao giờ bị rè tiếng, giật tiếng, hoặc lỗi decode trên Discord
   * @param {string} url
   * @param {number} [volume=80] Mức âm lượng (1-100)
   * @returns {Promise<import('stream').Readable>}
   */
  static async getAudioStream(url, volume = 80) {
    await this.init();

    const ytdlp = spawn(this.binaryPath, [
      url,
      '-f', 'ba/b',
      '--extractor-args', 'youtube:player_client=android',
      '--js-runtimes', 'node',
      '-o', '-',
      '--no-warnings',
    ], { stdio: ['ignore', 'pipe', 'ignore'] });

    const safeVol = Math.max(1, Math.min(100, Number(volume) || 80));
    const volFilter = `volume=${(safeVol / 100).toFixed(2)}`;
    const audioFilters = `afade=t=in:st=0:d=0.05,${volFilter}`;

    const ffmpeg = spawn(ffmpegPath, [
      '-analyzeduration', '100000',
      '-probesize', '128k',
      '-i', 'pipe:0',
      '-vn',
      '-filter:a', audioFilters,
      '-c:a', 'libopus',
      '-b:a', '128k',
      '-ar', '48000',
      '-ac', '2',
      '-application', 'audio',
      '-frame_duration', '20',
      '-f', 'ogg',
      'pipe:1',
    ], { stdio: ['pipe', 'pipe', 'ignore'] });

    const isIgnorableStreamError = (err) => {
      if (!err) return true;
      const ignorableCodes = [
        'EPIPE',
        'ERR_STREAM_PREMATURE_CLOSE',
        'ERR_STREAM_DESTROYED',
        'EOF',
        'ECONNRESET',
        'ERR_STREAM_ALREADY_FINISHED',
      ];
      if (ignorableCodes.includes(err.code)) return true;
      const msg = (err.message || '').toLowerCase();
      return (
        msg.includes('premature close') ||
        msg.includes('destroyed') ||
        msg.includes('closed') ||
        msg.includes('aborted')
      );
    };

    // Bắt và bỏ qua lỗi EPIPE / Premature Close khi ffmpeg kết thúc trước yt-dlp (hết bài hoặc skip)
    ffmpeg.stdin.on('error', (err) => {
      if (isIgnorableStreamError(err)) return;
      logger.warn(`[YtDlp] Lỗi stream stdin ffmpeg: ${err.message}`);
    });

    ytdlp.stdout.on('error', (err) => {
      if (isIgnorableStreamError(err)) return;
      logger.warn(`[YtDlp] Lỗi stream stdout yt-dlp: ${err.message}`);
    });

    ffmpeg.stdout.on('error', (err) => {
      if (isIgnorableStreamError(err)) return;
      logger.warn(`[YtDlp] Lỗi stream stdout ffmpeg: ${err.message}`);
    });

    ytdlp.stdout.pipe(ffmpeg.stdin);

    const cleanup = () => {
      try {
        ytdlp.stdout.unpipe(ffmpeg.stdin);
      } catch {}
      try {
        if (!ytdlp.stdout.destroyed) ytdlp.stdout.destroy();
      } catch {}
      try {
        if (!ffmpeg.stdin.destroyed) ffmpeg.stdin.destroy();
      } catch {}
      try {
        if (!ytdlp.killed) ytdlp.kill();
      } catch {}
      try {
        if (!ffmpeg.killed) ffmpeg.kill();
      } catch {}
    };

    ytdlp.on('error', (err) => {
      if (isIgnorableStreamError(err)) return;
      logger.error(`[YtDlp] Lỗi tiến trình yt-dlp cho ${url}:`, err);
      cleanup();
    });

    ffmpeg.on('error', (err) => {
      if (isIgnorableStreamError(err)) return;
      logger.error(`[YtDlp] Lỗi tiến trình ffmpeg cho ${url}:`, err);
      cleanup();
    });

    ffmpeg.on('close', cleanup);
    ffmpeg.stdout.on('close', cleanup);
    ffmpeg.stdout.on('end', cleanup);

    // Chờ nhận khung dữ liệu đầu tiên từ FFmpeg trước khi phát (tránh rè/bụp đầu bài)
    await new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      ffmpeg.stdout.once('data', done);
      ffmpeg.once('error', done);
      setTimeout(done, 500);
    });

    return ffmpeg.stdout;
  }
}

module.exports = YtDlpService;