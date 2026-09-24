const { Events } = require('discord.js');
const BaseEvent = require('../BaseEvent');
const memberNotificationService = require('../../services/notifications/memberNotificationService');

/**
 * GuildMemberRemoveEvent
 * Lắng nghe sự kiện thành viên rời khỏi Server (hoặc bị kick/ban).
 */
class GuildMemberRemoveEvent extends BaseEvent {
  constructor() {
    super(Events.GuildMemberRemove, false);
  }

  /**
   * @param {import('discord.js').GuildMember} member
   */
  async execute(member) {
    await memberNotificationService.handleMemberLeave(member);
  }
}

module.exports = GuildMemberRemoveEvent;
