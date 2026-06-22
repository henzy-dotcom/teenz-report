const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// =====================================================================
//  링키영어 AI 챗봇 답변 설정
//  ★ 이 파일에서 답변 내용과 블로그 링크를 직접 수정하세요 ★
// =====================================================================

// ─── 버튼 정의 ────────────────────────────────────────────────────────
// type: 'msg'  → 버튼 클릭 시 해당 주제로 다음 답변
// type: 'form' → 상담 폼 열기
// type: 'link' → 외부 링크(블로그 등) 새 탭으로 열기

const BTN = {
  유치부:    { label: '👶 유치부 수업이 궁금해요',     type: 'msg' },
  초등부:    { label: '📚 초등부 수업이 궁금해요',     type: 'msg' },
  처음:      { label: '🌱 영어 처음 시작이에요',       type: 'msg' },
  레벨테스트:{ label: '📝 레벨테스트가 뭔가요?',       type: 'msg' },
  수강료:    { label: '💰 수강료가 궁금해요',          type: 'msg' },
  위치시간:  { label: '📍 위치/운영시간 알려주세요',   type: 'msg' },
  숙제:      { label: '📖 숙제는 얼마나 있나요?',      type: 'msg' },
  수업방식:  { label: '🎯 수업 방식이 어떻게 되나요?', type: 'msg' },
  파닉스:    { label: '🔤 파닉스가 약한데요',          type: 'msg' },
  읽기:      { label: '📗 읽기가 약한데요',            type: 'msg' },
  말하기:    { label: '🗣️ 말하기 자신감이 없어요',    type: 'msg' },
  다른질문:  { label: '💬 다른 질문이 있어요',         type: 'msg' },
  방문신청:  { label: '🏫 방문상담 신청할게요',        type: 'form', formType: '방문상담' },
  레벨신청:  { label: '✅ 레벨테스트 신청할게요',      type: 'form', formType: '레벨테스트' },
  등록문의:  { label: '✏️ 등록 문의하기',             type: 'form', formType: '바로 등록 문의' },
};

// 블로그 링크 버튼 만들기 (주소와 이름만 바꾸면 됨)
function blogBtn(label, url) {
  return { label, type: 'link', url };
}

// =====================================================================
//  ★★★ 여기서 답변을 수정하세요 ★★★
//
//  각 항목 구조:
//    reply   → 채팅에 나오는 짧은 답변 (2~3문장 권장)
//    buttons → 답변 아래 버튼 목록
//
//  블로그 링크 버튼 예시:
//    blogBtn('📝 블로그에서 자세히 보기', 'https://blog.naver.com/링크')
// =====================================================================

