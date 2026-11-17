const config = require('./config');
const { solveQuestion } = require('./solver');

const sleep = ms => new Promise(r => setTimeout(r, ms));

class QureoRunner {
  constructor(userId, credentials, onUpdate) {
    this.userId = userId;
    this.credentials = credentials;
    this.onUpdate = onUpdate || (async () => {});
    this.browser = null;
    this.page = null;
    this.stopped = false;
  }
  async start() {
    const { chromium } = require('playwright');
    this.browser = await chromium.launch({ headless: config.headless, args: ['--no-sandbox'] });
    const context = await this.browser.newContext();
    this.page = await context.newPage();
    this.page.setDefaultTimeout(15000);
    await this.page.goto(config.loginUrl, { waitUntil: 'domcontentloaded' });
    await this.login();
  }
  async firstVisible(selector) {
    const loc = this.page.locator(selector);
    const count = await loc.count();
    for (let i=0; i<count; i++) if (await loc.nth(i).isVisible().catch(()=>false)) return loc.nth(i);
    return null;
  }
  async login() {
    const user = await this.firstVisible(config.selectors.user);
    const pass = await this.firstVisible(config.selectors.pass);
    if (!user || !pass) {
      const body = (await this.page.locator('body').innerText().catch(()=>'' )).slice(0,1500);
      if (/dashboard|لوحة التحكم|courses|المقررات/i.test(body)) return;
      throw new Error('لم أجد حقول تسجيل الدخول. قد تكون واجهة Qureo تغيرت أو تتطلب خطوة تحقق يدوية.');
    }
    await user.fill(this.credentials.username);
    await pass.fill(this.credentials.password);
    const submit = await this.firstVisible(config.selectors.loginSubmit);
    if (!submit) throw new Error('لم أجد زر تسجيل الدخول.');
    await submit.click();
    await this.page.waitForLoadState('domcontentloaded').catch(()=>{});
    await sleep(1800);
    const body = (await this.page.locator('body').innerText().catch(()=>'' )).slice(0,2500);
    if (/كلمة المرور.*(خطأ|غير صحيحة)|اسم المستخدم.*(خطأ|غير صحيح)|invalid credentials|incorrect password|wrong password/i.test(body)) {
      const e = new Error('INVALID_CREDENTIALS'); e.code = 'INVALID_CREDENTIALS'; throw e;
    }
    if (await this.page.locator(config.selectors.pass).count() && await this.firstVisible(config.selectors.pass)) {
      throw new Error('تعذر تأكيد تسجيل الدخول. راجع البيانات أو أكمل أي تحقق ظاهر يدويًا.');
    }
  }
  async readCurrentQuestion() {
    const radios = this.page.locator(config.selectors.option);
    const count = await radios.count();
    if (count < 2) return null;
    const options = [];
    for (let i=0; i<count; i++) {
      const radio = radios.nth(i);
      let label = '';
      const id = await radio.getAttribute('id');
      if (id) label = await this.page.locator(`label[for="${id.replace(/"/g,'\\"')}"]`).innerText().catch(()=> '');
      if (!label) label = await radio.locator('xpath=..').innerText().catch(()=> '');
      options.push(label.trim() || `اختيار ${i+1}`);
    }
    let question = '';
    const q = await this.firstVisible(config.selectors.question);
    if (q) question = (await q.innerText().catch(()=>'' )).trim();
    if (!question || question.length < 4) {
      question = (await this.page.locator('body').innerText()).slice(0,5000).trim();
      question = question.replace(options.join('\n'), '').trim();
    }
    return { question, options, radios };
  }
  async run() {
    await this.start();
    await this.onUpdate('تم تسجيل الدخول. أبحث عن السؤال الحالي...');
    let completed = 0;
    const seen = new Set();
    while (!this.stopped) {
      const current = await this.readCurrentQuestion();
      if (!current) {
        await this.onUpdate('لم أجد سؤال اختيار من متعدد مفتوحًا. أوقفت التشغيل بدل التخمين.');
        break;
      }
      const fingerprint = `${current.question}|${current.options.join('|')}`;
      if (seen.has(fingerprint)) {
        await this.onUpdate('السؤال الحالي لم يتغير بعد المحاولة السابقة؛ أوقفت التشغيل لمنع تكرار الإرسال.');
        break;
      }
      seen.add(fingerprint);
      await this.onUpdate(`أحلل السؤال ${completed+1} وأشرح الإجابة...`);
      const solution = await solveQuestion(current.question, current.options);
      await this.onUpdate(`السؤال ${completed+1}: ${solution.answer_text}\n\nالشرح: ${solution.explanation}\n\nجارٍ إرسال الإجابة للتدريب...`);
      const before = fingerprint;
      await current.radios.nth(solution.option_index).check();
      const submit = await this.firstVisible(config.selectors.answerSubmit);
      if (!submit) throw new Error('وجدت الإجابة لكن لم أجد زر إرسال/تحقق مناسبًا؛ لم أتابع للسؤال التالي.');
      await submit.click();
      await sleep(1800);
      const after = await this.readCurrentQuestion();
      const body = (await this.page.locator('body').innerText().catch(()=>'' )).slice(0,3500);
      const rejected = /إجابة خاطئة|غير صحيح|حاول مرة أخرى|incorrect|wrong answer/i.test(body);
      if (rejected) throw new Error('المنصة لم تقبل الإجابة. توقفت ولم أنتقل للسؤال التالي.');
      if (!after || `${after.question}|${after.options.join('|')}` === before) {
        throw new Error('لم أستطع التأكد أن المنصة قبلت الحل وفتحت السؤال التالي؛ توقفت دون تخطي السؤال.');
      }
      completed++;
      await this.onUpdate(`تم تأكيد انتقال المنصة للسؤال التالي. عدد الأسئلة المنجزة: ${completed}.`);
      await sleep(500);
    }
    return completed;
  }
  stop() { this.stopped = true; }
  async close() { this.stopped = true; if (this.browser) await this.browser.close().catch(()=>{}); }
}
module.exports = { QureoRunner };
