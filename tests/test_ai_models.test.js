require('dotenv').config({ path: '.env.development' });
const { config } = require('../src/config/env');

const geminiApiKey = config.ai.geminiApiKey;
const openrouterApiKey = config.ai.openrouterApiKey;

const geminiModelsToTest = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-lite-preview-02-05',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

const openrouterModelsToTest = [
  'openrouter/free',
  'google/gemini-2.0-flash-lite-preview-02-05:free',
  'google/gemini-2.0-pro-exp-02-05:free',
  'google/gemini-2.0-flash-thinking-exp:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'deepseek/deepseek-chat:free',
  'deepseek/deepseek-r1:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'cognitivecomputations/dolphin3.0-r1-mistral-24b:free',
];

async function testGemini(model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
      }),
    });
    const duration = Date.now() - start;
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { model, ok: false, error: err?.error?.message || res.statusText, status: res.status, duration };
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { model, ok: true, duration, replySnippet: text.slice(0, 30) };
  } catch (err) {
    return { model, ok: false, error: err.message, duration: Date.now() - start };
  }
}

async function testOpenRouter(model) {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openrouterApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });
    const duration = Date.now() - start;
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { model, ok: false, error: err?.error?.message || res.statusText, status: res.status, duration };
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    return { model, ok: true, duration, replySnippet: text.slice(0, 30) };
  } catch (err) {
    return { model, ok: false, error: err.message, duration: Date.now() - start };
  }
}

async function main() {
  console.log('====================================================');
  console.log('🧪 KIỂM TRA TOÀN DIỆN CÁC MODEL GOOGLE GEMINI:');
  console.log('====================================================');
  for (const m of geminiModelsToTest) {
    const res = await testGemini(m);
    if (res.ok) {
      console.log(`✅ [PASS] ${m} (${res.duration}ms) -> "${res.replySnippet.replace(/\n/g, ' ')}"`);
    } else {
      console.log(`❌ [FAIL] ${m} (HTTP ${res.status || 'ERR'} - ${res.duration}ms): ${res.error}`);
    }
  }

  console.log('\n====================================================');
  console.log('🧪 KIỂM TRA TOÀN DIỆN CÁC MODEL OPENROUTER FREE:');
  console.log('====================================================');
  for (const m of openrouterModelsToTest) {
    const res = await testOpenRouter(m);
    if (res.ok) {
      console.log(`✅ [PASS] ${m} (${res.duration}ms) -> "${res.replySnippet.replace(/\n/g, ' ')}"`);
    } else {
      console.log(`❌ [FAIL] ${m} (HTTP ${res.status || 'ERR'} - ${res.duration}ms): ${res.error}`);
    }
  }
}

main();
