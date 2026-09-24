const { buildChannelSubcommands } = require('./channelGroup');
const { buildWhitelistSubcommands } = require('./whitelistGroup');
const { buildFeatureSubcommands } = require('./featureGroup');
const { buildNotifySubcommands } = require('./notifyGroup');
const { buildAISubcommands } = require('./aiGroup');
const { buildKnowledgeSubcommands } = require('./knowledgeGroup');

module.exports = {
  buildChannelSubcommands,
  buildWhitelistSubcommands,
  buildFeatureSubcommands,
  buildNotifySubcommands,
  buildAISubcommands,
  buildKnowledgeSubcommands,
};
