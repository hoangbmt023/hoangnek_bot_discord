const { config } = require('../src/config/env');
const geminiService = require('../src/services/ai/geminiService');

async function testGemini() {
  console.log('=== TEST GOOGLE GEMINI MODELS ===');
  const geminiModels = [
    'gemini-3.6-flash',
    'gemini-2.5-flash',
    'gemini-3.5-flash-lite',
  ];

  for (const m of geminiModels) {
    const t0 = Date.now();
    try {
      const res = await geminiService.generate({
        prompt: 'Nói xin chào bạn bằng tiếng Việt ngắn gọn trong 3 từ',
        model: m,
      });
      console.log(`✅ [OK] Gemini [${m}]: ${Date.now() - t0}ms -> "${res.text.trim()}"`);
    } catch (e) {
      console.log(`❌ [FAIL] Gemini [${m}]: ${e.message}`);
    }
  }
}

async function testOpenRouter() {
  console.log('\n=== TEST OPENROUTER FREE MODELS ===');
  const openRouterModels = [
    'openrouter/free',
    'nex-agi/nex-n2.5-mini:free',
    'nex-agi/nex-n2.5-pro:free',
    'qwen/qwen3.8-27b:free',
    'nvidia/nemotron-3.5-lightning:free',
    'z-ai/glm-5.2:free',
    'inclusionai/ling-3.0-flash-vl:free',
    'liquid/lfm-2.5-2.6b:free',
    'thinkingmachines/inkling-small:free',
    'dots-studio/dots-3-note-preview:free',
  ];

  for (const m of openRouterModels) {
    const t0 = Date.now();
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.ai.openrouterApiKey}`,
        },
        body: JSON.stringify({
          model: m,
          messages: [{ role: 'user', content: 'Nói xin chào bạn bằng tiếng Việt trong 3 từ' }],
          max_tokens: 60,
          temperature: 0.1,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.log(`❌ [FAIL] OpenRouter [${m}]: HTTP ${res.status} -> ${data.error?.message || 'Error'}`);
      } else {
        const text = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || '(Empty)';
        const cleanText = text.trim().slice(0, 60).replace(/\n/g, ' ');
        console.log(`✅ [OK] OpenRouter [${m}]: ${Date.now() - t0}ms -> "${cleanText}"`);
      }
    } catch (e) {
      console.log(`❌ [FAIL] OpenRouter [${m}]: ${e.message}`);
    }
  }
}

(async () => {
  await testGemini();
  await testOpenRouter();
})();
