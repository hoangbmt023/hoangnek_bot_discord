const { EmbedBuilder } = require('discord.js');

/**
 * EmbedBuilderUtility
 * Tuân thủ Single Responsibility Principle (SRP): Chuyên xây dựng các Embed Message trực quan.
 */
class EmbedBuilderUtility {
  /**
   * Bảng màu tối giản, hiện đại (1-2 tone màu chủ đạo)
   */
  static COLORS = {
    WELCOME: 0x5865f2, // Discord Blurple hiện đại, tinh tế
    LEAVE: 0x64748b,   // Slate Gray trầm ấm, lịch sự
  };

  /**
   * Tạo Embed chào mừng thành viên mới
   * @param {import('discord.js').GuildMember} member
   * @returns {EmbedBuilder}
   */
  static createWelcomeEmbed(member) {
    const { guild, user } = member;
    const memberCount = guild.memberCount;
    const userAvatar = user.displayAvatarURL({ dynamic: true, size: 256 });
    const guildIcon = guild.iconURL({ dynamic: true, size: 128 });
    const accountCreatedTimestamp = Math.floor(user.createdTimestamp / 1000);

    return new EmbedBuilder()
      .setColor(this.COLORS.WELCOME)
      .setAuthor({
        name: `${guild.name}`,
        iconURL: guildIcon || undefined,
      })
      .setTitle(`✦ CHÀO MỪNG THÀNH VIÊN MỚI`)
      .setDescription(
        `## Hân hạnh chào đón <@${user.id}>!\n` +
        `> Bạn đã là thành viên thứ **#${memberCount}** của **${guild.name}**.\n\n` +
        `**Chi tiết tài khoản:**\n` +
        `• **Người dùng:** \`${user.tag}\`\n` +
        `• **Ngày tham gia Discord:** <t:${accountCreatedTimestamp}:D> (<t:${accountCreatedTimestamp}:R>)`
      )
      .setThumbnail(userAvatar)
      .setFooter({
        text: `ID: ${user.id} • Chúc bạn có trải nghiệm tuyệt vời!`,
      })
      .setTimestamp();
  }

  /**
   * Tạo Embed thông báo thành viên rời server
   * @param {import('discord.js').GuildMember} member
   * @returns {EmbedBuilder}
   */
  static createLeaveEmbed(member) {
    const { guild, user } = member;
    const memberCount = guild.memberCount;
    const userAvatar = user.displayAvatarURL({ dynamic: true, size: 256 });
    const guildIcon = guild.iconURL({ dynamic: true, size: 128 });

    let joinedInfo = 'Không rõ';
    if (member.joinedTimestamp) {
      const joinedTimestamp = Math.floor(member.joinedTimestamp / 1000);
      joinedInfo = `<t:${joinedTimestamp}:D> (<t:${joinedTimestamp}:R>)`;
    }

    return new EmbedBuilder()
      .setColor(this.COLORS.LEAVE)
      .setAuthor({
        name: `${guild.name}`,
        iconURL: guildIcon || undefined,
      })
      .setTitle(`◈ THÀNH VIÊN RỜI SERVER`)
      .setDescription(
        `## Tạm biệt <@${user.id}>!\n` +
        `> **${user.tag}** vừa rời khỏi cộng đồng.\n\n` +
        `**Thông tin ghi nhận:**\n` +
        `• **Thời gian đã gắn bó:** ${joinedInfo}\n` +
        `• **Số lượng thành viên hiện tại:** \`${memberCount}\` người`
      )
      .setThumbnail(userAvatar)
      .setFooter({
        text: `ID: ${user.id} • Goodbye!`,
      })
      .setTimestamp();
  }
}

module.exports = EmbedBuilderUtility;
