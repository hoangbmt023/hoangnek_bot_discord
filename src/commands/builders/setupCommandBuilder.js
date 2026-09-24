const { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType } = require('discord.js');
const {
  buildChannelSubcommands,
  buildWhitelistSubcommands,
  buildFeatureSubcommands,
  buildNotifySubcommands,
  buildAISubcommands,
  buildKnowledgeSubcommands,
} = require('./setup');

/**
 * Xây dựng cấu hình Slash Command cho /setup bằng cách tổng hợp các Subcommand Groups
 * @returns {SlashCommandBuilder}
 */
function buildSetupCommand() {
  return new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Trung tâm cấu hình và quản lý các chức năng của Bot trong Server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setContexts([InteractionContextType.Guild])
    .addSubcommandGroup(buildChannelSubcommands)
    .addSubcommandGroup(buildWhitelistSubcommands)
    .addSubcommandGroup(buildFeatureSubcommands)
    .addSubcommandGroup(buildNotifySubcommands)
    .addSubcommandGroup(buildAISubcommands)
    .addSubcommandGroup(buildKnowledgeSubcommands);
}

module.exports = { buildSetupCommand };
