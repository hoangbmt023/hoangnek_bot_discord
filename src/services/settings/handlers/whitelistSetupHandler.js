const whitelistCommandHandler = require('../../moderation/whitelistCommandHandler');

/**
 * WhitelistSetupHandler
 * Điều phối cấu hình Whitelist danh sách trắng trong Server (!setup whitelist add/remove/list/clear)
 */
class WhitelistSetupHandler {
  /**
   * @param {import('discord.js').Message} message
   * @param {string} action
   * @param {string} feature
   * @param {string[]} actionArgs
   */
  async handle(message, action, feature, actionArgs) {
    const wlFeat = feature === 'moderation' ? 'toxic' : feature;
    const wlContent = `!setup whitelist ${action} ${wlFeat} ${actionArgs.join(' ')}`.trim();
    const fakeMsg = Object.assign(Object.create(message), { content: wlContent });
    return await whitelistCommandHandler.handleCommand(fakeMsg);
  }
}

module.exports = new WhitelistSetupHandler();
