const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// DB에서 답변 읽기
function getAnswer(db, key) {
  const row = db.prepare('SELECT reply, buttons FROM chat_answers WHERE key = ?').get(key);
  if (!row) return null;
  try { return { reply: row.reply, buttons: JSON.parse(row.buttons) }; } catch { return { reply: row.reply, buttons: [] }; }
}

// 키워드 → key 매핑
function matchKey(userMsg) {
  const msg = userMsg.toLowerCase().replace(/\s/g, '');
  if (/안녕|반가워|hello|hi|처음왔/.test(msg))                              return '인사';
  if (/수강료|비용|돈|얼마|가격|금액/.test(msg))                            return '수강료';
  if (/유치|유아|6살|7살|8살|어린이집|유치원|만5|만6|만7|유치부/.test(msg)) return '유치부';
  if (/초등|1학년|2학년|3학년|4학년|5학년|6학년|초1|초2|초3|초4|초5|초6|초등부/.test(msg)) return '초등부';
  if (/처음|시작|입문|기초|beginner|초보|안해봤|한번도/.test(msg))           return '처음';
  if (/파닉스|phonics/.test(msg))                                           return '파닉스';
  if (/읽기|리딩|reading/.test(msg))                                        return '읽기';
  if (/말하기|스피킹|speaking|발음|자신감/.test(msg))                       return '말하기';
  if (/레벨|테스트|level|수준|평가|진단/.test(msg))                         return '레벨테스트';
  if (/숙제|과제|homework/.test(msg))                                       return '숙제';
  if (/수업|방식|커리큘럼|교재|내용|진행/.test(msg))                        return '수업방식';
  if (/위치|어디|주소|오는길|찾아|운영시간|시간|몇시/.test(msg))            return '위치시간';
  if (/차량|픽업|pickup|차로데려|데려다|통학|셔틀/.test(msg))               return '차량픽업';
  if (/다른|또|추가|더|궁금/.test(msg))                                     return '인사';
  return '기타';
}

// Claude API 응답
async function claudeResponse(messages, apiKey, db) {
  const systemPrompt = `당신은 링키영어 진해남문점의 유치부·초등부 신규생 상담 AI입니다.
친절하고 따뜻하게, 3~4문장 이내로 짧게 답변합니다.
수강료 금액, 반 배정, 레벨 단정, 학습 결과 보장은 절대 확정하지 않습니다.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 300, system: systemPrompt, messages: messages.map(m => ({ role: m.role, content: m.content })) }),
  });
  const data = await response.json();
  const reply = data.content?.[0]?.text || '죄송해요, 잠시 후 다시 시도해주세요.';

  const msg = messages[messages.length - 1].content.toLowerCase();
  let key = matchKey(msg);
  const fallback = getAnswer(db, key) || getAnswer(db, '기타');
  return { reply, buttons: fallback?.buttons || [] };
}

module.exports = (db) => {
  // 인사 (첫 진입)
  router.get('/greeting', (req, res) => {
    const answer = getAnswer(db, '인사') || { reply: '안녕하세요! 링키영어 진해남문점이에요 😊', buttons: [] };
    res.json(answer);
  });

  // 기존 대화 불러오기
  router.get('/chat/:sessionId', (req, res) => {
    const logs = db.prepare('SELECT role, content, created_at FROM chat_logs WHERE session_id = ? ORDER BY id ASC').all(req.params.sessionId);
    res.json(logs);
  });

  // AI 대화
  router.post('/chat', async (req, res) => {
    const { sessionId, message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: '메시지를 입력해주세요.' });

    const sid = sessionId || uuidv4();
    const history = db.prepare('SELECT role, content FROM chat_logs WHERE session_id = ? ORDER BY id ASC LIMIT 20').all(sid);
    db.prepare('INSERT INTO chat_logs (session_id, role, content) VALUES (?, ?, ?)').run(sid, 'user', message);

    try {
      let result;
      if (process.env.ANTHROPIC_API_KEY) {
        result = await claudeResponse([...history, { role: 'user', content: message }], process.env.ANTHROPIC_API_KEY, db);
      } else {
        const key = matchKey(message);
        result = getAnswer(db, key) || getAnswer(db, '기타') || { reply: '궁금하신 점을 선택해주세요 😊', buttons: [] };
      }
      db.prepare('INSERT INTO chat_logs (session_id, role, content) VALUES (?, ?, ?)').run(sid, 'assistant', result.reply);
      res.json({ sessionId: sid, ...result });
    } catch (err) {
      console.error('AI 오류:', err);
      res.json({ sessionId: sid, reply: '잠시 오류가 발생했어요 😊', buttons: [] });
    }
  });

  // 상담 폼 제출
  router.post('/submit', (req, res) => {
    const { student_name, grade, school, parent_name, parent_phone, english_exp, concerns, consult_type, preferred_time, source, note, consent, session_id } = req.body;
    if (!student_name || !parent_phone) return res.status(400).json({ error: '학생 이름과 학부모 연락처는 필수입니다.' });
    if (!consent) return res.status(400).json({ error: '개인정보 수집 동의가 필요합니다.' });

    const isPriority = ['방문상담','레벨테스트','바로 등록 문의','전화상담'].includes(consult_type) ? 1 : 0;
    let aiSummary = null;
    if (session_id) {
      const logs = db.prepare('SELECT role, content FROM chat_logs WHERE session_id = ?').all(session_id);
      if (logs.length) aiSummary = `AI 문의: ${logs.filter(l => l.role==='user').map(l=>l.content).slice(0,3).join(' / ')}`;
    }

    const result = db.prepare(`
      INSERT INTO consultations (student_name,grade,school,parent_name,parent_phone,english_exp,concerns,consult_type,preferred_time,source,note,consent,is_priority,ai_summary,session_id,status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'신규 문의')
    `).run(student_name,grade||'',school||'',parent_name||'',parent_phone,
      JSON.stringify(english_exp||[]),JSON.stringify(concerns||[]),
      consult_type||'',preferred_time||'',source||'',note||'',
      consent?1:0,isPriority,aiSummary,session_id||null);

    if (session_id) db.prepare('UPDATE chat_logs SET consultation_id=? WHERE session_id=?').run(result.lastInsertRowid, session_id);
    res.json({ ok: true, id: result.lastInsertRowid });
  });

  return router;
};
