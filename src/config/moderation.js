/**
 * Cấu hình hệ thống kiểm duyệt và lọc ngôn từ độc hại (Moderation Config)
 */
const MODERATION_CONFIG = {
  // Bật/tắt tính năng kiểm duyệt
  enabled: process.env.MODERATION_ENABLED !== 'false',

  // Các nhãn phân loại nội dung tiếng Việt
  labels: {
    CLEAN: 'TRONG SẠCH',
    OFFENSIVE: 'XÚC PHẠM',
    HATE: 'THÙ GHÉT',
  },

  // Tên hiển thị chi tiết thân thiện bằng tiếng Việt
  displayNames: {
    'TRONG SẠCH': 'Trong sạch / Hợp lệ',
    'XÚC PHẠM': 'Xúc phạm / Chửi thề',
    'THÙ GHÉT': 'Thù ghét / Độc hại nặng',
    'CLEAN': 'Trong sạch / Hợp lệ',
    'OFFENSIVE': 'Xúc phạm / Chửi thề',
    'HATE': 'Thù ghét / Độc hại nặng',
  },

  // Điểm cảnh cáo cộng thêm theo từng loại vi phạm
  warningPoints: {
    'TRONG SẠCH': 0,
    'XÚC PHẠM': 1,  // Xúc phạm nhẹ/vừa -> +1 cảnh cáo
    'THÙ GHÉT': 2,   // Thù ghét/độc hại nặng -> +2 cảnh cáo
    'CLEAN': 0,
    'OFFENSIVE': 1,
    'HATE': 2,
  },

  // Ngưỡng phạt tương ứng với số điểm cảnh cáo tích lũy
  thresholds: {
    timeout: 3, // >= 3 cảnh cáo: Phạt Timeout (Tạm khóa chat 10 phút)
    kick: 5,    // >= 5 cảnh cáo: Kick khỏi Server
    ban: 7,     // >= 7 cảnh cáo: Ban vĩnh viễn khỏi Server
  },

  // Thời gian phạt Timeout (10 phút = 10 * 60 * 1000 ms)
  timeoutDurationMs: 10 * 60 * 1000,

  // Thời gian điểm cảnh cáo tự động hết hạn (24 giờ)
  warningExpirationMs: 24 * 60 * 60 * 1000,

  // Tự động xóa tin nhắn vi phạm khỏi kênh công khai
  deleteViolatingMessage: true,

  // Gửi cảnh báo riêng tư (DM) cho người vi phạm kèm trích dẫn nội dung vi phạm
  sendDirectMessage: true,

  // Quyền miễn trừ kiểm duyệt (Bypass)
  bypassPermissions: [
    'Administrator',
    'ManageGuild',
    'ManageMessages',
  ],

  // ID kênh log kiểm duyệt nội bộ cho Admin/Mod (nếu có)
  modLogChannelId: process.env.MOD_LOG_CHANNEL_ID || '',
};

module.exports = Object.freeze(MODERATION_CONFIG);
