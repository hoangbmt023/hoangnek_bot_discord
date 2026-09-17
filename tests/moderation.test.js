const RuleBasedDetector = require('../src/services/toxicity/RuleBasedDetector');
const warningStore = require('../src/services/warningStore');
const whitelistService = require('../src/services/whitelistService');
const guildSettingsService = require('../src/services/guildSettingsService');
const MODERATION_CONFIG = require('../src/config/moderation');

async function runTests() {
  console.log('🧪 Bắt đầu kiểm thử tính năng Lọc ngôn từ độc hại (3 nhãn Tiếng Việt)...\n');

  const detector = new RuleBasedDetector();

  // Test Case 1: Các câu TRONG SẠCH
  const cleanSamples = [
    'Video này hay quá',
    'Chào bạn, chúc một ngày tốt lành!',
    'Bot ơi cho mình hỏi luật server với',
    'Hôm nay thời tiết đẹp thật đấy',
  ];

  for (const text of cleanSamples) {
    const result = await detector.classify(text);
    if (result.label !== MODERATION_CONFIG.labels.CLEAN) {
      throw new Error(`❌ Test Failed: "${text}" mong đợi ${MODERATION_CONFIG.labels.CLEAN} nhưng nhận được ${result.label}`);
    }
    console.log(`✅ [${MODERATION_CONFIG.labels.CLEAN}] "${text}" ➔ ${result.label}`);
  }

  // Test Case 2: Các câu XÚC PHẠM (Chửi thề / Xúc phạm)
  const offensiveSamples = [
    'Mày ngu vãi',
    'vcl thế này mà cũng làm được à',
    'thằng chó này',
    'đm biến đi',
    'đồ rác rưởi ngu ngốc',
    'đồ ngu',
  ];

  for (const text of offensiveSamples) {
    const result = await detector.classify(text);
    if (result.label !== MODERATION_CONFIG.labels.OFFENSIVE) {
      throw new Error(`❌ Test Failed: "${text}" mong đợi ${MODERATION_CONFIG.labels.OFFENSIVE} nhưng nhận được ${result.label}`);
    }
    console.log(`✅ [${MODERATION_CONFIG.labels.OFFENSIVE}] "${text}" ➔ ${result.label} (Score: ${result.score})`);
  }

  // Test Case 3: Các câu THÙ GHÉT (Thù ghét cực đoan / Đe dọa / Phân biệt)
  const hateSamples = [
    'giết cả nhà mày bây giờ',
    'chết mẹ mày đi',
    'bắn chết cả họ mày',
    'bắc kỳ chó',
  ];

  for (const text of hateSamples) {
    const result = await detector.classify(text);
    if (result.label !== MODERATION_CONFIG.labels.HATE) {
      throw new Error(`❌ Test Failed: "${text}" mong đợi ${MODERATION_CONFIG.labels.HATE} nhưng nhận được ${result.label}`);
    }
    console.log(`✅ [${MODERATION_CONFIG.labels.HATE}] "${text}" ➔ ${result.label} (Score: ${result.score})`);
  }

  // Test Case 4: Kiểm tra WarningStore & Ngưỡng tích lũy
  console.log('\n🧪 Kiểm tra WarningStore & Tích lũy điểm phạt...');
  const guildId = 'test_guild_123';
  const userId = 'test_user_456';

  warningStore.resetWarnings(guildId, userId);
  let points = warningStore.getWarnings(guildId, userId);
  if (points !== 0) throw new Error('❌ Reset warning thất bại');

  // Thêm 1 lỗi XÚC PHẠM (+1)
  points = warningStore.addWarning(guildId, userId, MODERATION_CONFIG.warningPoints['XÚC PHẠM']);
  console.log(`1️⃣ Sau 1 lỗi XÚC PHẠM: ${points} cảnh cáo (Mong đợi: 1)`);
  if (points !== 1) throw new Error('❌ Cộng điểm XÚC PHẠM thất bại');

  // Thêm 1 lỗi THÙ GHÉT (+2) -> Tổng: 3 (Ngưỡng Timeout)
  points = warningStore.addWarning(guildId, userId, MODERATION_CONFIG.warningPoints['THÙ GHÉT']);
  console.log(`2️⃣ Sau 1 lỗi THÙ GHÉT (+2): ${points} cảnh cáo (Đạt ngưỡng TIMEOUT >= 3)`);
  if (points !== 3) throw new Error('❌ Cộng điểm THÙ GHÉT thất bại');

  // Thêm 1 lỗi THÙ GHÉT (+2) -> Tổng: 5 (Ngưỡng Kick)
  points = warningStore.addWarning(guildId, userId, MODERATION_CONFIG.warningPoints['THÙ GHÉT']);
  console.log(`3️⃣ Sau thêm 1 lỗi THÙ GHÉT (+2): ${points} cảnh cáo (Đạt ngưỡng KICK >= 5)`);
  if (points !== 5) throw new Error('❌ Đạt ngưỡng KICK thất bại');

  // Thêm 1 lỗi THÙ GHÉT (+2) -> Tổng: 7 (Ngưỡng Ban)
  points = warningStore.addWarning(guildId, userId, MODERATION_CONFIG.warningPoints['THÙ GHÉT']);
  console.log(`4️⃣ Sau thêm 1 lỗi THÙ GHÉT (+2): ${points} cảnh cáo (Đạt ngưỡng BAN >= 7)`);
  if (points !== 7) throw new Error('❌ Đạt ngưỡng BAN thất bại');

  // Test Case 5: Kiểm tra WhitelistService (Tính năng & Nhiều người dùng)
  console.log('\n🧪 Kiểm tra WhitelistService (Thêm nhiều user, Phân loại chức năng)...');
  whitelistService.clearList(guildId);
  if (whitelistService.isWhitelisted(guildId, userId)) throw new Error('❌ Whitelist ban đầu phải rỗng');

  // Test trích xuất User ID từ định dạng chuỗi hỗn hợp
  const rawInput = '<@111111111111111111>, <@!222222222222222222>, 333333333333333333';
  const extracted = whitelistService.extractUserIds(rawInput);
  if (extracted.length !== 3) throw new Error(`❌ Trích xuất user thất bại, nhận được ${extracted.length}`);
  console.log(`✅ Trích xuất thành công 3 User ID: ${extracted.join(', ')}`);

  // Thêm 3 users cho tính năng toxic
  const addRes = whitelistService.addUsers(guildId, rawInput, 'toxic');
  if (addRes.added.length !== 3) throw new Error('❌ Thêm nhiều user vào tính năng toxic thất bại');
  console.log(`✅ Đã thêm 3 user vào tính năng toxic`);

  // Kiểm tra miễn trừ toxic
  if (!whitelistService.isWhitelisted(guildId, '111111111111111111', 'toxic')) {
    throw new Error('❌ User 111111111111111111 phải được miễn trừ toxic');
  }

  // Thêm 1 user cho tính năng 'all'
  whitelistService.addUser(guildId, '999999999999999999', 'all');
  if (!whitelistService.isWhitelisted(guildId, '999999999999999999', 'toxic')) {
    throw new Error('❌ User có quyền all phải được miễn trừ cả toxic');
  }
  console.log(`✅ Kiểm tra quyền all bao quát thành công`);

  // Xóa bớt user
  const removeRes = whitelistService.removeUsers(guildId, '<@111111111111111111>, 222222222222222222', 'toxic');
  if (removeRes.removed.length !== 2) throw new Error('❌ Xóa nhiều user thất bại');
  console.log(`✅ Đã xóa 2 user khỏi tính năng toxic`);

  if (whitelistService.isWhitelisted(guildId, '111111111111111111', 'toxic')) {
    throw new Error('❌ User 111111111111111111 sau khi xóa không được còn trong Whitelist');
  }

  // Test Case 6: Kiểm tra Bật/Tắt tính năng của Bot (GuildSettingsService)
  console.log('\n🧪 Kiểm tra GuildSettingsService (Bật/Tắt tính năng)...');
  // Mặc định tính năng phải được BẬT
  if (!guildSettingsService.isFeatureEnabled(guildId, 'moderation')) {
    throw new Error('❌ Mặc định tính năng moderation phải được BẬT');
  }
  if (!guildSettingsService.isFeatureEnabled(guildId, 'welcome')) {
    throw new Error('❌ Mặc định tính năng welcome phải được BẬT');
  }
  console.log('✅ Trạng thái mặc định các tính năng: BẬT');

  // Thử TẮT tính năng moderation
  guildSettingsService.setFeatureState(guildId, 'moderation', false);
  if (guildSettingsService.isFeatureEnabled(guildId, 'moderation')) {
    throw new Error('❌ Tính năng moderation sau khi tắt phải trả về false');
  }
  console.log('✅ Đã tắt tính năng moderation thành công');

  // Thử Toggle tính năng moderation (từ false -> true)
  const toggleRes = guildSettingsService.toggleFeature(guildId, 'moderation');
  if (!toggleRes.enabled || !guildSettingsService.isFeatureEnabled(guildId, 'moderation')) {
    throw new Error('❌ Toggle moderation từ false sang true thất bại');
  }
  console.log('✅ Đã toggle bật lại tính năng moderation thành công');

  // Test Case 7: Kiểm tra Tạo Embed Trợ Giúp (/help) và HelpCommandHandler
  console.log('\n🧪 Kiểm tra Tạo Embed Trợ Giúp (/help) & HelpCommandHandler...');
  const EmbedBuilderUtility = require('../src/utils/embedBuilder');
  const helpCommandHandler = require('../src/services/helpCommandHandler');

  // Kiểm tra nhận diện lệnh trợ giúp
  if (!helpCommandHandler.isHelpCommand('!help')) throw new Error('❌ Không nhận diện được !help');
  if (!helpCommandHandler.isHelpCommand('!help whitelist')) throw new Error('❌ Không nhận diện được !help whitelist');
  if (!helpCommandHandler.isHelpCommand('/help feature')) throw new Error('❌ Không nhận diện được /help feature');
  if (helpCommandHandler.isHelpCommand('hello bot')) throw new Error('❌ Nhận diện sai câu chat thường thành lệnh help');

  // Kiểm tra 5 scope của createHelpEmbed
  const helpScopes = ['all', 'whitelist', 'feature', 'moderation', 'notifications'];
  for (const scope of helpScopes) {
    const embed = EmbedBuilderUtility.createHelpEmbed({ feature: scope });
    if (!embed.data.title || !embed.data.description) {
      throw new Error(`❌ createHelpEmbed cho scope "${scope}" thiếu title hoặc description`);
    }
    console.log(`✅ Help Embed [${scope}]: "${embed.data.title}"`);
  }

  console.log('\n🎉 TẤT CẢ CÁC BÀI KIỂM THỬ ĐÃ THÀNH CÔNG RỰC RỠ!');
}

runTests().catch((err) => {
  console.error('\n❌ Có lỗi xảy ra trong quá trình kiểm thử:', err);
  process.exit(1);
});


