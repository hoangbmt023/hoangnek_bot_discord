const { Events } = require('discord.js');
const BaseEvent = require('../BaseEvent');
const memberNotificationService = require('../../services/memberNotificationService');

/**
 * GuildMemberAddEvent
 * Lắng nghe sự kiện thành viên mới tham gia vào Server.
 */
class GuildMemberAddEvent extends BaseEvent {
  constructor() {
    super(Events.GuildMemberAdd, false);
  }

  /**
   * @param {import('discord.js').GuildMember} member
   */
  async execute(member) {
    await memberNotificationService.handleMemberJoin(member);
  }
}

module.exports = GuildMemberAddEvent;