const ANSWERS = {

  // ── 인사/시작 ──────────────────────────────────────────────────────
  인사: {
    reply: '안녕하세요! 링키영어 진해남문점 상담 안내 데스크예요 😊\n궁금하신 내용을 선택해주세요!',
    buttons: [BTN.유치부, BTN.초등부, BTN.처음, BTN.레벨테스트, BTN.수강료, BTN.위치시간],
  },

  // ── 유치부 ────────────────────────────────────────────────────────
  유치부: {
    reply: '유치부는 듣기·말하기 중심으로 영어를 놀이처럼 배워요.\n파닉스도 재미있는 활동으로 진행돼요 😊',
    buttons: [
      BTN.숙제,
      BTN.수업방식,
      BTN.수강료,
      // ↓ 블로그 링크가 생기면 아래 주석 해제하고 주소 입력
      // blogBtn('📝 유치부 수업 더 알아보기', 'https://blog.naver.com/링크'),
      BTN.방문신청,
    ],
  },

  // ── 초등부 ────────────────────────────────────────────────────────
  초등부: {
    reply: '초등부는 파닉스부터 리딩·스피킹·단어까지 단계별로 배워요.\n영어 경험이 없어도 괜찮아요 😊',
    buttons: [
      BTN.파닉스,
      BTN.읽기,
      BTN.말하기,
      BTN.레벨테스트,
      // blogBtn('📝 초등부 커리큘럼 보기', 'https://blog.naver.com/링크'),
      BTN.방문신청,
    ],
  },

  // ── 영어 처음 ─────────────────────────────────────────────────────
  처음: {
    reply: '처음 시작하는 아이도 걱정 없어요!\n나이와 경험에 맞게 가장 편한 단계부터 시작해드려요 😊',
    buttons: [
      BTN.레벨신청,
      BTN.방문신청,
      BTN.유치부,
      BTN.초등부,
      // blogBtn('📝 영어 시작 가이드 보기', 'https://blog.naver.com/링크'),
    ],
  },

  // ── 파닉스 ────────────────────────────────────────────────────────
  파닉스: {
    reply: '파닉스는 영어 읽기의 기초예요.\n아직 시작 안 한 아이도, 중간에 막힌 아이도 단계에 맞게 진행해드려요 😊',
    buttons: [
      BTN.레벨신청,
      BTN.방문신청,
      // blogBtn('📝 파닉스 학습법 보기', 'https://blog.naver.com/링크'),
      BTN.다른질문,
    ],
  },

  // ── 읽기 ──────────────────────────────────────────────────────────
  읽기: {
    reply: '읽기가 약한 아이는 파닉스 확인부터 시작해서 단계별 리딩으로 자신감을 키워드려요 😊',
    buttons: [
      BTN.레벨신청,
      BTN.방문신청,
      // blogBtn('📝 리딩 학습 방법 보기', 'https://blog.naver.com/링크'),
      BTN.다른질문,
    ],
  },

  // ── 말하기 ────────────────────────────────────────────────────────
  말하기: {
    reply: '말하기 자신감은 충분한 듣기와 반복 연습으로 키울 수 있어요.\n수업 안에서 자연스럽게 스피킹을 연습해요 😊',
    buttons: [
      BTN.레벨신청,
      BTN.방문신청,
      // blogBtn('📝 스피킹 수업 방식 보기', 'https://blog.naver.com/링크'),
      BTN.다른질문,
    ],
  },

  // ── 레벨테스트 ────────────────────────────────────────────────────
  레벨테스트: {
    reply: '레벨테스트는 20~30분 내외로 부담 없이 진행돼요.\n아이에게 딱 맞는 반을 찾아드리기 위한 과정이에요 😊',
    buttons: [
      BTN.레벨신청,
      BTN.방문신청,
      // blogBtn('📝 레벨테스트 안내 자세히 보기', 'https://blog.naver.com/링크'),
      BTN.수강료,
      BTN.다른질문,
    ],
  },

  // ── 수업방식 ──────────────────────────────────────────────────────
  수업방식: {
    reply: '파닉스·리딩·스피킹·단어를 체계적으로 연결하는 커리큘럼이에요.\n자세한 내용은 방문상담 때 직접 보여드릴게요 😊',
    buttons: [
      BTN.숙제,
      BTN.수강료,
      // blogBtn('📝 수업 방식 자세히 보기', 'https://blog.naver.com/링크'),
      BTN.방문신청,
      BTN.다른질문,
    ],
  },

  // ── 숙제 ──────────────────────────────────────────────────────────
  숙제: {
    reply: '숙제는 복습 중심으로 부담스럽지 않게 구성돼요.\n레벨과 반에 따라 달라질 수 있어요 😊',
    buttons: [
      BTN.수업방식,
      // blogBtn('📝 숙제 방식 더 알아보기', 'https://blog.naver.com/링크'),
      BTN.방문신청,
      BTN.다른질문,
    ],
  },

  // ── 수강료 ────────────────────────────────────────────────────────
  수강료: {
    reply: '수강료는 반 구성과 수업 시간에 따라 달라져요.\n정확한 금액은 상담 시 안내드릴게요 😊',
    buttons: [
      BTN.방문신청,
      BTN.레벨신청,
      // blogBtn('📝 수강료 안내 보기', 'https://blog.naver.com/링크'),
      BTN.다른질문,
    ],
  },

  // ── 위치/운영시간 ─────────────────────────────────────────────────
  위치시간: {
    reply: '경남 창원시 진해구 남문동에 있어요.\n운영시간: 월~금 오후 2시~9시, 토 오전 10시~오후 2시 😊',
    buttons: [
      // blogBtn('🗺️ 네이버 지도로 보기', 'https://naver.me/링크'),
      BTN.방문신청,
      BTN.다른질문,
    ],
  },

  // ── 기타 (모든 키워드에 해당 안 될 때) ───────────────────────────
  기타: {
    reply: '아이 상황에 따라 더 정확히 안내드릴 수 있어요.\n아래에서 궁금하신 내용을 선택해주세요 😊',
    buttons: [BTN.유치부, BTN.초등부, BTN.레벨테스트, BTN.수강료, BTN.방문신청],
  },
};

