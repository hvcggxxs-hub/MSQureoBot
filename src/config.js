require('dotenv').config();
const required = ['TELEGRAM_BOT_TOKEN', 'GEMINI_API_KEY', 'DATA_ENCRYPTION_KEY'];
for (const key of required) if (!process.env[key] || process.env[key].startsWith('PUT_')) throw new Error(`Missing configuration: ${key}. Copy .env.example to .env and fill it in.`);
const encryptionKey = Buffer.from(process.env.DATA_ENCRYPTION_KEY, 'base64');
if (encryptionKey.length !== 32) throw new Error('DATA_ENCRYPTION_KEY must decode to exactly 32 bytes.');
module.exports = {
  token: process.env.TELEGRAM_BOT_TOKEN, geminiKey: process.env.GEMINI_API_KEY,
  model: process.env.GEMINI_MODEL || 'gemini-2.5-flash', adminId: String(process.env.ADMIN_ID || '8387759222'),
  loginUrl: process.env.QUREO_LOGIN_URL || 'https://me-portal.qureo.education/login',
  headless: process.env.HEADLESS !== 'false', dataDir: process.env.DATA_DIR || './data', encryptionKey,
  cloudflareAccountId: process.env.CF_ACCOUNT_ID || '',
  cloudflareApiToken: process.env.CF_API_TOKEN || '',
  cloudflareImageModel: process.env.CF_IMAGE_MODEL || '@cf/black-forest-labs/flux-1-schnell',
  selectors: {
    user: process.env.LOGIN_USER_SELECTOR || 'input[type="email"], input[name*="user" i], input[name*="email" i], input[type="text"]',
    pass: process.env.LOGIN_PASS_SELECTOR || 'input[type="password"]',
    loginSubmit: process.env.LOGIN_SUBMIT_SELECTOR || 'button[type="submit"], input[type="submit"]',
    question: process.env.QUESTION_SELECTOR || '[data-question], .question, [class*="question" i], main',
    option: process.env.OPTION_SELECTOR || 'input[type="radio"]',
    answerSubmit: process.env.SUBMIT_ANSWER_SELECTOR || 'button[type="submit"], button:has-text("تحقق"), button:has-text("إرسال"), button:has-text("Submit"), button:has-text("Check"), button:has-text("التالي"), button:has-text("Next")'
  }
};
