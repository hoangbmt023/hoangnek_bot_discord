const assert = require('assert');
const memoryService = require('../src/services/ai/memoryService');
const serverContextService = require('../src/services/ai/serverContextService');
const serverKnowledgeService = require('../src/services/ai/serverKnowledgeService');
const promptService = require('../src/services/ai/promptService');
const aiService = require('../src/services/ai/aiService');
const geminiService = require('../src/services/ai/geminiService');
const openrouterService = require('../src/services/ai/openrouterService');
const tavilySearchService = require('../src/services/ai/tavilySearchService');
const askCommandHandler = require('../src/services/askCommandHandler');
const { ChannelType } = require('discord.js');

async function runTests() {
  console.log('🧪 Bắt đầu kiểm thử tính năng AI Assistant & Fallback Mechanism...\n');

  // =========================================================================
  // TEST 1: MemoryService (Bộ nhớ hội thoại ngắn hạn)
  // =========================================================================
  console.log('--- 1. Kiểm thử MemoryService (Bộ nhớ ngắn hạn phân tách Server/User) ---');
  memoryService.clearAll();

  const guildA = 'guild_111';
  const guildB = 'guild_222';
  const user1 = 'user_aaa';
  const user2 = 'user_bbb';

  // Thêm hội thoại cho user1 tại guildA
  memoryService.addMessage(guildA, user1, 'user', 'Chào bot');
  memoryService.addMessage(guildA, user1, 'assistant', 'Chào bạn! Tôi có thể giúp gì cho bạn?');

  const historyA1 = memoryService.getHistory(guildA, user1);
  assert.strictEqual(historyA1.length, 2, 'History của user1 ở guildA phải có 2 tin nhắn');
  assert.strictEqual(historyA1[0].text, 'Chào bot');
  assert.strictEqual(historyA1[1].text, 'Chào bạn! Tôi có thể giúp gì cho bạn?');

  // Đảm bảo không rò rỉ sang guildB hoặc user2
  const historyB1 = memoryService.getHistory(guildB, user1);
  assert.strictEqual(historyB1.length, 0, 'User1 ở GuildB không được có lịch sử từ GuildA');

  const historyA2 = memoryService.getHistory(guildA, user2);
  assert.strictEqual(historyA2.length, 0, 'User2 ở GuildA không được nhìn thấy lịch sử của User1');

  // Kiểm tra giới hạn tin nhắn tối đa (FIFO)
  for (let i = 1; i <= 15; i++) {
    memoryService.addMessage(guildA, user1, 'user', `Tin nhắn ${i}`);
  }
  const limitedHistory = memoryService.getHistory(guildA, user1);
  assert.strictEqual(limitedHistory.length, 10, 'Bộ nhớ phải cắt giảm còn tối đa 10 tin nhắn');
  assert.strictEqual(limitedHistory[limitedHistory.length - 1].text, 'Tin nhắn 15');
  console.log('✅ [Pass] Phân tách dữ liệu Guild/User và cơ chế giới hạn FIFO hoạt động chính xác.');

  // =========================================================================
  // TEST 2: ServerKnowledgeService (Nhận diện câu hỏi Server & Tri thức động)
  // =========================================================================
  console.log('\n--- 2. Kiểm thử ServerKnowledgeService (Nhận diện Tri thức Server động - Có dấu & Không dấu) ---');
  const isRuleQuery = serverKnowledgeService.hasDirectKnowledge('Cho mình hỏi nội quy server với');
  assert.strictEqual(isRuleQuery, true, 'Câu hỏi về nội quy có dấu phải được nhận diện là direct knowledge');

  const isRuleQueryNoTone = serverKnowledgeService.hasDirectKnowledge('cho minh hoi noi quy server');
  assert.strictEqual(isRuleQueryNoTone, true, 'Câu hỏi về nội quy KHÔNG DẤU phải được nhận diện là direct knowledge');

  const dynamicSample = '=== DỮ LIỆU TRI THỨC TỪ KÊNH #rule ===\nQuy định server: Cấm toxic, bảo vệ tài khoản cá nhân. Mọi người vui lòng giới thiệu bản thân tại đây.';
  const isDynamicMatch = serverKnowledgeService.hasDirectKnowledge('Làm sao để bảo vệ tài khoản', null, dynamicSample);
  assert.strictEqual(isDynamicMatch, true, 'Câu hỏi khớp nội dung ghim có dấu phải được nhận diện direct knowledge');

  const isDynamicMatchNoTone = serverKnowledgeService.hasDirectKnowledge('lam sao de bao ve tai khoan', null, dynamicSample);
  assert.strictEqual(isDynamicMatchNoTone, true, 'Câu hỏi khớp nội dung ghim KHÔNG DẤU phải được nhận diện direct knowledge');

  // Kiểm tra chống nhận diện sai (False Positive) cho câu hỏi bên ngoài dù chứa từ "người", "thiệu", "hãy", "đang", "al", "thi đấu"
  const isFalseMatchSoopi = serverKnowledgeService.hasDirectKnowledge('soopi pubg pc hàn hãy giới thiệu về người này', null, dynamicSample);
  assert.strictEqual(isFalseMatchSoopi, false, 'Câu hỏi tìm kiếm thông tin bên ngoài không được nhận diện nhầm là Server Knowledge');

  const isFalseMatchHimas = serverKnowledgeService.hasDirectKnowledge('himas hiện tại đang thi đấu cho al mà', null, dynamicSample);
  assert.strictEqual(isFalseMatchHimas, false, 'Câu hỏi về Himas/AL thi đấu không được nhận diện nhầm là Server Knowledge');

  const isFalseMatchRealName = serverKnowledgeService.hasDirectKnowledge('tên thật himass pubg pc là gì', null, dynamicSample);
  assert.strictEqual(isFalseMatchRealName, false, 'Câu hỏi hỏi về tên thật người nổi tiếng phải luôn kích hoạt Tavily Search');

  const isFalseMatchGeneral = serverKnowledgeService.hasDirectKnowledge('kênh đào panama nằm ở đâu', null, dynamicSample);
  assert.strictEqual(isFalseMatchGeneral, false, 'Câu hỏi tổng quát ngoài đời không được nhận diện nhầm là Server Knowledge');

  const isServerSpecificSoopi = tavilySearchService.isServerSpecificQuery('soopi pubg pc hàn hãy giới thiệu về người này');
  assert.strictEqual(isServerSpecificSoopi, false, 'TavilySearchService không được nhận nhầm câu hỏi bên ngoài thành Server Specific');
  console.log('✅ [Pass] Nhận diện tri thức Server động và cơ chế lọc Stop words chống False-positive hoạt động chính xác.');

  // =========================================================================
  // TEST 3: ServerContextService (Thu thập dữ liệu Server từ Discord)
  // =========================================================================
  console.log('\n--- 3. Kiểm thử ServerContextService (Trích xuất Ngữ cảnh Server) ---');
  const mockGuild = {
    id: 'guild_test_123',
    name: 'Cộng Đồng Lập Trình Việt Nam',
    description: 'Nơi giao lưu học hỏi Node.js & Discord.js',
    memberCount: 500,
    channels: {
      cache: new Map([
        [
          'c1',
          {
            id: 'c1',
            name: 'thao-luan-chung',
            type: ChannelType.GuildText,
            parent: { name: 'KÊNH CHAT' },
            topic: 'Trò chuyện lập trình',
            permissionsFor: () => ({ has: () => true }),
          },
        ],
        [
          'c2',
          {
            id: 'c2',
            name: 'phong-nghe-nhac',
            type: ChannelType.GuildVoice,
            parent: { name: 'VOICE' },
            permissionsFor: () => ({ has: () => true }),
          },
        ],
      ]),
    },
    roles: {
      cache: [
        { name: 'Admin', position: 10, hexColor: '#ff0000' },
        { name: 'Member', position: 1, hexColor: '#00ff00' },
        { name: '@everyone', position: 0, hexColor: '#000000' },
      ],
    },
  };

  const collected = serverContextService.collectGuildContext(mockGuild);
  assert.strictEqual(collected.guild.name, 'Cộng Đồng Lập Trình Việt Nam');
  assert.strictEqual(collected.channels.length, 2);
  assert.strictEqual(collected.roles.length, 2, 'Phải lọc bỏ vai trò @everyone');
  assert(collected.commands.length >= 5, 'Phải chứa danh sách bot commands');

  const contextText = serverContextService.formatContextForPrompt(collected);
  assert(contextText.includes('Cộng Đồng Lập Trình Việt Nam'));
  assert(contextText.includes('#thao-luan-chung'));
  assert(contextText.includes('@Admin'));
  console.log('✅ [Pass] Thu thập và định dạng dữ liệu Server Discord chuẩn xác.');

  // =========================================================================
  // TEST 4: PromptService (Xây dựng System Prompt & Context)
  // =========================================================================
  console.log('\n--- 4. Kiểm thử PromptService (System Prompt & Grounding Rules) ---');
  const systemPrompt = promptService.buildSystemPrompt({ serverName: 'Test Server' });
  assert(systemPrompt.includes('AI Assistant'));
  assert(systemPrompt.includes('ANTI-CONFABULATION') || systemPrompt.includes('bịa đặt') || systemPrompt.includes('BỊA ĐẶT'));
  assert(systemPrompt.includes('Tiếng Việt'));

  // Kiểm tra chuyển đổi bảng Markdown sang Discord list
  const rawTableResponse =
    'Dưới đây là các lệnh:\n' +
    '| Lệnh | Mô tả |\n' +
    '|------|-------|\n' +
    '| `/setup whitelist add` | Thêm người dùng vào whitelist |\n' +
    '| `/setup whitelist remove` | Xóa người dùng khỏi whitelist |\n';

  const formattedResponse = promptService.formatResponseForDiscord(rawTableResponse);
  assert(!formattedResponse.includes('|---|'), 'Phải xóa bỏ hàng kẻ phân cách |---|');
  assert(formattedResponse.includes('• `/setup whitelist add`: Thêm người dùng vào whitelist'), 'Phải chuyển đổi thành bullet point đẹp mắt');
  assert(formattedResponse.includes('• `/setup whitelist remove`: Xóa người dùng khỏi whitelist'));

  const userPrompt = promptService.buildUserPrompt({
    question: 'Server có những kênh nào?',
    serverContextText: contextText,
    knowledgeText: dynamicSample,
  });
  assert(userPrompt.includes('CÂU HỎI CỦA NGƯỜI DÙNG:'));
  assert(userPrompt.includes('Server có những kênh nào?'));
  assert(userPrompt.includes('thao-luan-chung'));
  console.log('✅ [Pass] System Prompt đảm bảo quy chuẩn chống ảo giác và tự động chuyển đổi bảng Markdown sang danh sách Discord đẹp mắt.');

  // =========================================================================
  // TEST 5: Rate Limiter (Chống spam API)
  // =========================================================================
  console.log('\n--- 5. Kiểm thử Rate Limit (!ask per user) ---');
  aiService.userCooldowns.clear();
  const testUser = 'user_spam_test';

  const check1 = aiService.checkRateLimit(testUser);
  assert.strictEqual(check1.limited, false, 'Lần gọi đầu tiên phải được phép');

  const check2 = aiService.checkRateLimit(testUser);
  assert.strictEqual(check2.limited, true, 'Lần gọi ngay sau đó phải bị chặn Rate Limit');
  assert(check2.remainingSec > 0, 'Phải trả về thời gian chờ còn lại');

  const otherUserCheck = aiService.checkRateLimit('user_another');
  assert.strictEqual(otherUserCheck.limited, false, 'User khác không bị ảnh hưởng rate limit');
  console.log('✅ [Pass] Cơ chế Rate Limit 5 giây/user hoạt động chính xác.');

  // =========================================================================
  // TEST 6: Provider Fallback (Gemini -> OpenRouter)
  // =========================================================================
  console.log('\n--- 6. Kiểm thử Provider Fallback (Gemini lỗi 429 ➔ OpenRouter tiếp quản) ---');
  aiService.userCooldowns.clear();

  // Mock GeminiService.generate to throw 429 Quota Exceeded
  const originalGeminiGen = geminiService.generate;
  const originalOpenRouterGen = openrouterService.generate;

  geminiService.generate = async () => {
    const err = new Error('Gemini API Error: Resource has been exhausted (e.g. check quota).');
    err.status = 429;
    err.isRateLimit = true;
    throw err;
  };

  openrouterService.generate = async ({ prompt }) => {
    return {
      text: 'Đây là câu trả lời từ OpenRouter Fallback Provider.',
      model: 'openrouter/free',
    };
  };

  const fallbackResponse = await aiService.ask({
    question: 'Thủ đô của Việt Nam là gì?',
    userId: 'user_fallback_test',
    guild: mockGuild,
  });

  assert.strictEqual(fallbackResponse.provider, 'openrouter', 'Phải tự động fallback sang openrouter');
  assert.strictEqual(fallbackResponse.text, 'Đây là câu trả lời từ OpenRouter Fallback Provider.');
  console.log('✅ [Pass] Khi Gemini gặp lỗi 429 Quota, OpenRouter tự động tiếp quản thành công.');

  // Restore mock
  geminiService.generate = originalGeminiGen;
  openrouterService.generate = originalOpenRouterGen;

  // =========================================================================
  // TEST 7: AskCommandHandler (Strict !ask Prefix & Splitting)
  // =========================================================================
  console.log('\n--- 7. Kiểm thử AskCommandHandler (Chỉ chấp nhận duy nhất !ask) ---');
  assert.strictEqual(askCommandHandler.isAskCommand('!ask JavaScript là gì?'), true);
  assert.strictEqual(askCommandHandler.isAskCommand('!ask'), true);
  assert.strictEqual(askCommandHandler.isAskCommand('s!ask Server có role nào?'), false, 'Không chấp nhận s!ask');
  assert.strictEqual(askCommandHandler.isAskCommand('!hoi Nội quy server'), false, 'Không chấp nhận !hoi');
  assert.strictEqual(askCommandHandler.isAskCommand('!ai Chào bạn'), false, 'Không chấp nhận !ai');
  assert.strictEqual(askCommandHandler.isAskCommand('!help'), false);

  assert.strictEqual(
    askCommandHandler.extractQuestion('!ask Làm sao để lấy role VIP?'),
    'Làm sao để lấy role VIP?'
  );

  // Kiểm tra cắt tin nhắn dài > 2000 ký tự
  const longText = 'A'.repeat(1500) + '\n' + 'B'.repeat(1500);
  const chunks = askCommandHandler.splitMessage(longText, 1950);
  assert.strictEqual(chunks.length, 2, 'Văn bản 3000 ký tự phải được chia thành 2 phần');
  assert(chunks[0].length <= 1950 && chunks[1].length <= 1950, 'Mỗi phần không được vượt quá 1950 ký tự');
  console.log('✅ [Pass] Nhận diện duy nhất cú pháp !ask và thuật toán cắt tin nhắn hoạt động chuẩn xác.');

  // =========================================================================
  // TEST 8: Cấu hình Model AI tùy chỉnh theo Server (/setup ai & !setup ai)
  // =========================================================================
  console.log('\n--- 8. Kiểm thử Cấu hình Model AI theo Server (GuildSettingsService) ---');
  const guildSettingsService = require('../src/services/guildSettingsService');
  const testGuildAi = 'guild_ai_model_test_999';

  // 1. Mặc định ban đầu
  const defaultGemini = guildSettingsService.getAIModel(testGuildAi, 'gemini');
  assert.strictEqual(defaultGemini, 'gemini-3.6-flash', 'Mặc định ban đầu phải là gemini-3.6-flash');

  // 2. Cài đặt Model Gemini tùy chỉnh
  guildSettingsService.setAIModel(testGuildAi, 'gemini', 'gemini-1.5-pro');
  assert.strictEqual(guildSettingsService.getAIModel(testGuildAi, 'gemini'), 'gemini-1.5-pro');

  // 3. Cài đặt Model OpenRouter tùy chỉnh
  guildSettingsService.setAIModel(testGuildAi, 'openrouter', 'meta-llama/llama-3.3-70b-instruct:free');
  assert.strictEqual(
    guildSettingsService.getAIModel(testGuildAi, 'openrouter'),
    'meta-llama/llama-3.3-70b-instruct:free'
  );

  // 4. Kiểm tra Guild khác vẫn dùng mặc định
  assert.strictEqual(
    guildSettingsService.getAIModel('guild_other', 'gemini'),
    'gemini-3.6-flash',
    'Guild khác không bị ảnh hưởng'
  );

  // 5. Kiểm tra AISettings helper
  const aiSettings = guildSettingsService.getAISettings(testGuildAi);
  assert.strictEqual(aiSettings.geminiModel, 'gemini-1.5-pro');
  assert.strictEqual(aiSettings.isCustomGemini, true);
  assert.strictEqual(aiSettings.openrouterModel, 'meta-llama/llama-3.3-70b-instruct:free');
  assert.strictEqual(aiSettings.isCustomOpenrouter, true);

  // 6. Cài đặt Primary Provider
  assert.strictEqual(guildSettingsService.getAIPrimaryProvider(testGuildAi), 'gemini', 'Mặc định primary là gemini');
  guildSettingsService.setAIPrimaryProvider(testGuildAi, 'openrouter');
  assert.strictEqual(guildSettingsService.getAIPrimaryProvider(testGuildAi), 'openrouter', 'Primary phải đổi thành openrouter');
  assert.strictEqual(guildSettingsService.getAISettings(testGuildAi).primaryProvider, 'openrouter');

  // 7. Reset về mặc định
  guildSettingsService.resetAIModel(testGuildAi, 'gemini');
  assert.strictEqual(guildSettingsService.getAIModel(testGuildAi, 'gemini'), 'gemini-3.6-flash');
  assert.strictEqual(
    guildSettingsService.getAIModel(testGuildAi, 'openrouter'),
    'meta-llama/llama-3.3-70b-instruct:free'
  );

  guildSettingsService.resetAIModel(testGuildAi, 'all');
  assert.strictEqual(guildSettingsService.getAIModel(testGuildAi, 'openrouter'), 'openrouter/free');
  assert.strictEqual(guildSettingsService.getAIPrimaryProvider(testGuildAi), 'gemini');
  console.log('✅ [Pass] Cài đặt, lưu trữ, truy xuất và đặt lại Model AI / Primary Provider theo từng Server hoạt động hoàn hảo.');

  // =========================================================================
  // TEST 9: Primary Provider Execution & OpenRouter -> Gemini Fallback
  // =========================================================================
  console.log('\n--- 9. Kiểm thử Điều hướng Primary Provider (OpenRouter là Primary -> Fallback Gemini) ---');
  const testGuildOpenRouterPrimary = {
    id: 'guild_openrouter_primary_test',
    name: 'OpenRouter Primary Test Guild',
    channels: { cache: new Map() },
    roles: { cache: [] },
  };

  guildSettingsService.setAIPrimaryProvider(testGuildOpenRouterPrimary.id, 'openrouter');
  aiService.userCooldowns.clear();

  let openRouterCalled = false;
  let geminiCalled = false;

  const testOrigGemini = geminiService.generate;
  const testOrigOpenRouter = openrouterService.generate;

  // Case 9A: OpenRouter success (Primary is OpenRouter)
  openrouterService.generate = async () => {
    openRouterCalled = true;
    return { text: 'Trả lời trực tiếp từ OpenRouter Primary', model: 'openrouter/free' };
  };
  geminiService.generate = async () => {
    geminiCalled = true;
    return { text: 'Trả lời từ Gemini', model: 'gemini-3.6-flash' };
  };

  const primaryRes = await aiService.ask({
    question: 'OpenRouter test question',
    userId: 'user_primary_test_1',
    guild: testGuildOpenRouterPrimary,
  });

  assert.strictEqual(primaryRes.provider, 'openrouter');
  assert.strictEqual(openRouterCalled, true, 'OpenRouter phải được gọi trước');
  assert.strictEqual(geminiCalled, false, 'Gemini không được gọi nếu OpenRouter thành công');

  // Case 9B: OpenRouter fails -> Fallback to Gemini
  aiService.userCooldowns.clear();
  openRouterCalled = false;
  geminiCalled = false;

  openrouterService.generate = async () => {
    openRouterCalled = true;
    throw new Error('OpenRouter 503 Service Unavailable');
  };

  const fallbackRes2 = await aiService.ask({
    question: 'OpenRouter fallback to Gemini test',
    userId: 'user_primary_test_2',
    guild: testGuildOpenRouterPrimary,
  });

  assert.strictEqual(fallbackRes2.provider, 'gemini');
  assert.strictEqual(openRouterCalled, true, 'OpenRouter phải được thử trước');
  assert.strictEqual(geminiCalled, true, 'Gemini phải được gọi làm fallback');
  assert.strictEqual(fallbackRes2.text, 'Trả lời từ Gemini');
  console.log('✅ [Pass] Điều phối OpenRouter làm Primary và Fallback sang Gemini hoạt động chính xác.');

  // Restore mocks and clean up
  geminiService.generate = testOrigGemini;
  openrouterService.generate = testOrigOpenRouter;
  guildSettingsService.resetAIModel(testGuildOpenRouterPrimary.id, 'all');

  // =========================================================================
  // TEST 10: TavilySearchService & Internet Grounding RAG
  // =========================================================================
  console.log('\n--- 10. Kiểm thử TavilySearchService (Phân loại truy vấn, Tavily RAG & Định dạng) ---');
  // 1. Phân loại câu hỏi nội bộ server (không cần tra cứu web)
  assert.strictEqual(tavilySearchService.isServerSpecificQuery('Server này có những kênh nào?'), true);
  assert.strictEqual(tavilySearchService.isServerSpecificQuery('Nội quy server là gì?'), true);
  assert.strictEqual(tavilySearchService.isServerSpecificQuery('Bot có những lệnh gì?'), true);

  // 2. Phân loại câu hỏi kiến thức ngoài server (cần tra cứu web)
  assert.strictEqual(tavilySearchService.isServerSpecificQuery('Himass pubg pc là ai?'), false);
  assert.strictEqual(tavilySearchService.isServerSpecificQuery('Thủ đô của Pháp là gì?'), false);
  assert.strictEqual(tavilySearchService.isServerSpecificQuery('Ai phát minh ra máy tính?'), false);

  // 3. Định dạng kết quả tìm kiếm từ Tavily (bao gồm cả Synthesized Answer và Content Source)
  const mockTavilyData = {
    answer: 'Himass tên thật là Lã Phương Tiến Đạt, sinh năm 2003, là tuyển thủ PUBG hàng đầu Việt Nam.',
    query: 'himass là ai',
    results: [
      {
        title: 'Himass Profile - Liquipedia PUBG',
        url: 'https://liquipedia.net/pubg/Himass',
        content: 'Lã Phương Tiến Đạt (sinh 16/08/2003) là tuyển thủ PUBG chuyên nghiệp Việt Nam từng vô địch PGS 3.',
        score: 98,
      },
    ],
  };
  const formattedSearch = tavilySearchService.formatSearchResults(mockTavilyData);
  assert(formattedSearch.includes('TAVILY AI SEARCH RAG'));
  assert(formattedSearch.includes('TỔNG HỢP TRỰC TIẾP TỪ TAVILY SEARCH'));
  assert(formattedSearch.includes('Lã Phương Tiến Đạt'));
  assert(formattedSearch.includes('https://liquipedia.net/pubg/Himass'));

  // 5. Kiểm tra phân luồng JSON Knowledge Base (Có dữ liệu -> Dùng trực tiếp)
  assert.strictEqual(serverKnowledgeService.hasDirectKnowledge('Nội quy server có những điều gì?'), true);
  assert.strictEqual(serverKnowledgeService.hasDirectKnowledge('Làm sao để lấy role VIP?'), true);
  assert.strictEqual(serverKnowledgeService.hasDirectKnowledge('Làm sao để liên hệ ban quản trị?'), true);
  assert.strictEqual(serverKnowledgeService.hasDirectKnowledge('Ai là tổng thống Mỹ đầu tiên?'), false);

  // 6. Kiểm tra thuật toán đánh giá chất lượng kết quả tìm kiếm (isResultInsufficient)
  assert.strictEqual(tavilySearchService.isResultInsufficient(null), true);
  assert.strictEqual(tavilySearchService.isResultInsufficient({ results: [] }), true);
  assert.strictEqual(
    tavilySearchService.isResultInsufficient({
      results: [{ score: 40, content: 'quá ngắn' }],
    }),
    true,
    'Score thấp và text ngắn phải được đánh giá là Insufficient'
  );
  assert.strictEqual(
    tavilySearchService.isResultInsufficient({
      answer: 'Đây là câu trả lời chi tiết và đầy đủ thông tin từ Tavily AI Search.',
      results: [{ score: 85, content: 'Nội dung trích xuất chi tiết...' }],
    }),
    false,
    'Kết quả có answer và score cao phải là Sufficient'
  );

  // 7. Kiểm tra chuẩn hóa khóa Cache Tavily (15 phút, chống lệch dấu câu/khoảng trắng)
  const key1 = tavilySearchService.getCacheKey('Soopi là ai?');
  const key2 = tavilySearchService.getCacheKey('  soopi là ai !!! ');
  const key3 = tavilySearchService.getCacheKey('soopi   là   ai');
  assert.strictEqual(key1, key2, 'Các biến thể dấu câu phải ra cùng 1 cache key');
  assert.strictEqual(key2, key3, 'Các biến thể khoảng trắng phải ra cùng 1 cache key');

  // =========================================================================
  // TEST 11: Dynamic Server Knowledge Setup (/setup knowledge & !setup knowledge)
  // =========================================================================
  console.log('\n--- 11. Kiểm thử Cấu hình Dữ liệu Server cho AI (Discord-based Knowledge Setup) ---');
  const testGuildK = 'guild_knowledge_test_888';
  guildSettingsService.resetKnowledgeConfig(testGuildK);

  // 1. Mặc định ban đầu
  const initConfig = guildSettingsService.getKnowledgeConfig(testGuildK);
  assert.deepStrictEqual(initConfig.channelIds, []);
  assert.strictEqual(initConfig.customText, null);

  // 2. Thêm Kênh kiến thức (multi-channel)
  const addRes1 = guildSettingsService.addKnowledgeChannel(testGuildK, 'channel_rules_123');
  assert.strictEqual(addRes1.success, true);
  assert.strictEqual(addRes1.alreadyExists, false);
  assert.deepStrictEqual(guildSettingsService.getKnowledgeConfig(testGuildK).channelIds, ['channel_rules_123']);

  // Thêm kênh thứ 2
  guildSettingsService.addKnowledgeChannel(testGuildK, 'channel_announce_456');
  assert.deepStrictEqual(guildSettingsService.getKnowledgeConfig(testGuildK).channelIds, ['channel_rules_123', 'channel_announce_456']);

  // Thêm trùng lặp → alreadyExists
  const dupRes = guildSettingsService.addKnowledgeChannel(testGuildK, 'channel_rules_123');
  assert.strictEqual(dupRes.alreadyExists, true);
  assert.strictEqual(guildSettingsService.getKnowledgeConfig(testGuildK).channelIds.length, 2, 'Không được thêm kênh trùng lặp');

  // Xóa kênh
  const removeRes = guildSettingsService.removeKnowledgeChannel(testGuildK, 'channel_announce_456');
  assert.strictEqual(removeRes.success, true);
  assert.strictEqual(removeRes.notFound, false);
  assert.deepStrictEqual(guildSettingsService.getKnowledgeConfig(testGuildK).channelIds, ['channel_rules_123']);

  // Xóa kênh không tồn tại
  const notFoundRes = guildSettingsService.removeKnowledgeChannel(testGuildK, 'non_existent');
  assert.strictEqual(notFoundRes.notFound, true);

  // 3. Cài đặt Nhiều Tin nhắn chỉ định (bằng Link hoặc ID)
  const setupCommandHandler = require('../src/services/setupCommandHandler');
  const parsedLink = setupCommandHandler.extractMessageInfo('https://discord.com/channels/111222/333444/555666');
  assert.deepStrictEqual(parsedLink, { channelId: '333444', messageId: '555666' }, 'Phải bóc tách được channelId và messageId từ link Discord');

  const parsedIdWithFallback = setupCommandHandler.extractMessageInfo('999888777666555444', '123456');
  assert.deepStrictEqual(parsedIdWithFallback, { channelId: '123456', messageId: '999888777666555444' });

  // Thêm tin nhắn 1
  const addMsgRes1 = guildSettingsService.addKnowledgeMessage(testGuildK, '333444', '555666');
  assert.strictEqual(addMsgRes1.success, true);
  assert.strictEqual(addMsgRes1.alreadyExists, false);
  assert.strictEqual(guildSettingsService.getKnowledgeConfig(testGuildK).messages.length, 1);

  // Thêm tin nhắn 2 từ kênh khác
  const addMsgRes2 = guildSettingsService.addKnowledgeMessage(testGuildK, 'channel_rules_123', 'msg_pin_999');
  assert.strictEqual(addMsgRes2.success, true);
  assert.strictEqual(guildSettingsService.getKnowledgeConfig(testGuildK).messages.length, 2);

  // Thêm tin nhắn trùng lặp
  const dupMsgRes = guildSettingsService.addKnowledgeMessage(testGuildK, '333444', '555666');
  assert.strictEqual(dupMsgRes.alreadyExists, true);
  assert.strictEqual(guildSettingsService.getKnowledgeConfig(testGuildK).messages.length, 2);

  // Xóa 1 tin nhắn
  const remMsgRes = guildSettingsService.removeKnowledgeMessage(testGuildK, 'msg_pin_999');
  assert.strictEqual(remMsgRes.success, true);
  assert.strictEqual(remMsgRes.notFound, false);
  assert.strictEqual(guildSettingsService.getKnowledgeConfig(testGuildK).messages.length, 1);

  // 4. Cài đặt Nhiều Văn bản kiến thức tùy chỉnh (Multi-text)
  const addTextRes1 = guildSettingsService.addKnowledgeText(testGuildK, '1. Cấm spam link scam.\n2. Cần level 5 để vào kênh giveaway.');
  assert.strictEqual(addTextRes1.success, true);
  assert.strictEqual(guildSettingsService.getKnowledgeConfig(testGuildK).customTexts.length, 1);

  const addTextRes2 = guildSettingsService.addKnowledgeText(testGuildK, '3. Admin chính của server là Hoàng. 4. Liên hệ hỗ trợ tại #support.');
  assert.strictEqual(addTextRes2.success, true);
  assert.strictEqual(guildSettingsService.getKnowledgeConfig(testGuildK).customTexts.length, 2);

  // Xóa văn bản theo số thứ tự (index 1-based)
  const remTextRes = guildSettingsService.removeKnowledgeText(testGuildK, 2);
  assert.strictEqual(remTextRes.success, true);
  assert.strictEqual(guildSettingsService.getKnowledgeConfig(testGuildK).customTexts.length, 1);

  // Thêm lại để test trích xuất đầy đủ
  guildSettingsService.addKnowledgeText(testGuildK, 'Admin chính của server là Hoàng.');

  // 5. Mock Discord Guild có kênh, tin nhắn ghim và tin nhắn chỉ định
  const mockKnowledgeGuild = {
    id: testGuildK,
    name: 'Server Tri Thức Mới',
    channels: {
      cache: new Map([
        [
          '333444',
          {
            id: '333444',
            name: 'thong-bao-dac-biet',
            isTextBased: () => true,
            messages: {
              fetch: async (id) => {
                if (id === '555666') {
                  return {
                    id: '555666',
                    content: 'Nội dung tin nhắn chỉ định: Sự kiện Giveaway Nitro bắt đầu lúc 20:00.',
                    author: { username: 'AdminHoang' },
                  };
                }
                return new Map();
              },
            },
          },
        ],
        [
          'channel_rules_123',
          {
            id: 'channel_rules_123',
            name: 'noi-quy-server',
            isTextBased: () => true,
            messages: {
              fetchPins: async () =>
                new Map([
                  ['pin_1', { id: 'pin_1', content: 'Tin nhắn ghim: Luôn tôn trọng mọi người trong server.', author: { bot: false } }],
                ]),
              fetch: async () =>
                new Map([
                  ['msg_1', { id: 'msg_1', content: 'Thông báo: Giải đấu PUBG diễn ra vào thứ 7.', author: { bot: false } }],
                ]),
            },
          },
        ],
      ]),
    },
  };

  // 6. Kiểm tra getKnowledgeForGuild trích xuất đúng
  const dynamicKnowledge = await serverKnowledgeService.getKnowledgeForGuild(mockKnowledgeGuild);
  assert(dynamicKnowledge.includes('DỮ LIỆU TRI THỨC DO QUẢN TRỊ VIÊN CẤU HÌNH CHO SERVER'));
  assert(dynamicKnowledge.includes('Cấm spam link scam'));
  assert(dynamicKnowledge.includes('DỮ LIỆU TRI THỨC TỪ TIN NHẮN CHỈ ĐỊNH'));
  assert(dynamicKnowledge.includes('Sự kiện Giveaway Nitro bắt đầu lúc 20:00.'));
  assert(dynamicKnowledge.includes('DỮ LIỆU TRI THỨC TỪ KÊNH #noi-quy-server'));
  assert(dynamicKnowledge.includes('Tin nhắn ghim: Luôn tôn trọng mọi người trong server.'));
  assert.strictEqual(
    dynamicKnowledge.includes('Giải đấu PUBG diễn ra vào thứ 7.'),
    false,
    'Kênh tri thức chỉ lấy tin nhắn ghim, không lấy tin nhắn chưa ghim trong đoạn chat'
  );

  // 7. hasDirectKnowledge nhận diện đúng với customText
  assert.strictEqual(serverKnowledgeService.hasDirectKnowledge('Ai là Hoàng?', mockKnowledgeGuild), true);
  assert.strictEqual(serverKnowledgeService.hasDirectKnowledge('Làm sao để vào giveaway?', mockKnowledgeGuild), true);

  // 8. Kiểm tra In-Memory RAM Cache (0ms) và Invalidation
  const cachedKnowledge = await serverKnowledgeService.getKnowledgeForGuild(mockKnowledgeGuild);
  assert.strictEqual(cachedKnowledge, dynamicKnowledge, 'Lần gọi thứ 2 phải trả về ngay lập tức từ bộ nhớ RAM Cache');

  // 9. Reset về mặc định & kiểm tra cache tự động bị xóa
  guildSettingsService.resetKnowledgeConfig(testGuildK);
  const resetConfig = guildSettingsService.getKnowledgeConfig(testGuildK);
  assert.deepStrictEqual(resetConfig.channelIds, []);
  assert.deepStrictEqual(resetConfig.messages, []);
  assert.deepStrictEqual(resetConfig.customTexts, []);
  assert.strictEqual(resetConfig.messageId, null);
  assert.strictEqual(resetConfig.messageChannelId, null);
  assert.strictEqual(resetConfig.customText, null);

  // Sau khi reset, cache đã bị invalidate
  const postResetKnowledge = await serverKnowledgeService.getKnowledgeForGuild(mockKnowledgeGuild);
  assert.strictEqual(postResetKnowledge, '', 'Sau khi reset cài đặt, cache phải tự động xóa và trả về rỗng');
  console.log('✅ [Pass] Cấu hình Đa Kênh, Đa Tin Nhắn, Đa Văn Bản tùy chỉnh, trích xuất Discord Knowledge và In-Memory RAM Cache (0ms) hoạt động chuẩn xác 100%.');


  console.log('\n🎉 TẤT CẢ CÁC BÀI TEST AI ASSISTANT & MODEL SETUP ĐÃ HOÀN THÀNH XUẤT SẮC!');
}

runTests().catch((err) => {
  console.error('❌ Test thất bại:', err);
  process.exit(1);
});
