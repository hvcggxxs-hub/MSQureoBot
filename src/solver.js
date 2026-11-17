const { GoogleGenAI } = require('@google/genai');
const config = require('./config');
const ai = new GoogleGenAI({ apiKey: config.geminiKey });

async function solveQuestion(question, options) {
  const prompt = `أنت مساعد تعليمي يشرح تدريبات غير مُقيّمة. حل السؤال اعتمادًا على نصه والاختيارات فقط. لا تخمّن. أعد JSON صالحًا فقط بهذا الشكل: {"option_index": رقم يبدأ من 0, "answer_text":"نص الاختيار", "explanation":"شرح عربي واضح ومختصر", "confidence": رقم من 0 إلى 1, "needs_clarification": true أو false}. إذا كان السؤال ناقصًا أو لا توجد إجابة موثوقة فاجعل needs_clarification=true و option_index=-1.\n\nالسؤال:\n${question}\n\nالاختيارات:\n${options.map((x,i)=>`${i}. ${x}`).join('\n')}`;
  let response;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await ai.models.generateContent({
        model: config.model,
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.1 }
      });
      break;
    } catch (e) {
      const message = String(e.message || '');
      const status = Number(e.status || e.statusCode || (message.match(/"code"\s*:\s*(\d+)/) || [])[1]);
      const temporary = [429, 500, 502, 503, 504].includes(status);
      if (!temporary || attempt === 3) throw e;
      await new Promise(resolve => setTimeout(resolve, attempt * 3000));
    }
  }
  const raw = response.text || '';
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw new Error('Gemini returned an unreadable response.'); }
  if (parsed.needs_clarification || !Number.isInteger(parsed.option_index) || parsed.option_index < 0 || parsed.option_index >= options.length || Number(parsed.confidence) < 0.65) {
    throw new Error('لم أتمكن من تحديد إجابة موثوقة؛ أوقفت التقدم حتى لا يتم تخطي السؤال.');
  }
  return parsed;
}

async function answerChat(message, history = []) {
  const response = await ai.models.generateContent({
    model: config.model,
    contents: [
      ...history,
      { role: 'user', parts: [{ text: message }] }
    ],
    config: {
      systemInstruction: 'أنت مساعد ذكي باسم ذكاء محمد سالمان. تحدث باللغة العربية بأسلوب واضح وودود، وأجب بدقة. إذا لم تعرف الإجابة فقل ذلك بوضوح.',
      temperature: 0.7
    }
  });

  const answer = String(response.text || '').trim();
  if (!answer) throw new Error('لم يصل رد من Gemini.');
  return answer;
}

module.exports = { solveQuestion, answerChat };

