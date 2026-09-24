const { COLORS } = require('./colors');
const {
  createWelcomeEmbed,
  createLeaveEmbed,
} = require('./notificationEmbeds');
const {
  createModerationWarningEmbed,
  createWhitelistResponseEmbed,
  createWhitelistPaginationRow,
} = require('./moderationEmbeds');
const {
  createFeatureToggleResponseEmbed,
  createAISetupResponseEmbed,
  createKnowledgeSetupResponseEmbed,
  createChannelSetupResponseEmbed,
  createNotificationSetupResponseEmbed,
} = require('./settingsEmbeds');
const {
  createHelpEmbed,
} = require('./helpEmbeds');
const {
  createNowPlayingEmbed,
  createTrackAddedEmbed,
  createPlaylistAddedEmbed,
  createSearchingEmbed,
  createQueueEmbed,
  createMusicStatusEmbed,
  createMusicControlRows,
  createQueuePaginationRow,
} = require('./musicEmbeds');
const {
  createAIThinkingEmbed,
  createAIAnswerEmbed,
  createAIErrorEmbed,
} = require('./aiEmbeds');

module.exports = {
  COLORS,
  // Notifications
  createWelcomeEmbed,
  createLeaveEmbed,
  // Moderation & Whitelist
  createModerationWarningEmbed,
  createWhitelistResponseEmbed,
  createWhitelistPaginationRow,
  // Settings & Setup
  createFeatureToggleResponseEmbed,
  createAISetupResponseEmbed,
  createKnowledgeSetupResponseEmbed,
  createChannelSetupResponseEmbed,
  createNotificationSetupResponseEmbed,
  // Help
  createHelpEmbed,
  // Music
  createNowPlayingEmbed,
  createTrackAddedEmbed,
  createPlaylistAddedEmbed,
  createSearchingEmbed,
  createQueueEmbed,
  createMusicStatusEmbed,
  createMusicControlRows,
  createQueuePaginationRow,
  // AI Assistant
  createAIThinkingEmbed,
  createAIAnswerEmbed,
  createAIErrorEmbed,
};
