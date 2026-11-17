const config = require('./config');

async function generateImage(prompt) {
  if (!config.cloudflareAccountId || !config.cloudflareApiToken) {
    throw new Error('توليد الصور غير مضبوط. أضف CF_ACCOUNT_ID وCF_API_TOKEN إلى .env.');
  }
  const cleanPrompt = String(prompt || '').trim();
  if (cleanPrompt.length < 3 || cleanPrompt.length > 1200) {
    throw new Error('اكتب وصفًا بين 3 و1200 حرف.');
  }
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.cloudflareAccountId)}/ai/run/${config.cloudflareImageModel}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.cloudflareApiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt: cleanPrompt })
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new Error(`خدمة الصور أعادت خطأ ${response.status}: ${detail}`);
  }
  const type = response.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    const payload = await response.json();
    const encoded = payload?.result?.image || payload?.result?.data?.[0]?.b64_json;
    if (!encoded) throw new Error('استجابة خدمة الصور لا تحتوي على صورة.');
    return Buffer.from(encoded, 'base64');
  }
  return Buffer.from(await response.arrayBuffer());
}
module.exports = { generateImage };
