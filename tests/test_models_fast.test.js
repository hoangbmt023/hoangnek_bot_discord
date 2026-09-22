const { config } = require('../src/config/env');
const geminiService = require('../src/services/ai/geminiService');

async function testSingleModel(provider, model) {
  const t0 = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    if (provider === 'gemini') {
      const res = await geminiService.generate({
        prompt: 'Nói xin chào bạn bằng tiếng Việt trong 3 từ',
        model: model,
      });
      clearTimeout(timeoutId);
      return { ok: true, latency: Date.now() - t0, text: res.text.trim() };
    } else {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.ai.openrouterApiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'Nói xin chào bạn bằng tiếng Việt trong 3 từ' }],
          max_tokens: 60,
          temperature: 0.1,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, latency: Date.now() - t0, error: `HTTP ${res.status}: ${data.error?.message || 'Error'}` };
      }
      const text = data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || '(No content)';
      return { ok: true, latency: Date.now() - t0, text: text.trim().slice(0, 80).replace(/\n/g, ' ') };
    }
  } catch (e) {
    clearTimeout(timeoutId);
    return { ok: false, latency: Date.now() - t0, error: e.name === 'AbortError' ? 'Timeout (>12s)' : e.message };
  }
}

async function run() {
  const geminiList = ['gemini-3.6-flash', 'gemini-3.5-flash-lite'];
  const openRouterList = [
    'openrouter/free',
    'nex-agi/nex-n2.5-mini:free',
    'nex-agi/nex-n2.5-pro:free',
    'nvidia/nemotron-3.5-lightning:free',
    'liquid/lfm-2.5-2.6b:free',
    'z-ai/glm-5.2:free',
    'inclusionai/ling-3.0-flash-vl:free',
  ];

  console.log('=== TEST GOOGLE GEMINI MODELS (100% FREE) ===');
  for (const m of geminiList) {
    const res = await testSingleModel('gemini', m);
    if (res.ok) {
      console.log(`✅ [PASS] Gemini [${m}] | ${res.latency}ms | Phản hồi: "${res.text}"`);
    } else {
      console.log(`❌ [FAIL] Gemini [${m}] | Lỗi: ${res.error}`);
    }
  }

  console.log('\n=== TEST OPENROUTER FREE MODELS ===');
  for (const m of openRouterList) {
    const res = await testSingleModel('openrouter', m);
    if (res.ok) {
      console.log(`✅ [PASS] OpenRouter [${m}] | ${res.latency}ms | Phản hồi: "${res.text}"`);
    } else {
      console.log(`❌ [FAIL] OpenRouter [${m}] | ${res.latency}ms | Lỗi: ${res.error}`);
    }
  }
}

run();
