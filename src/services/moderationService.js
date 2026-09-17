const MODERATION_CONFIG = require('../config/moderation');
const HybridToxicityDetector = require('./toxicity/HybridToxicityDetector');
const warningStore = require('./warningStore');
const whitelistService = require('./whitelistService');
const guildSettingsService = require('./guildSettingsService');
const EmbedBuilderUtility = require('../utils/embedBuilder');
const logger = require('../utils/logger');

/**
 * ModerationService
 * Dịch vụ kiểm duyệt tin nhắn tự động (Tuân thủ SRP & DIP)
 */
class ModerationService {
  /**
   * @param {object} [options]
   * @param {import('./toxicity/IToxicityDetector')} [options.detector]
   * @param {import('./warningStore')} [options.store]
   */
  constructor(options = {}) {
    this.detector = options.detector || new HybridToxicityDetector();
    this.warningStore = options.store || warningStore;
    this.isInitialized = false;
  }

  /**
   * Khởi tạo dịch vụ
   */
  async init() {
    if (this.isInitialized) return;
    if (typeof this.detector.init === 'function') {
      await this.detector.init();
    }
    this.isInitialized = true;
    logger.info('🛡️ [ModerationService] Dịch vụ lọc ngôn từ độc hại đã sẵn sàng.');
  }