// =====================================================================
//  키워드 → 답변 매핑 (수정 불필요)
// =====================================================================
function ruleBasedResponse(userMsg) {
  const msg = userMsg.toLowerCase().replace(/\s/g, '');

  if (/안녕|반가워|hello|hi|처음왔/.test(msg))                              return ANSWERS.인사;
  if (/수강료|비용|돈|얼마|가격|금액/.test(msg))                            return ANSWERS.수강료;
  if (/유치|유아|6살|7살|8살|어린이집|유치원|만5|만6|만7|유치부/.test(msg)) return ANSWERS.유치부;
  if (/초등|1학년|2학년|3학년|4학년|5학년|6학년|초1|초2|초3|초4|초5|초6|초등부/.test(msg)) return ANSWERS.초등부;
  if (/처음|시작|입문|기초|beginner|초보|안해봤|한번도/.test(msg))           return ANSWERS.처음;
  if (/파닉스|phonics/.test(msg))                                           return ANSWERS.파닉스;
  if (/읽기|리딩|reading/.test(msg))                                        return ANSWERS.읽기;
  if (/말하기|스피킹|speaking|발음|자신감/.test(msg))                       return ANSWERS.말하기;
  if (/레벨|테스트|level|수준|평가|진단/.test(msg))                         return ANSWERS.레벨테스트;
  if (/숙제|과제|homework/.test(msg))                                       return ANSWERS.숙제;
  if (/수업|방식|커리큘럼|교재|내용|진행/.test(msg))                        return ANSWERS.수업방식;
  if (/위치|어디|주소|오는길|찾아|운영시간|시간|몇시/.test(msg))            return ANSWERS.위치시간;
  if (/등록|신청|다니고싶|입학/.test(msg))                                  return { reply: '등록 문의는 아래 버튼으로 신청해주시면 연락드릴게요 😊', buttons: [BTN.등록문의, BTN.방문신청, BTN.레벨신청] };
  if (/다른|또|추가|더|궁금/.test(msg))                                     return ANSWERS.인사;

  return ANSWERS.기타;
}

