const assert = require('assert');
const EmbedBuilderUtility = require('../src/utils/embedBuilder');
const musicButtonHandler = require('../src/services/musicButtonHandler');
const MusicManager = require('../src/music/MusicManager');
const Track = require('../src/music/Track');

console.log('🧪 Bắt đầu kiểm thử Nút điều khiển âm nhạc & Phân trang tương tác...');

// 1. Kiểm thử tạo ActionRow điều khiển Player
const mockQueue = {
  guild: { id: 'test_guild_btn', name: 'Test Guild' },
  isPaused: () => false,
  loopMode: 'off',
  volume: 80,
  tracks: [
    new Track({ title: 'Song 1', url: 'https://youtube.com/watch?v=111' }),
    new Track({ title: 'Song 2', url: 'https://youtube.com/watch?v=222' }),
  ],
  currentTrack: new Track({ title: 'Playing Song', url: 'https://youtube.com/watch?v=000' }),
};

const rows = EmbedBuilderUtility.createMusicControlRows({ queue: mockQueue });
assert.strictEqual(rows.length, 2, 'Cần có đúng 2 ActionRow cho điều khiển nhạc');

const row1Buttons = rows[0].components;
assert.strictEqual(row1Buttons.length, 5, 'Row 1 cần có 5 nút: Pause/Resume, Skip, Stop, Shuffle, Queue');
assert.strictEqual(row1Buttons[0].data.custom_id, 'music_pause_resume');
assert.strictEqual(row1Buttons[1].data.custom_id, 'music_skip');
assert.strictEqual(row1Buttons[2].data.custom_id, 'music_stop');
assert.strictEqual(row1Buttons[3].data.custom_id, 'music_shuffle');
assert.strictEqual(row1Buttons[4].data.custom_id, 'music_queue');

const row2Buttons = rows[1].components;
assert.strictEqual(row2Buttons.length, 3, 'Row 2 cần có 3 nút: Vol Down, Vol Up, Loop');
assert.strictEqual(row2Buttons[0].data.custom_id, 'music_vol_down');
assert.strictEqual(row2Buttons[1].data.custom_id, 'music_vol_up');
assert.strictEqual(row2Buttons[2].data.custom_id, 'music_loop');

console.log('✅ [Pass] Tạo ActionRows điều khiển Player thành công với đầy đủ 8 nút bấm.');

// 2. Kiểm thử tạo ActionRow phân trang Hàng đợi (Queue Pagination)
const pageRow = EmbedBuilderUtility.createQueuePaginationRow({ currentPage: 2, totalPages: 5 });
assert.strictEqual(pageRow.components.length, 5, 'Hàng phân trang cần có 5 nút (Đầu, Trước, Trang X/Y, Sau, Cuối)');
assert.strictEqual(pageRow.components[0].data.custom_id, 'queue_page_first');
assert.strictEqual(pageRow.components[1].data.custom_id, 'queue_page_prev_1');
assert.strictEqual(pageRow.components[3].data.custom_id, 'queue_page_next_3');
assert.strictEqual(pageRow.components[4].data.custom_id, 'queue_page_last_5');

console.log('✅ [Pass] Tạo ActionRow phân trang Hàng đợi (Queue Pagination) chuẩn xác.');

// 3. Kiểm thử nhận diện CustomId trong MusicButtonHandler
assert.strictEqual(musicButtonHandler.isMusicButton('music_pause_resume'), true);
assert.strictEqual(musicButtonHandler.isMusicButton('music_skip'), true);
assert.strictEqual(musicButtonHandler.isMusicButton('queue_page_next_2'), true);
assert.strictEqual(musicButtonHandler.isMusicButton('other_button'), false);

console.log('✅ [Pass] Nhận diện custom_id của hệ thống âm nhạc chính xác.');

// 4. Kiểm thử xử lý tương tác Nút bấm Shuffle, Loop, Volume
let loopChanged = '';
let volChanged = 0;
let shuffleCalled = false;

const testQueue = {
  guild: { id: 'test_guild_btn', name: 'Test Guild' },
  voiceChannel: { id: 'voice_123' },
  isPaused: () => false,
  loopMode: 'off',
  volume: 80,
  tracks: [new Track({ title: 'Song A', url: 'https://youtube.com/watch?v=aaa' })],
  currentTrack: new Track({ title: 'Playing Song', url: 'https://youtube.com/watch?v=000' }),
  setLoopMode: (mode) => { loopChanged = mode; testQueue.loopMode = mode; },
  setVolume: (vol) => { volChanged = vol; testQueue.volume = vol; },
  shuffle: () => { shuffleCalled = true; },
};

MusicManager.queues.set('test_guild_btn', testQueue);

(async () => {
  // Mock button interaction
  let replyData = null;
  let updateData = null;
  let followUpData = null;

  const mockInteraction = {
    customId: 'music_vol_up',
    guildId: 'test_guild_btn',
    member: { voice: { channel: { id: 'voice_123' } } },
    user: { id: 'user_123', tag: 'Tester#0001' },
    message: { editable: true },
    reply: async (data) => { replyData = data; },
    update: async (data) => { updateData = data; },
    followUp: async (data) => { followUpData = data; },
    deferUpdate: async () => {},
  };

  // Test Vol Up
  await musicButtonHandler.handleButtonInteraction(mockInteraction);
  assert.strictEqual(testQueue.volume, 90, 'Âm lượng phải tăng từ 80 lên 90%');

  // Test Loop
  mockInteraction.customId = 'music_loop';
  await musicButtonHandler.handleButtonInteraction(mockInteraction);
  assert.strictEqual(testQueue.loopMode, 'track', 'Chế độ lặp phải chuyển từ off sang track');

  // Test Shuffle
  mockInteraction.customId = 'music_shuffle';
  await musicButtonHandler.handleButtonInteraction(mockInteraction);
  assert.strictEqual(shuffleCalled, true, 'Shuffle phải được gọi');

  MusicManager.queues.delete('test_guild_btn');
  console.log('✅ [Pass] Toàn bộ logic tương tác Nút bấm âm nhạc hoạt động xuất sắc!');
})();
