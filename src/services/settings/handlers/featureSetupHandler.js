const featureCommandHandler = require('../featureCommandHandler');

/**
 * FeatureSetupHandler
 * Điều phối cấu hình Bật/Tắt tính năng trong Server (!setup feature enable/disable/status)
 */
class FeatureSetupHandler {
  /**
   * @param {import('discord.js').Message} message
   * @param {string} action
   * @param {string} feature
   * @param {string[]} actionArgs
   */
  async handle(message, action, feature, actionArgs) {
    const featName = actionArgs[0] || feature;
    const featureContent = `!setup feature ${action} ${featName}`.trim();
    const fakeMsg = Object.assign(Object.create(message), { content: featureContent });
    return await featureCommandHandler.handleCommand(fakeMsg);
  }
}

module.exports = new FeatureSetupHandler();
