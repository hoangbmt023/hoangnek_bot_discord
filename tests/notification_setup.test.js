const assert = require('assert');
const { ChannelType, PermissionFlagsBits } = require('discord.js');
const guildSettingsService = require('../src/services/guildSettingsService');
const memberNotificationService = require('../src/services/memberNotificationService');
const setupCommandHandler = require('../src/services/setupCommandHandler');
const { getSlashCommandsData } = require('../src/commands/slashCommands');

console.log('🧪 Bắt đầu kiểm thử Cấu hình Kênh Thông Báo Vào/Ra (Welcome/Leave) & Multi-Guild...');

// --- 1. Kiểm thử GuildSettingsService: Kênh thông báo ---
const testGuildId = 'test-guild-notify-999';

// Reset ban đầu
guildSettingsService.resetNotificationChannel(testGuildId, 'all');
assert.strictEqual(guildSettingsService.getNotificationChannel(testGuildId, 'welcome'), null, 'Mặc định welcomeChannelId phải là null');
assert.strictEqual(guildSettingsService.getNotificationChannel(testGuildId, 'leave'), null, 'Mặc định leaveChannelId phải là null');
console.log('✅ [Pass] Mặc định ban đầu chưa cấu hình kênh thông báo nào (null).');

// Set riêng welcome
guildSettingsService.setNotificationChannel(testGuildId, 'welcome', '111222333');
assert.strictEqual(guildSettingsService.getNotificationChannel(testGuildId, 'welcome'), '111222333');
assert.strictEqual(guildSettingsService.getNotificationChannel(testGuildId, 'leave'), null);
console.log('✅ [Pass] Cài đặt kênh Welcome riêng biệt thành công.');

// Set riêng leave
guildSettingsService.setNotificationChannel(testGuildId, 'leave', '444555666');
assert.strictEqual(guildSettingsService.getNotificationChannel(testGuildId, 'leave'), '444555666');
console.log('✅ [Pass] Cài đặt kênh Leave riêng biệt thành công.');

// Set all
guildSettingsService.setNotificationChannel(testGuildId, 'all', '777888999');
assert.strictEqual(guildSettingsService.getNotificationChannel(testGuildId, 'welcome'), '777888999');
assert.strictEqual(guildSettingsService.getNotificationChannel(testGuildId, 'leave'), '777888999');
console.log('✅ [Pass] Cài đặt chung kênh cho cả Welcome & Leave (all) thành công.');

// Reset
guildSettingsService.resetNotificationChannel(testGuildId, 'all');
assert.strictEqual(guildSettingsService.getNotificationChannel(testGuildId, 'welcome'), null);
assert.strictEqual(guildSettingsService.getNotificationChannel(testGuildId, 'leave'), null);
console.log('✅ [Pass] Reset kênh thông báo về mặc định thành công.');

// --- 2. Kiểm thử MemberNotificationService: resolveNotificationChannel ---
const mockSystemChannel = {
  id: 'sys-channel-100',
  name: 'system-chat',
  isTextBased: () => true,
  type: ChannelType.GuildText,
};

const mockCustomChannel = {
  id: 'custom-welcome-200',
  name: 'welcome-chat',
  isTextBased: () => true,
  type: ChannelType.GuildText,
};

const mockDefaultChannel = {
  id: 'fallback-text-300',
  name: 'general-chat',
  isTextBased: () => true,
  type: ChannelType.GuildText,
};

const mockGuild = {
  id: testGuildId,
  name: 'Test Server Multi-Guild',
  systemChannel: mockSystemChannel,
  client: { user: { id: 'bot-123' } },
  channels: {
    cache: new Map([
      ['sys-channel-100', mockSystemChannel],
      ['custom-welcome-200', mockCustomChannel],
      ['fallback-text-300', mockDefaultChannel],
    ]),
  },
};

mockGuild.channels.cache.find = function (predicate) {
  for (const channel of this.values()) {
    if (predicate(channel)) return channel;
  }
  return null;
};