  /**
   * Kiểm tra thành viên có quyền miễn trừ kiểm duyệt không
   * @param {import('discord.js').GuildMember} member
   * @returns {boolean}
   */
  hasBypassPermission(member) {
    if (!member || !member.permissions) return false;

    // Kiểm tra các quyền Administrator, ManageGuild, ManageMessages
    for (const permission of MODERATION_CONFIG.bypassPermissions) {
      if (member.permissions.has(permission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Xử lý kiểm duyệt một tin nhắn
   * @param {import('discord.js').Message} message
   */
  async handleMessage(message) {
    // 1. Bỏ qua nếu tính năng bị tắt toàn cục, hoặc bị tắt trong Server này, hoặc tin nhắn từ Bot / Webhook / DM
    if (!MODERATION_CONFIG.enabled) return;
    if (!message || message.author.bot || !message.guild || !message.member) return;
    if (!guildSettingsService.isFeatureEnabled(message.guild.id, 'moderation')) return;

    // 2. Bỏ qua nếu không có nội dung chữ
    const content = message.content ? message.content.trim() : '';
    if (!content) return;

    // 3. Bỏ qua nếu người dùng có quyền quản trị (Admin / Mod Bypass) hoặc nằm trong Whitelist
    if (this.hasBypassPermission(message.member) || whitelistService.isWhitelisted(message.guild.id, message.author.id, 'toxic')) {
      return;
    }

    try {
      // 4. Phân loại nội dung tin nhắn bằng Model / Heuristic
      const result = await this.detector.classify(content);
      if (!result || result.label === MODERATION_CONFIG.labels.CLEAN) {
        return; // Tin nhắn trong sạch -> Cho qua
      }

      const { label } = result;
      const pointsAdded = MODERATION_CONFIG.warningPoints[label] || 1;

      // 5. Cộng điểm cảnh cáo
      const totalWarnings = this.warningStore.addWarning(
        message.guild.id,
        message.author.id,
        pointsAdded,
        {
          label,
          content: content.slice(0, 100),
        }
      );

      logger.warn(
        `[Moderation] Phát hiện ${message.author.tag} (${message.author.id}) dùng từ [${label}] ` +
        `tại kênh #${message.channel.name}. (+${pointsAdded} cảnh cáo -> Tổng: ${totalWarnings})`
      );

      // 6. Quyết định hình phạt theo ngưỡng tích lũy
      let actionTaken = 'NONE';
      const thresholds = MODERATION_CONFIG.thresholds;

      if (totalWarnings >= thresholds.ban) {
        actionTaken = 'BAN';
      } else if (totalWarnings >= thresholds.kick) {
        actionTaken = 'KICK';
      } else if (totalWarnings >= thresholds.timeout) {
        actionTaken = 'TIMEOUT';
      }

      // 7. Xóa ngay tin nhắn vi phạm khỏi kênh công khai để người khác không nhìn thấy
      if (MODERATION_CONFIG.deleteViolatingMessage && message.deletable) {
        await message.delete().catch((err) => {
          logger.warn(`[Moderation] Không thể xóa tin nhắn vi phạm: ${err.message}`);
        });
      }

      // 8. Thực thi hình phạt trên thành viên
      await this.executePenalty(message.member, actionTaken, totalWarnings, label);

      // 9. Tạo Embed cảnh cáo tiếng Việt
      const warningEmbed = EmbedBuilderUtility.createModerationWarningEmbed({
        user: message.author,
        label,
        pointsAdded,
        totalWarnings,
        actionTaken,
        violatedContent: content,
      });

      // 10. Gửi cảnh báo riêng tư (DM) cho người vi phạm (kèm trích dẫn nội dung họ vừa nhắn)
      let dmSent = false;
      if (MODERATION_CONFIG.sendDirectMessage) {
        try {
          await message.author.send({
            content: `**[Thông Báo Vi Phạm Quy Chuẩn Ngôn Từ từ Server ${message.guild.name}]**`,
            embeds: [warningEmbed],
          });
          dmSent = true;
          logger.info(`[Moderation] Đã gửi cảnh báo riêng qua DM cho ${message.author.tag}`);
        } catch (err) {
          logger.warn(`[Moderation] Không thể gửi DM cho ${message.author.tag} (người dùng tắt DM): ${err.message}`);
        }
      }

      // 11. Nếu người dùng tắt DM -> gửi thông báo ngắn trong kênh và tự xóa sau 4 giây
      if (!dmSent) {
        const tempMsg = await message.channel.send({
          content: `⚠️ <@${message.author.id}>, tin nhắn của bạn đã bị xóa do vi phạm quy tắc ngôn từ (\`${label}\`). Vui lòng kiểm tra lại!`,
        }).catch(() => {});

        if (tempMsg) {
          setTimeout(() => {
            tempMsg.delete().catch(() => {});
          }, 4000);
        }
      }
    } catch (error) {
      logger.error('[ModerationService] Lỗi khi xử lý kiểm duyệt tin nhắn:', error);
    }
  }

  /**
   * Thực thi hình phạt lên thành viên
   * @param {import('discord.js').GuildMember} member
   * @param {'NONE'|'TIMEOUT'|'KICK'|'BAN'} action
   * @param {number} totalWarnings
   * @param {string} label
   */
  async executePenalty(member, action, totalWarnings, label) {
    const reason = `Tự động kiểm duyệt: Tích lũy ${totalWarnings} điểm cảnh cáo (${label})`;

    try {
      if (action === 'TIMEOUT') {
        if (member.moderatable) {
          await member.timeout(MODERATION_CONFIG.timeoutDurationMs, reason);
          logger.info(`[Moderation] Đã Timeout thành viên ${member.user.tag} trong 10 phút.`);
        } else {
          logger.warn(`[Moderation] Bot không đủ quyền để Timeout thành viên ${member.user.tag}.`);
        }
      } else if (action === 'KICK') {
        if (member.kickable) {
          await member.kick(reason);
          logger.info(`[Moderation] Đã Kick thành viên ${member.user.tag}.`);
        } else {
          logger.warn(`[Moderation] Bot không đủ quyền để Kick thành viên ${member.user.tag}.`);
        }
      } else if (action === 'BAN') {
        if (member.bannable) {
          await member.ban({ reason });
          logger.info(`[Moderation] Đã Ban vĩnh viễn thành viên ${member.user.tag}.`);
        } else {
          logger.warn(`[Moderation] Bot không đủ quyền để Ban thành viên ${member.user.tag}.`);
        }
      }
    } catch (err) {
      logger.error(`[Moderation] Lỗi khi thực thi hình phạt ${action} lên ${member.user.tag}:`, err);
    }
  }
}

module.exports = new ModerationService();