// ─── Claude API 연동 (ANTHROPIC_API_KEY 설정 시 사용) ─────────────────
async function claudeResponse(messages, apiKey) {
  const systemPrompt = `당신은 링키영어 진해남문점의 유치부·초등부 신규생 상담 AI입니다.
친절하고 따뜻하게, 3~4문장 이내로 짧게 답변합니다.
수강료 금액, 반 배정, 레벨 단정, 학습 결과 보장은 절대 확정하지 않습니다.
확정이 필요한 내용은 "상담 시 확인 후 안내드릴게요"라고 말합니다.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });
  const data = await response.json();
  const reply = data.content?.[0]?.text || '죄송해요, 잠시 후 다시 시도해주세요.';

  const msg = messages[messages.length - 1].content.toLowerCase();
  let buttons = [BTN.방문신청, BTN.레벨신청, BTN.다른질문];
  if (/유치/.test(msg)) buttons = [BTN.숙제, BTN.수업방식, BTN.방문신청, BTN.다른질문];
  if (/초등/.test(msg)) buttons = [BTN.파닉스, BTN.읽기, BTN.레벨신청, BTN.방문신청];
  if (/레벨|테스트/.test(msg)) buttons = [BTN.레벨신청, BTN.방문신청, BTN.다른질문];

  return { reply, buttons };
}

async function getAIResponse(messages) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) return await claudeResponse(messages, apiKey);
  return ruleBasedResponse(messages[messages.length - 1].content);
}

// ─── 라우터 ───────────────────────────────────────────────────────────
module.exports = (db) => {
  router.get('/greeting', (req, res) => {
    res.json(ANSWERS.인사);
  });

  router.get('/chat/:sessionId', (req, res) => {
    const logs = db.prepare(
      'SELECT role, content, created_at FROM chat_logs WHERE session_id = ? ORDER BY id ASC'
    ).all(req.params.sessionId);
    res.json(logs);
  });

  router.post('/chat', async (req, res) => {
    const { sessionId, message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: '메시지를 입력해주세요.' });

    const sid = sessionId || uuidv4();
    const history = db.prepare(
      'SELECT role, content FROM chat_logs WHERE session_id = ? ORDER BY id ASC LIMIT 20'
    ).all(sid);

    db.prepare('INSERT INTO chat_logs (session_id, role, content) VALUES (?, ?, ?)').run(sid, 'user', message);

    try {
      const { reply, buttons } = await getAIResponse([...history, { role: 'user', content: message }]);
      db.prepare('INSERT INTO chat_logs (session_id, role, content) VALUES (?, ?, ?)').run(sid, 'assistant', reply);
      res.json({ sessionId: sid, reply, buttons });
    } catch (err) {
      console.error('AI 오류:', err);
      res.json({ sessionId: sid, reply: '잠시 오류가 발생했어요. 아래 버튼으로 신청해주세요 😊', buttons: [BTN.방문신청, BTN.레벨신청] });
    }
  });

  router.post('/submit', (req, res) => {
    const { student_name, grade, school, parent_name, parent_phone, english_exp, concerns, consult_type, preferred_time, source, note, consent, session_id } = req.body;

    if (!student_name || !parent_phone) return res.status(400).json({ error: '학생 이름과 학부모 연락처는 필수입니다.' });
    if (!consent) return res.status(400).json({ error: '개인정보 수집 동의가 필요합니다.' });

    const isPriority = ['방문상담','레벨테스트','바로 등록 문의','전화상담'].includes(consult_type) ? 1 : 0;

    let aiSummary = null;
    if (session_id) {
      const logs = db.prepare('SELECT role, content FROM chat_logs WHERE session_id = ? ORDER BY id ASC').all(session_id);
      if (logs.length > 0) {
        aiSummary = `AI 문의: ${logs.filter(l => l.role === 'user').map(l => l.content).slice(0, 3).join(' / ')}`;
      }
    }

    const result = db.prepare(`
      INSERT INTO consultations (student_name, grade, school, parent_name, parent_phone, english_exp, concerns, consult_type, preferred_time, source, note, consent, is_priority, ai_summary, session_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '신규 문의')
    `).run(student_name, grade||'', school||'', parent_name||'', parent_phone,
      JSON.stringify(english_exp||[]), JSON.stringify(concerns||[]),
      consult_type||'', preferred_time||'', source||'', note||'',
      consent?1:0, isPriority, aiSummary, session_id||null);

    if (session_id) {
      db.prepare('UPDATE chat_logs SET consultation_id = ? WHERE session_id = ?').run(result.lastInsertRowid, session_id);
    }

    res.json({ ok: true, id: result.lastInsertRowid });
  });

  return router;
};
