const play = require('play-dl');
const spotifyUrlInfo = require('spotify-url-info');
const Track = require('./Track');
const YtDlpService = require('./YtDlpService');
const logger = require('../../utils/logger');

// Khởi tạo spotify-url-info sử dụng fetch toàn cục của Node.js
const { getDetails, getTracks } = spotifyUrlInfo(fetch);

// Bộ nhớ đệm tìm kiếm trong RAM (Cache TTL: 2 giờ)
const searchCache = new Map();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;

function getCachedResult(key) {
  const item = searchCache.get(key.toLowerCase().trim());
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    searchCache.delete(key.toLowerCase().trim());
    return null;
  }
  return item.value;
}

function setCachedResult(key, value) {
  if (searchCache.size > 1000) {
    const firstKey = searchCache.keys().next().value;
    searchCache.delete(firstKey);
  }
  searchCache.set(key.toLowerCase().trim(), {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * MusicSourceResolver
 * Phân tích và chuyển đổi URL hoặc từ khóa tìm kiếm thành Track object.
 * Hỗ trợ:
 * - YouTube (URL / Tìm kiếm -> Luồng audio trực tiếp qua yt-dlp + ffmpeg)
 * - Spotify (URL bài hát / Album / Playlist -> Trích xuất Metadata -> Tìm kiếm và khớp bài chuẩn nhất trên YouTube)
 * - Direct Audio URL / Local file (.mp3, .flac, .ogg, .wav, .m4a)
 * - Chặn các URL không được hỗ trợ (SoundCloud, Facebook, TikTok, ...)
 */
class MusicSourceResolver {
  /**
   * Khử dấu Tiếng Việt chuẩn Unicode NFD để so khớp chuỗi không dấu
   * @param {string} str
   * @returns {string}
   */
  static removeVietnameseTones(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
      .toLowerCase()
      .trim();
  }

  /**
   * Tạo khóa cache thống nhất theo tên bài và nghệ sĩ
   * @param {string} title
   * @param {string} artist
   * @returns {string}
   */
  static buildCacheKey(title, artist = '') {
    const cleanT = this.removeVietnameseTones(this.cleanTitle(title));
    const cleanA = this.removeVietnameseTones((artist || '').split(/[,&x/]/)[0] || '');
    return `${cleanT}::${cleanA}`;
  }

  /**
   * Làm sạch tiêu đề bài hát an toàn: loại bỏ thẻ đóng mở ngoặc MV / Official / Lyrics
   * mà không làm mất từ ngữ trong tên bài chính (như Video Games, Audio, MV,...)
   * @param {string} title
   * @returns {string}
   */
  static cleanTitle(title) {
    if (!title || typeof title !== 'string') return '';
    return title
      // 1. Xóa các thẻ ngoặc vuông chứa từ khóa phụ: [Official MV], [MV], [Lyrics], [Audio], [Vietsub]
      .replace(/\s*\[\s*(official\s*(music\s*)?video|official\s*audio|official\s*mv|official|mv|lyrics\s*video|lyric\s*video|lyrics|audio|visualizer|m\/v|vietsub|hd|4k)\s*\]/gi, '')
      // 2. Xóa các thẻ ngoặc đơn chứa từ khóa phụ: (Official Music Video), (MV), (Audio), (Lyrics)
      .replace(/\s*\(\s*(official\s*(music\s*)?video|official\s*audio|official\s*mv|official|mv|lyrics\s*video|lyric\s*video|lyrics|audio|visualizer|m\/v|vietsub|hd|4k)\s*\)/gi, '')
      // 3. Xóa các hậu tố sau dấu gạch ngang hoặc pipe: " - Official Video", " | MV"
      .replace(/\s*[-|]\s*(official\s*(music\s*)?video|official\s*audio|official\s*mv|official|mv|lyrics\s*video|lyric\s*video|lyrics|visualizer|vietsub)\s*$/gi, '')
      // 4. Xóa dấu ngoặc kép thừa
      .replace(/["“”'’]/g, '')
      .trim();
  }

  /**
   * Trích xuất mảng tên nghệ sĩ (xử lý feat., ft., &, x, dấu phẩy)
   * @param {string} artistStr
   * @returns {string[]}
   */
  static extractArtists(artistStr) {
    if (!artistStr || typeof artistStr !== 'string') return [];
    return artistStr
      .split(/[,&x/]|feat\.|ft\./i)
      .map((a) => a.trim())
      .filter((a) => a.length > 0 && !a.toLowerCase().includes('various'));
  }

  /**
   * Chuẩn hóa URL Spotify (xóa bỏ locale /intl-xx và query parameters ?si=...)
   * @param {string} url
   * @returns {string}
   */
  static normalizeSpotifyUrl(url) {
    try {
      const u = new URL(url);
      u.search = '';
      u.pathname = u.pathname.replace(/\/intl-[a-z]{2}(-[a-z]{2})?/i, '');
      return u.toString();
    } catch {
      return url;
    }
  }

  /**
   * Tìm kiếm bài hát chuẩn xác trên YouTube:
   * Tận dụng thứ tự xếp hạng tự nhiên (#1 -> #2) của AI YouTube,
   * kết hợp lọc thông minh các video rác (Shorts < 30s, Full Album > 20m, 1 hour loop, karaoke, fancam/live nếu không yêu cầu).
   * @param {string} title Tên bài hát
   * @param {string} [artist] Tên ca sĩ/nghệ sĩ
   * @param {number} [targetDurationSec=0] Thời lượng gốc (giây)
   * @returns {Promise<Object|null>}
   */
  static async searchBestYouTubeTrack(title, artist = '', targetDurationSec = 0) {
    const cleanT = this.cleanTitle(title);
    const cleanA = (artist || '').trim();
    const searchQuery = cleanA ? `${cleanT} ${cleanA}` : cleanT;

    const cacheKey = `${this.buildCacheKey(cleanT, cleanA)}_${targetDurationSec}`;
    const cached = getCachedResult(cacheKey);
    if (cached) {
      logger.info(`[Resolver] Đã lấy bài hát từ Cache (0ms): "${cached.title}"`);
      return cached;
    }

    logger.info(`[Resolver] Đang tìm kiếm trên YouTube: "${searchQuery}"...`);
    const allVideos = await YtDlpService.search(searchQuery, 6);

    if (!allVideos || allVideos.length === 0) {
      return null;
    }

    const isTargetFullAlbum = searchQuery.toLowerCase().includes('full album');
    const isTarget1Hour = searchQuery.toLowerCase().includes('1 hour') || searchQuery.toLowerCase().includes('10 hours');
    const isTargetKaraoke = searchQuery.toLowerCase().includes('karaoke') || searchQuery.toLowerCase().includes('beat');
    const isTargetRemix = searchQuery.toLowerCase().includes('remix');
    const isTargetCover = searchQuery.toLowerCase().includes('cover');
    const isTargetLive = searchQuery.toLowerCase().includes('live');

    // Duyệt theo thứ tự xếp hạng ưu tiên tự nhiên của YouTube (#1 -> #2 -> #3)
    // Chỉ loại bỏ các video rác hoặc không liên quan
    for (const video of allVideos) {
      const vTitle = (video.title || '').toLowerCase();
      const vTitleNoTone = this.removeVietnameseTones(vTitle);
      const vDuration = Number(video.duration) || 0;

      // 1. Bỏ qua Shorts / Teaser quá ngắn (< 30s)
      if (vDuration > 0 && vDuration < 30) continue;

      // 2. Bỏ qua Full Album dài (> 20 phút) nếu không tìm full album
      if (!isTargetFullAlbum && vDuration > 1200) continue;

      // 3. Bỏ qua 1 hour loop nếu không yêu cầu
      if (!isTarget1Hour && (vTitle.includes('1 hour') || vTitle.includes('10 hours') || vTitle.includes('1hour') || vTitle.includes('10hours'))) continue;

      // 4. Bỏ qua Karaoke / Beat nếu không yêu cầu
      if (!isTargetKaraoke && (vTitle.includes('karaoke') || vTitle.includes('beat chuẩn') || vTitle.includes('instrumental'))) continue;

      // 5. Bỏ qua Video Review / Reaction / Parody
      if (vTitle.includes('reaction') || vTitle.includes('review') || vTitle.includes('parody')) continue;

      // 6. Bỏ qua Video Live / Fancam / Concert nếu không yêu cầu tìm live
      if (!isTargetLive && (vTitle.includes('fancam') || vTitle.includes('concert day') || vTitleNoTone.includes('live at') || vTitleNoTone.includes('live in') || vTitleNoTone.includes('live stage'))) continue;

      // 7. Bỏ qua Remix / Speed Up / Slowed nếu không yêu cầu
      if (!isTargetRemix && (vTitle.includes('speed up') || vTitle.includes('sped up') || vTitle.includes('slowed') || vTitle.includes('nightcore'))) continue;

      logger.info(`[Resolver] Đã khớp bản chuẩn nhất trên YouTube: "${video.title}" bởi "${video.uploader}" (${video.duration}s)`);
      setCachedResult(cacheKey, video);
      return video;
    }

    // Nếu tất cả bị lọc, lấy video đầu tiên của YouTube
    const fallback = allVideos[0] || null;
    if (fallback) {
      setCachedResult(cacheKey, fallback);
    }
    return fallback;
  }

  /**
   * Kiểm tra xem chuỗi có phải là URL hợp lệ không
   * @param {string} str
   * @returns {boolean}
   */
  static isUrl(str) {
    if (!str || typeof str !== 'string') return false;
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Kiểm tra xem URL có phải là link Spotify không
   * @param {string} str
   * @returns {boolean}
   */
  static isSpotifyUrl(str) {
    if (!this.isUrl(str)) return false;
    const lower = str.toLowerCase();
    return lower.includes('open.spotify.com') || lower.includes('spotify.link');
  }

  /**
   * Kiểm tra xem URL có phải là link YouTube không
   * @param {string} str
   * @returns {boolean}
   */
  static isYouTubeUrl(str) {
    if (!this.isUrl(str)) return false;
    const lower = str.toLowerCase();
    return lower.includes('youtube.com') || lower.includes('youtu.be');
  }

  /**
   * Kiểm tra xem URL có phải là link file audio trực tiếp không
   * @param {string} urlStr
   * @returns {boolean}
   */
  static isDirectAudioUrl(urlStr) {
    if (!this.isUrl(urlStr)) return false;
    const cleanUrl = urlStr.split('?')[0].toLowerCase();
    const audioExtensions = ['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.opus'];
    return audioExtensions.some((ext) => cleanUrl.endsWith(ext));
  }

  /**
   * Giải quyết yêu cầu phát nhạc từ query/link
   * @param {string} query
   * @param {import('discord.js').User} requester
   * @returns {Promise<{ tracks: Track[], isPlaylist: boolean, playlistName?: string, source: string }>}
   */
  static async resolve(query, requester) {
    if (!query || typeof query !== 'string') {
      throw new Error('Vui lòng nhập tên bài hát hoặc link hợp lệ.');
    }

    const trimmed = query.trim();
    const isLink = this.isUrl(trimmed);

    // 1. Kiểm tra nếu là Direct Audio URL
    if (this.isDirectAudioUrl(trimmed)) {
      const filename = trimmed.split('/').pop().split('?')[0] || 'Audio Stream';
      const track = new Track({
        title: decodeURIComponent(filename),
        url: trimmed,
        originalUrl: trimmed,
        source: 'direct',
        artist: 'Direct Audio Source',
        duration: 'Live / Audio File',
        durationSec: 0,
        thumbnail: 'https://cdn.discordapp.com/embed/avatars/0.png',
        requestedBy: requester,
      });
      return { tracks: [track], isPlaylist: false, source: 'direct' };
    }

    // 2. Kiểm tra nếu là Link Spotify
    if (this.isSpotifyUrl(trimmed)) {
      return await this.resolveSpotify(trimmed, requester);
    }

    // 3. Kiểm tra nếu là Link YouTube
    if (isLink && (this.isYouTubeUrl(trimmed) || play.yt_validate(trimmed) === 'video' || play.yt_validate(trimmed) === 'playlist')) {
      const ytType = (play.yt_validate(trimmed) === 'playlist' || trimmed.includes('list=')) ? 'playlist' : 'video';
      return await this.resolveYouTube(trimmed, ytType, requester);
    }

    // 4. Nếu là URL nhưng không thuộc các dịch vụ trên -> Từ chối theo yêu cầu
    if (isLink) {
      throw new Error('Link không được hỗ trợ! Bot chỉ chấp nhận link YouTube, Spotify hoặc file audio trực tiếp (.mp3, .flac).');
    }

    // 5. Nếu là từ khóa tìm kiếm văn bản (Search Query)
    return await this.resolveSearchQuery(trimmed, requester);
  }

  /**
   * Xử lý Spotify: Lấy metadata và tìm nguồn âm thanh chuẩn xác trên YouTube
   * Ưu tiên tìm kiếm toàn bộ Album Playlist trước, nếu không có mới tìm kiếm song song từng bài
   * @param {string} url
   * @param {import('discord.js').User} requester
   */
  static async resolveSpotify(url, requester) {
    try {
      const normUrl = this.normalizeSpotifyUrl(url);
      logger.info(`[Resolver] Đang trích xuất Metadata Spotify từ: ${normUrl}...`);

      let details;
      let title = '';
      let artist = '';
      let thumbnail = '';
      let durationSec = 0;

      try {
        details = await getDetails(normUrl);
        if (details?.preview) {
          title = details.preview.title || details.preview.track || '';
          artist = details.preview.artist || '';
          thumbnail = details.preview.image || '';
          durationSec = Math.floor((details.tracks?.[0]?.duration || 0) / 1000);
        }
      } catch (err) {
        logger.warn(`[Resolver] getDetails gặp lỗi, thử phương thức Spotify oEmbed: ${err.message}`);
        try {
          const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(normUrl)}`);
          if (oembedRes.ok) {
            const oembed = await oembedRes.json();
            title = oembed.title || '';
            thumbnail = oembed.thumbnail_url || '';
          }
        } catch {}
      }

      const isPlaylistOrAlbum = normUrl.includes('/playlist/') || normUrl.includes('/album/');

      // 1. Xử lý bài hát đơn lẻ (Single Track)
      if (!isPlaylistOrAlbum && title) {
        logger.info(`[Resolver] Spotify: "${title}" bởi "${artist}" (${durationSec}s). Đang tìm bài chuẩn trên YouTube...`);

        const ytVideo = await this.searchBestYouTubeTrack(title, artist, durationSec);

        if (ytVideo && ytVideo.webpage_url) {
          const track = new Track({
            title: title,
            url: ytVideo.webpage_url,
            originalUrl: url,
            source: 'spotify',
            artist: artist || ytVideo.uploader,
            duration: Track.formatDuration(ytVideo.duration || durationSec),
            durationSec: Number(ytVideo.duration) || durationSec,
            thumbnail: thumbnail || ytVideo.thumbnail,
            requestedBy: requester,
          });
          return { tracks: [track], isPlaylist: false, source: 'spotify' };
        }

        throw new Error(`Không tìm thấy bản phát âm thanh phù hợp cho "${title}" bởi "${artist}" trên YouTube.`);
      }

      // 2. Xử lý Playlist / Album Spotify
      const rawTracks = await getTracks(normUrl).catch(() => []);
      if (!rawTracks || rawTracks.length === 0) {
        throw new Error('Playlist hoặc Album Spotify này không có bài hát nào hoặc không thể đọc.');
      }

      const playlistName = details?.preview?.title || title || 'Spotify Album';
      const isAlbum = normUrl.includes('/album/');
      const tracksToResolve = rawTracks.slice(0, 50);
      const resolvedTracks = new Array(tracksToResolve.length).fill(null);

      // =========================================================================
      // CHIẾN LƯỢC 1: HYBRID ALBUM RESOLVER (TÌM ALBUM PLAYLIST CHÍNH CHỦ TRÊN YOUTUBE)
      // =========================================================================
      if (isAlbum && title) {
        try {
          const albumCleanTitle = this.cleanTitle(title);
          const albumArtist = (artist || '').split(/[,&x/]/)[0]?.trim() || '';
          const albumQuery = `${albumCleanTitle} ${albumArtist} album`.trim();

          logger.info(`[Resolver] Đang tìm kiếm Album Playlist chính chủ trên YouTube: "${albumQuery}"...`);
          const foundPlaylists = await YtDlpService.searchPlaylists(albumQuery, 5);

          let bestPlaylist = null;
          const normAlbumTitle = albumCleanTitle.toLowerCase();
          const normArtist = albumArtist.toLowerCase();

          for (const pl of foundPlaylists) {
            const plTitle = (pl.title || '').toLowerCase();
            const plUploader = (pl.uploader || '').toLowerCase();
            if (plTitle.includes(normAlbumTitle) || (normArtist && plUploader.includes(normArtist))) {
              bestPlaylist = pl;
              break;
            }
          }

          if (bestPlaylist && (bestPlaylist.url || bestPlaylist.webpage_url)) {
            const plUrl = bestPlaylist.url || bestPlaylist.webpage_url;
            logger.info(`[Resolver] Đã tìm thấy Album Playlist YouTube: "${bestPlaylist.title}" (${plUrl}). Đang nạp danh sách bài hát...`);
            const ytAlbumVideos = await YtDlpService.getPlaylistTracks(plUrl);

            if (ytAlbumVideos && ytAlbumVideos.length > 0) {
              for (let i = 0; i < tracksToResolve.length; i++) {
                const item = tracksToResolve[i];
                const itemTitle = item.name || item.title;
                const itemArtist = item.artist || artist || 'Unknown Artist';
                const itemDurationSec = Math.floor((item.duration || 0) / 1000);
                const normItemTitle = this.cleanTitle(itemTitle).toLowerCase();

                // Tìm video khớp trong Playlist
                const matchedVideo = ytAlbumVideos.find((v) => {
                  const vTitle = (v.title || '').toLowerCase();
                  return vTitle.includes(normItemTitle);
                });

                if (matchedVideo && (matchedVideo.url || matchedVideo.webpage_url)) {
                  const trackUrl = matchedVideo.webpage_url || matchedVideo.url;
                  const trackObj = new Track({
                    title: itemTitle,
                    url: trackUrl,
                    originalUrl: url,
                    source: 'spotify',
                    artist: itemArtist,
                    duration: Track.formatDuration(matchedVideo.duration || itemDurationSec),
                    durationSec: Number(matchedVideo.duration) || itemDurationSec,
                    thumbnail: thumbnail,
                    requestedBy: requester,
                  });
                  resolvedTracks[i] = trackObj;

                  // Lưu vào RAM Cache cho các lần gọi sau
                  setCachedResult(this.buildCacheKey(itemTitle, itemArtist), {
                    webpage_url: trackUrl,
                    title: matchedVideo.title || itemTitle,
                    uploader: matchedVideo.uploader || itemArtist,
                    duration: matchedVideo.duration || itemDurationSec,
                    thumbnail: thumbnail,
                  });
                }
              }

              const matchedCount = resolvedTracks.filter(Boolean).length;
              logger.info(`[Resolver] Đã khớp tức thì ${matchedCount}/${tracksToResolve.length} bài trực tiếp từ Album Playlist YouTube!`);
            }
          }
        } catch (albumErr) {
          logger.warn(`[Resolver] Lỗi khi xử lý Album Playlist YouTube (${albumErr.message}), chuyển sang tìm kiếm bài còn thiếu...`);
        }
      }

      // =========================================================================
      // CHIẾN LƯỢC 2: TÌM KIẾM SONG SONG CÁC BÀI CÒN THIẾU (PARALLEL RESOLVER 10 BÀI/LƯỢT)
      // =========================================================================
      const unresolvedIndices = [];
      for (let i = 0; i < tracksToResolve.length; i++) {
        if (!resolvedTracks[i]) {
          unresolvedIndices.push(i);
        }
      }

      if (unresolvedIndices.length > 0) {
        logger.info(`[Resolver] Đang tìm kiếm song song ${unresolvedIndices.length} bài còn thiếu (10 bài/lượt)...`);
        const batchSize = 10;
        for (let i = 0; i < unresolvedIndices.length; i += batchSize) {
          const batchIndices = unresolvedIndices.slice(i, i + batchSize);
          const batchResults = await Promise.allSettled(
            batchIndices.map(async (idx) => {
              const item = tracksToResolve[idx];
              const itemTitle = item.name || item.title;
              const itemArtist = item.artist || artist || 'Unknown Artist';
              const itemDurationSec = Math.floor((item.duration || 0) / 1000);

              const ytVideo = await this.searchBestYouTubeTrack(itemTitle, itemArtist, itemDurationSec);
              if (ytVideo && ytVideo.webpage_url) {
                return {
                  idx,
                  track: new Track({
                    title: itemTitle,
                    url: ytVideo.webpage_url,
                    originalUrl: url,
                    source: 'spotify',
                    artist: itemArtist,
                    duration: Track.formatDuration(ytVideo.duration || itemDurationSec),
                    durationSec: Number(ytVideo.duration) || itemDurationSec,
                    thumbnail: ytVideo.thumbnail || thumbnail,
                    requestedBy: requester,
                  }),
                };
              }
              return null;
            })
          );

          for (const res of batchResults) {
            if (res.status === 'fulfilled' && res.value?.track) {
              resolvedTracks[res.value.idx] = res.value.track;
            }
          }
        }
      }

      const finalTracks = resolvedTracks.filter(Boolean);

      if (finalTracks.length === 0) {
        throw new Error('Không thể tìm thấy nguồn phát audio hợp lệ cho các bài hát trong Playlist/Album Spotify này.');
      }

      return {
        tracks: finalTracks,
        isPlaylist: true,
        playlistName,
        source: 'spotify',
      };
    } catch (error) {
      logger.error(`[Resolver] Lỗi khi xử lý Spotify URL (${url}):`, error);
      throw error;
    }
  }

  /**
   * Xử lý link YouTube: Trích xuất metadata và tạo Track chất lượng cao bằng yt-dlp
   * @param {string} url
   * @param {'video'|'playlist'} type
   * @param {import('discord.js').User} requester
   */
  static async resolveYouTube(url, type, requester) {
    try {
      if (type === 'video' || !url.includes('list=')) {
        logger.info(`[Resolver] Đang trích xuất thông tin video YouTube từ: ${url}...`);

        let title = '';
        let channelName = '';
        let thumbnail = '';
        let durationSec = 0;

        try {
          const info = await YtDlpService.getVideoInfo(url);
          title = info.title || '';
          channelName = info.uploader || '';
          thumbnail = info.thumbnail || '';
          durationSec = Number(info.duration) || 0;
        } catch (err) {
          logger.warn(`[Resolver] yt-dlp getVideoInfo lỗi, thử oEmbed: ${err.message}`);
          try {
            const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
            if (oembedRes.ok) {
              const oembed = await oembedRes.json();
              title = oembed.title || '';
              channelName = oembed.author_name || '';
              thumbnail = oembed.thumbnail_url || '';
            }
          } catch {}
        }

        title = title || 'YouTube Track';

        const track = new Track({
          title: title,
          url: url,
          originalUrl: url,
          source: 'youtube',
          artist: channelName || 'YouTube Creator',
          duration: Track.formatDuration(durationSec),
          durationSec: durationSec,
          thumbnail: thumbnail,
          requestedBy: requester,
        });

        return { tracks: [track], isPlaylist: false, source: 'youtube' };
      }

      if (type === 'playlist') {
        const playlist = await play.playlist_info(url, { incomplete: true });
        const allVideos = await playlist.all_videos();

        if (!allVideos || allVideos.length === 0) {
          throw new Error('Playlist YouTube này không có video nào.');
        }

        const tracks = allVideos.map(
          (video) =>
            new Track({
              title: video.title,
              url: video.url,
              originalUrl: video.url,
              source: 'youtube',
              artist: video.channel?.name || playlist.title,
              duration: video.durationRaw,
              durationSec: video.durationInSec,
              thumbnail: video.thumbnails?.[0]?.url || '',
              requestedBy: requester,
            })
        );

        return {
          tracks,
          isPlaylist: true,
          playlistName: playlist.title,
          source: 'youtube',
        };
      }
    } catch (error) {
      logger.error(`[Resolver] Lỗi khi xử lý YouTube URL (${url}):`, error);
      throw error;
    }
  }

  /**
   * Xử lý từ khóa tìm kiếm văn bản (Search Query) qua thuật toán so khớp YouTube
   * @param {string} query
   * @param {import('discord.js').User} requester
   */
  static async resolveSearchQuery(query, requester) {
    try {
      logger.info(`[Resolver] Đang tìm kiếm bài hát: "${query}"...`);

      const video = await this.searchBestYouTubeTrack(query);

      if (video && video.webpage_url) {
        const track = new Track({
          title: video.title,
          url: video.webpage_url,
          originalUrl: video.webpage_url,
          source: 'youtube',
          artist: video.uploader || 'YouTube Creator',
          duration: Track.formatDuration(video.duration || 0),
          durationSec: Number(video.duration) || 0,
          thumbnail: video.thumbnail || '',
          requestedBy: requester,
        });

        return { tracks: [track], isPlaylist: false, source: 'youtube' };
      }

      throw new Error(`Không tìm thấy kết quả nào phù hợp trên YouTube với từ khóa: "${query}"`);
    } catch (error) {
      logger.error(`[Resolver] Lỗi khi tìm kiếm từ khóa "${query}":`, error);
      throw error;
    }
  }
}

module.exports = MusicSourceResolver;
