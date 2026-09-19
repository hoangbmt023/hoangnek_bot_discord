const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { config } = require('../config/env');
const guildSettingsService = require('./guildSettingsService');
const EmbedBuilderUtility = require('../utils/embedBuilder');
const logger = require('../utils/logger');

/**
 * MemberNotificationService
 * Chịu trách nhiệm gửi thông báo khi thành viên tham gia hoặc rời server.
 * Tuân thủ Dependency Inversion và Single Responsibility.
 */
class MemberNotificationService {
  /**
   * Tìm kênh nhận thông báo phù hợp cho từng Server:
   * 1. Kênh tùy chỉnh đã cấu hình trong guildSettingsService
   * 2. Kênh hệ thống mặc định (guild.systemChannel)
   * 3. Kênh văn bản đầu tiên mà bot có quyền gửi tin nhắn & nhúng link
   * @param {import('discord.js').Guild} guild
   * @param {'welcome' | 'leave'} type - Loại thông báo
   * @returns {import('discord.js').TextChannel | null}
   */
  resolveNotificationChannel(guild, type = 'welcome') {
    if (!guild) return null;

    // 1. Kiểm tra kênh tùy chỉnh đã được cấu hình cho Server qua lệnh /setup notify
    const customChannelId = guildSettingsService.getNotificationChannel(guild.id, type);

    if (customChannelId) {
      const channel = guild.channels.cache.get(customChannelId);
      if (channel && channel.isTextBased()) {
        return channel;
      }
      logger.warn(
        `Không tìm thấy kênh thông báo [${type.toUpperCase()}] cấu hình sẵn với ID: ${customChannelId} trong server "${guild.name}". Đang dùng kênh mặc định.`
      );
    }

    // 2. Mặc định: Dùng System Channel của Server (Kênh hệ thống)
    if (guild.systemChannel && guild.systemChannel.isTextBased()) {
      return guild.systemChannel;
    }

    // 3. Fallback: Tìm kênh text đầu tiên mà bot có đủ quyền gửi tin nhắn
    const defaultTextChannel = guild.channels.cache.find(
      (ch) =>
        ch.type === ChannelType.GuildText &&
        ch.permissionsFor(guild.client.user)?.has([
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks,
        ])
    );

    return defaultTextChannel || null;
  }

  /**
   * Kiểm tra quyền gửi tin nhắn của bot tại kênh
   * @param {import('discord.js').TextChannel} channel
   * @returns {boolean}
   */
  hasRequiredPermissions(channel) {
    const botUser = channel.client.user;
    const permissions = channel.permissionsFor(botUser);
    if (!permissions) {
      logger.warn(`Không thể lấy quyền của Bot tại kênh #${channel.name}`);
      return false;
    }

    const requiredPermissions = [
      { flag: PermissionFlagsBits.ViewChannel, name: 'ViewChannel (Xem kênh)' },
      { flag: PermissionFlagsBits.SendMessages, name: 'SendMessages (Gửi tin nhắn)' },
      { flag: PermissionFlagsBits.EmbedLinks, name: 'EmbedLinks (Nhúng liên kết)' },
    ];

    const missing = requiredPermissions
      .filter((p) => !permissions.has(p.flag))
      .map((p) => p.name);

    if (missing.length > 0) {
      logger.warn(
        `Bot thiếu các quyền sau tại kênh #${channel.name} (${channel.id}): [${missing.join(', ')}]. ` +
        `Vui lòng vào Cài đặt kênh -> Quyền hạn -> Cấp các quyền trên cho Bot.`
      );
      return false;
    }

    return true;
  }

  /**
   * Xử lý thông báo khi có thành viên mới vào server
   * @param {import('discord.js').GuildMember} member
   */
  async handleMemberJoin(member) {
    try {
      const { guild, user } = member;
      // Kiểm tra tính năng chào mừng có đang bật trong Server không
      if (!guildSettingsService.isFeatureEnabled(guild.id, 'welcome')) {
        logger.debug(`Tính năng chào mừng đang TẮT trong Server "${guild.name}", bỏ qua.`);
        return;
      }

      logger.info(`Thành viên mới tham gia server "${guild.name}": ${user.tag} (${user.id})`);

      const channel = this.resolveNotificationChannel(guild, 'welcome');
      if (!channel) {
        logger.warn(`Không tìm thấy kênh hợp lệ để gửi thông báo chào mừng trong server "${guild.name}"`);
        return;
      }

      if (!this.hasRequiredPermissions(channel)) {
        logger.warn(`Bot không đủ quyền tại kênh #${channel.name}`);
        return;
      }

      const welcomeEmbed = EmbedBuilderUtility.createWelcomeEmbed(member);
      await channel.send({ embeds: [welcomeEmbed] });

      logger.success(`Đã gửi thông báo chào mừng ${user.tag} vào kênh #${channel.name}`);
    } catch (error) {
      logger.error('Lỗi trong quá trình gửi thông báo chào mừng thành viên:', error);
    }
  }

  /**
   * Xử lý thông báo khi có thành viên rời khỏi server
   * @param {import('discord.js').GuildMember} member
   */
  async handleMemberLeave(member) {
    try {
      const { guild, user } = member;
      // Kiểm tra tính năng thông báo rời đi có đang bật trong Server không
      if (!guildSettingsService.isFeatureEnabled(guild.id, 'leave')) {
        logger.debug(`Tính năng tạm biệt đang TẮT trong Server "${guild.name}", bỏ qua.`);
        return;
      }

      logger.info(`Thành viên đã rời khỏi server "${guild.name}": ${user.tag} (${user.id})`);

      const channel = this.resolveNotificationChannel(guild, 'leave');
      if (!channel) {
        logger.warn(`Không tìm thấy kênh hợp lệ để gửi thông báo tạm biệt trong server "${guild.name}"`);
        return;
      }

      if (!this.hasRequiredPermissions(channel)) {
        logger.warn(`Bot không đủ quyền tại kênh #${channel.name}`);
        return;
      }

      const leaveEmbed = EmbedBuilderUtility.createLeaveEmbed(member);
      await channel.send({ embeds: [leaveEmbed] });

      logger.success(`Đã gửi thông báo thành viên ${user.tag} rời server vào kênh #${channel.name}`);
    } catch (error) {
      logger.error('Lỗi trong quá trình gửi thông báo thành viên rời server:', error);
    }
  }
}

// Export singleton instance
module.exports = new MemberNotificationService();
