const assert = require('assert');
const channelSetupService = require('../src/services/channelSetupService');
const setupCommandHandler = require('../src/services/setupCommandHandler');
const musicCommandHandler = require('../src/services/musicCommandHandler');
const helpCommandHandler = require('../src/services/helpCommandHandler');
const Track = require('../src/music/Track');
const MusicSourceResolver = require('../src/music/MusicSourceResolver');
const EmbedBuilderUtility = require('../src/utils/embedBuilder');

async function runTests() {
  console.log('🧪 Bắt đầu kiểm thử tính năng Cấu hình Kênh và Hệ thống Âm nhạc...\n');

  const testGuildId = 'test-guild-12345';
  const testChannel1 = '111222333444555666';
  const testChannel2 = '222333444555666777';

  // 1. Kiểm thử ChannelSetupService
  console.log('--- 1. Kiểm thử ChannelSetupService ---');

  // Xóa sạch cấu hình cũ trước khi test
  channelSetupService.clearChannels(testGuildId, 'all');

  // Mặc định: Chưa cấu hình kênh nào -> bị từ chối
  const defaultCheck = channelSetupService.isChannelAllowed(testGuildId, testChannel1, 'music');
  assert.strictEqual(defaultCheck.allowed, false, 'Mặc định chưa cấu hình kênh phải trả về false');
  assert.strictEqual(defaultCheck.reason, 'NO_CHANNELS_CONFIGURED');
  console.log('✅ [Pass] Mặc định từ chối khi chưa cấu hình kênh nào.');

  // Thêm kênh phát nhạc
  const addRes = channelSetupService.addChannel(testGuildId, testChannel1, 'music');
  assert.strictEqual(addRes.added, true);
  assert.strictEqual(addRes.type, 'music');

  const checkAllowed = channelSetupService.isChannelAllowed(testGuildId, testChannel1, 'music');
  assert.strictEqual(checkAllowed.allowed, true);
  console.log('✅ [Pass] Cho phép kênh hợp lệ sau khi setup add.');

  // Kênh khác chưa thêm -> bị từ chối với lý do CHANNEL_NOT_ALLOWED
  const checkUnallowed = channelSetupService.isChannelAllowed(testGuildId, testChannel2, 'music');
  assert.strictEqual(checkUnallowed.allowed, false);
  assert.strictEqual(checkUnallowed.reason, 'CHANNEL_NOT_ALLOWED');
  console.log('✅ [Pass] Từ chối kênh không nằm trong danh sách cấp phép.');

  // Xóa kênh
  const remRes = channelSetupService.removeChannel(testGuildId, testChannel1, 'music');
  assert.strictEqual(remRes.removed, true);
  const checkAfterRem = channelSetupService.isChannelAllowed(testGuildId, testChannel1, 'music');
  assert.strictEqual(checkAfterRem.allowed, false);
  console.log('✅ [Pass] Xóa quyền kênh thành công.');

  // 2. Kiểm thử Track
  console.log('\n--- 2. Kiểm thử Track Class ---');
  const track = new Track({
    title: 'Test Song',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    source: 'youtube',
    artist: 'Rick Astley',
    duration: '03:33',
    durationSec: 213,
  });
  assert.strictEqual(track.title, 'Test Song');
  assert.strictEqual(track.artist, 'Rick Astley');
  assert.strictEqual(Track.formatDuration(213), '03:33');
  assert.strictEqual(Track.formatDuration(3665), '1:01:05');
  assert.strictEqual(Track.formatDuration(0), '00:00');
  console.log('✅ [Pass] Khởi tạo Track và định dạng thời lượng chính xác.');

  // 3. Kiểm thử MusicSourceResolver
  console.log('\n--- 3. Kiểm thử MusicSourceResolver ---');
  assert.strictEqual(MusicSourceResolver.isUrl('https://youtube.com/watch?v=123'), true);
  assert.strictEqual(MusicSourceResolver.isUrl('http://example.com/song.mp3'), true);
  assert.strictEqual(MusicSourceResolver.isUrl('tên bài hát tiếng việt'), false);
  assert.strictEqual(MusicSourceResolver.isDirectAudioUrl('https://example.com/audio/song.mp3?token=abc'), true);
  assert.strictEqual(MusicSourceResolver.isDirectAudioUrl('https://example.com/audio/song.flac'), true);
  assert.strictEqual(MusicSourceResolver.isDirectAudioUrl('https://example.com/index.html'), false);
  console.log('✅ [Pass] Kiểm tra URL và Direct Audio URL hoạt động chuẩn xác.');

  // Kiểm tra từ chối các URL không hỗ trợ (Facebook, TikTok, v.v.)
  try {
    await MusicSourceResolver.resolve('https://unsupported-site.com/something', { tag: 'TestUser' });
    assert.fail('Phải ném lỗi từ chối link không hỗ trợ');
  } catch (err) {
    assert(err.message.includes('Link không được hỗ trợ'));
    console.log('✅ [Pass] Đã từ chối URL không thuộc danh sách hỗ trợ đúng như yêu cầu.');
  }

  // Kiểm tra nhận diện link Spotify
  assert.strictEqual(MusicSourceResolver.isSpotifyUrl('https://open.spotify.com/intl-vi/track/6We0OS95Zrwf2kQgFBLZ65'), true);
  console.log('✅ [Pass] Nhận diện link Spotify chính xác.');

  // Kiểm tra xử lý Search Query bằng tên bài hát
  const searchRes = await MusicSourceResolver.resolve('Đừng làm trái tim anh đau', { tag: 'TestUser' });
  assert.strictEqual(searchRes.tracks.length > 0, true);
  assert(searchRes.tracks[0].url.startsWith('http'));
  assert(searchRes.tracks[0].title.length > 0);
  console.log(`✅ [Pass] Tìm bài hát theo tên thành công: "${searchRes.tracks[0].title}" (${searchRes.tracks[0].url})`);

  // Kiểm tra xử lý Album Spotify ưu tiên khớp Album Playlist trên YouTube
  const albumRes = await MusicSourceResolver.resolve('https://open.spotify.com/album/2fqk3kixhLLCX1AJ8h8ba4', { tag: 'TestUser' });
  assert.strictEqual(albumRes.isPlaylist, true);
  assert(albumRes.tracks.length >= 10);
  assert(albumRes.tracks[0].url.startsWith('http'));
  console.log(`✅ [Pass] Nạp nhanh Album Spotify thành công: "${albumRes.playlistName}" (${albumRes.tracks.length} bài hát)`);

  // 4. Kiểm thử Command Handlers Prefix
  console.log('\n--- 4. Kiểm thử Command Handlers Prefix ---');
  assert.strictEqual(setupCommandHandler.isSetupCommand('s!setup add #music'), true);
  assert.strictEqual(setupCommandHandler.isSetupCommand('s!channel list'), true);
  assert.strictEqual(setupCommandHandler.isSetupCommand('hello bot'), false);
  assert.strictEqual(setupCommandHandler.extractChannelId('<#123456789012345678>'), '123456789012345678');
  assert.strictEqual(setupCommandHandler.extractChannelId('123456789012345678'), '123456789012345678');

  assert.strictEqual(musicCommandHandler.isMusicCommand('s!play never gonna give you up'), true);
  assert.strictEqual(musicCommandHandler.isMusicCommand('s!p some song'), true);
  assert.strictEqual(musicCommandHandler.isMusicCommand('s!skip'), true);
  assert.strictEqual(musicCommandHandler.isMusicCommand('s!pause'), true);
  assert.strictEqual(musicCommandHandler.isMusicCommand('s!resume'), true);
  assert.strictEqual(musicCommandHandler.isMusicCommand('s!queue'), true);
  assert.strictEqual(musicCommandHandler.isMusicCommand('s!np'), true);
  assert.strictEqual(musicCommandHandler.isMusicCommand('s!volume 80'), true);
  assert.strictEqual(musicCommandHandler.isMusicCommand('s!loop track'), true);
  assert.strictEqual(musicCommandHandler.isMusicCommand('s!leave'), true);

  assert.strictEqual(helpCommandHandler.isHelpCommand('s!help music'), true);
  assert.strictEqual(helpCommandHandler.isHelpCommand('s!h'), true);
  assert.strictEqual(helpCommandHandler.isHelpCommand('!help'), true);
  console.log('✅ [Pass] Bộ nhận diện lệnh Prefix (s!) hoạt động hoàn hảo.');

  // Kiểm tra cấu trúc Slash Command tinh gọn (/setup, /music, /help)
  const { getSlashCommandsData } = require('../src/commands/slashCommands');
  const slashData = getSlashCommandsData();
  assert.strictEqual(slashData.length, 3, 'Chỉ đăng ký đúng 3 Slash Commands: /setup, /music, /help');
  const setupCmd = slashData.find((c) => c.name === 'setup');
  assert(setupCmd, 'Slash Command /setup phải tồn tại');
  assert.strictEqual(setupCmd.options.length, 3, '/setup phải có 3 Subcommand Groups (channel, whitelist, feature)');
  
  const groupNames = setupCmd.options.map((o) => o.name);
  assert(groupNames.includes('channel'), 'Nhóm channel phải tồn tại trong /setup');
  assert(groupNames.includes('whitelist'), 'Nhóm whitelist phải tồn tại trong /setup');
  assert(groupNames.includes('feature'), 'Nhóm feature phải tồn tại trong /setup');
  console.log('✅ [Pass] Cấu trúc Slash Command /setup với 3 Subcommand Groups (channel, whitelist, feature) chuẩn xác.');

  // 5. Kiểm thử Embed UI (Searching & Queue Pagination)
  console.log('\n--- 5. Kiểm thử Embed UI (Searching & Queue Pagination) ---');
  const searchingEmbed = EmbedBuilderUtility.createSearchingEmbed({
    query: 'Sơn Tùng M-TP',
    user: { tag: 'Tester#1234' },
  });
  assert.strictEqual(searchingEmbed.data.color, 0x5865f2);
  assert(searchingEmbed.data.description.includes('Sơn Tùng M-TP'));
  assert(searchingEmbed.data.description.includes('Tester#1234'));
  console.log('✅ [Pass] Embed Đang Tìm Kiếm (Searching UI) hiển thị chuẩn đẹp Blurple.');

  const mockQueue = {
    guild: { name: 'Test Guild' },
    currentTrack: { title: 'Track 1', url: 'https://youtube.com/watch?v=1', duration: '03:30', requestedBy: { tag: 'User1' } },
    tracks: Array.from({ length: 15 }, (_, i) => ({
      title: `Song ${i + 1}`,
      url: `https://youtube.com/watch?v=${i + 1}`,
      duration: '03:00',
    })),
    loopMode: 'off',
    volume: 80,
  };
  const queuePage1 = EmbedBuilderUtility.createQueueEmbed({ queue: mockQueue, page: 1 });
  assert(queuePage1.data.title.includes('Trang 1/2'));
  const queuePage2 = EmbedBuilderUtility.createQueueEmbed({ queue: mockQueue, page: 2 });
  assert(queuePage2.data.title.includes('Trang 2/2'));
  console.log('✅ [Pass] Phân trang Embed Hàng Đợi (Queue Pagination) hoạt động chuẩn xác.');

  // Dọn dẹp dữ liệu test
  channelSetupService.clearChannels(testGuildId, 'all');

  console.log('\n🎉 Toàn bộ bài kiểm thử Cấu hình Kênh và Âm nhạc đã THÀNH CÔNG!');
}

runTests().catch((err) => {
  console.error('\n❌ Test Thất Bại:', err);
  process.exit(1);
});
