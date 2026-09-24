const embeds = require('./embeds');

/**
 * EmbedBuilderUtility (Facade Pattern)
 * Tuân thủ Single Responsibility Principle (SRP) & Open/Closed Principle (OCP):
 * Gom nhóm và chuyển tiếp lời gọi đến các sub-modules chuyên biệt trong `src/utils/embeds/`.
 */
class EmbedBuilderUtility {
  static COLORS = embeds.COLORS;

  // 1. Notifications
  static createWelcomeEmbed(member) {
    return embeds.createWelcomeEmbed(member);
  }

  static createLeaveEmbed(member) {
    return embeds.createLeaveEmbed(member);
  }

  // 2. Moderation & Whitelist
  static createModerationWarningEmbed(params) {
    return embeds.createModerationWarningEmbed(params);
  }

  static createWhitelistResponseEmbed(params) {
    return embeds.createWhitelistResponseEmbed(params);
  }

  static createWhitelistPaginationRow(params) {
    return embeds.createWhitelistPaginationRow(params);
  }

  // 3. Settings & Server Setup
  static createFeatureToggleResponseEmbed(params) {
    return embeds.createFeatureToggleResponseEmbed(params);
  }

  static createAISetupResponseEmbed(params) {
    return embeds.createAISetupResponseEmbed(params);
  }

  static createKnowledgeSetupResponseEmbed(params) {
    return embeds.createKnowledgeSetupResponseEmbed(params);
  }

  static createChannelSetupResponseEmbed(params) {
    return embeds.createChannelSetupResponseEmbed(params);
  }

  static createNotificationSetupResponseEmbed(params) {
    return embeds.createNotificationSetupResponseEmbed(params);
  }

  // 4. Help Guide
  static createHelpEmbed(params) {
    return embeds.createHelpEmbed(params);
  }

  // 5. Music Player
  static createNowPlayingEmbed(params) {
    return embeds.createNowPlayingEmbed(params);
  }

  static createTrackAddedEmbed(params) {
    return embeds.createTrackAddedEmbed(params);
  }

  static createPlaylistAddedEmbed(params) {
    return embeds.createPlaylistAddedEmbed(params);
  }

  static createSearchingEmbed(params) {
    return embeds.createSearchingEmbed(params);
  }

  static createQueueEmbed(params) {
    return embeds.createQueueEmbed(params);
  }

  static createMusicStatusEmbed(params) {
    return embeds.createMusicStatusEmbed(params);
  }

  static createMusicControlRows(params) {
    return embeds.createMusicControlRows(params);
  }

  static createQueuePaginationRow(params) {
    return embeds.createQueuePaginationRow(params);
  }

  // 6. AI Assistant
  static createAIThinkingEmbed(params) {
    return embeds.createAIThinkingEmbed(params);
  }

  static createAIAnswerEmbed(params) {
    return embeds.createAIAnswerEmbed(params);
  }

  static createAIErrorEmbed(params) {
    return embeds.createAIErrorEmbed(params);
  }
}

module.exports = EmbedBuilderUtility;