// Trường hợp 1: Khi chưa cấu hình -> Fallback về mockSystemChannel
guildSettingsService.resetNotificationChannel(testGuildId, 'all');
const resolvedDefault = memberNotificationService.resolveNotificationChannel(mockGuild, 'welcome');
assert.strictEqual(resolvedDefault.id, 'sys-channel-100', 'Chưa cấu hình phải lấy systemChannel');
console.log('✅ [Pass] Tự động fallback về Kênh hệ thống (guild.systemChannel) khi chưa cấu hình.');

// Trường hợp 2: Khi đã cấu hình kênh tùy chỉnh -> Lấy đúng kênh tùy chỉnh
guildSettingsService.setNotificationChannel(testGuildId, 'welcome', 'custom-welcome-200');
const resolvedCustom = memberNotificationService.resolveNotificationChannel(mockGuild, 'welcome');
assert.strictEqual(resolvedCustom.id, 'custom-welcome-200', 'Đã cấu hình phải lấy đúng kênh tùy chỉnh');
console.log('✅ [Pass] Ưu tiên lấy đúng Kênh tùy chỉnh đã cấu hình.');

// Trường hợp 3: Khi systemChannel là null -> Fallback về kênh text đầu tiên có quyền
const mockGuildNoSystem = {
  id: 'guild-no-sys-456',
  name: 'Server Không System Channel',
  systemChannel: null,
  client: { user: { id: 'bot-123' } },
  channels: {
    cache: new Map([
      ['fallback-text-300', {
        id: 'fallback-text-300',
        name: 'general-chat',
        isTextBased: () => true,
        type: ChannelType.GuildText,
        permissionsFor: () => ({
          has: () => true,
        }),
      }],
    ]),
  },
};
mockGuildNoSystem.channels.cache.find = function (predicate) {
  for (const channel of this.values()) {
    if (predicate(channel)) return channel;
  }
  return null;
};

const resolvedFallback = memberNotificationService.resolveNotificationChannel(mockGuildNoSystem, 'welcome');
assert.strictEqual(resolvedFallback.id, 'fallback-text-300');
console.log('✅ [Pass] Fallback kênh text đầu tiên khi server không có systemChannel.');

// Dọn dẹp dữ liệu test
guildSettingsService.resetNotificationChannel(testGuildId, 'all');

// --- 3. Kiểm thử Slash Commands Schema: Subcommand Group notify ---
const slashCommandsData = getSlashCommandsData();
const setupCmd = slashCommandsData.find((cmd) => cmd.name === 'setup');
assert(setupCmd, 'Slash Command /setup phải tồn tại');

const notifyGroup = setupCmd.options.find((opt) => opt.name === 'notify');
assert(notifyGroup, 'Subcommand Group notify phải có trong /setup');

const setSubCmd = notifyGroup.options.find((sub) => sub.name === 'set');
const resetSubCmd = notifyGroup.options.find((sub) => sub.name === 'reset');
const statusSubCmd = notifyGroup.options.find((sub) => sub.name === 'status');
assert(setSubCmd, 'Subcommand notify set phải tồn tại');
assert(resetSubCmd, 'Subcommand notify reset phải tồn tại');
assert(statusSubCmd, 'Subcommand notify status phải tồn tại');
console.log('✅ [Pass] Schema Slash Command /setup notify (set, reset, status) chuẩn xác 100%.');

// --- 4. Kiểm thử Prefix Command Recognizer ---
assert.strictEqual(setupCommandHandler.isSetupCommand('!setup notify welcome #general'), true);
assert.strictEqual(setupCommandHandler.isSetupCommand('!setup welcome #chao-mung'), true);
assert.strictEqual(setupCommandHandler.isSetupCommand('!setup leave #tam-biet'), true);
assert.strictEqual(setupCommandHandler.isSetupCommand('!setup channel add #music'), true);
assert.strictEqual(setupCommandHandler.isSetupCommand('!channel add #music'), false);
console.log('✅ [Pass] Nhận diện câu lệnh Prefix !setup notify, !setup welcome, !setup channel chính xác.');

console.log('\n🎉 Toàn bộ bài kiểm thử Cấu hình Kênh Thông Báo & Multi-Guild đã THÀNH CÔNG!');
