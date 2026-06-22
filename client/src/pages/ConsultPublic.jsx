import React, { useState, useRef, useEffect } from 'react';
import './ConsultPublic.css';

const API = import.meta.env.VITE_API_URL || '';

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function ConsultPublic() {
  const [step, setStep] = useState('home'); // home | chat | form | done
  const [consultType, setConsultType] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]); // { role, content, buttons? }
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // 채팅 진입 시 인사 메시지 로드
  async function loadGreeting() {
    try {
      const res = await fetch(`${API}/api/consult/greeting`);
      const data = await res.json();
      return { role: 'assistant', content: data.reply, buttons: data.buttons };
    } catch {
      return {
        role: 'assistant',
        content: '안녕하세요! 링키영어 진해남문점이에요 😊\n궁금하신 내용을 선택해주세요!',
        buttons: [],
      };
    }
  }

  async function enterChat() {
    setStep('chat');
    if (chatMessages.length > 0) return;
    const greeting = await loadGreeting();
    setChatMessages([greeting]);
  }

  // 처음 메뉴로 — 대화 기록은 유지하되 처음 버튼 메뉴를 아래에 다시 추가
  async function resetToMenu() {
    const greeting = await loadGreeting();
    setChatMessages(prev => {
      // 마지막 AI 메시지 버튼 제거
      const updated = prev.map((m, i) =>
        i === prev.length - 1 && m.role === 'assistant' ? { ...m, buttons: [] } : m
      );
      return [...updated, { role: 'assistant', content: '다른 궁금한 점이 있으시면 선택해주세요 😊', buttons: greeting.buttons }];
    });
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  async function sendChat(msg) {
    if (!msg.trim() || chatLoading) return;
    const userMsg = msg.trim();

    // 이전 마지막 AI 메시지의 버튼 제거 (선택 완료)
    setChatMessages(prev => {
      const updated = [...prev];
      if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
        updated[updated.length - 1] = { ...updated[updated.length - 1], buttons: [] };
      }
      return [...updated, { role: 'user', content: userMsg }];
    });

    setChatLoading(true);

    try {
      const res = await fetch(`${API}/api/consult/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: userMsg }),
      });
      const data = await res.json();
      setSessionId(data.sessionId);
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply, buttons: data.buttons || [] }]);
    } catch {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: '잠시 오류가 발생했어요. 아래 버튼으로 신청해주세요 😊',
        buttons: [],
      }]);
    } finally {
      setChatLoading(false);
    }
  }

  function handleButton(btn) {
    if (btn.type === 'form') {
      setConsultType(btn.formType);
      setStep('form');
    } else if (btn.type === 'link') {
      window.open(btn.url, '_blank', 'noopener');
    } else {
      sendChat(btn.label.replace(/^[^\s]+\s/, '')); // 이모지 제거 후 전송
    }
  }

  function goForm(type) {
    setConsultType(type);
    setStep('form');
  }

  return (
    <div className="cp-root">
      {step === 'home' && <HomeScreen onChat={enterChat} onForm={goForm} />}
      {step === 'chat' && (
        <ChatScreen
          messages={chatMessages}
          loading={chatLoading}
          chatEndRef={chatEndRef}
          onButton={handleButton}
          onSend={sendChat}
          onForm={goForm}
          onBack={() => setStep('home')}
          onReset={resetToMenu}
        />
      )}
      {step === 'form' && (
        <FormScreen
          consultType={consultType}
          sessionId={sessionId}
          onDone={() => setStep('done')}
          onBack={() => setStep(sessionId ? 'chat' : 'home')}
        />
      )}
      {step === 'done' && <DoneScreen />}
    </div>
  );
}

// ─── 홈 화면 ──────────────────────────────────────────────────────────────────
function HomeScreen({ onChat, onForm }) {
  return (
    <div className="cp-home">
      <div className="cp-hero">
        <div className="cp-hero-badge">링키영어 진해남문점</div>
        <h1 className="cp-hero-title">우리 아이 영어<br />지금 어떻게 시작하면 좋을까요?</h1>
        <p className="cp-hero-sub">유치부·초등부 아이에게 맞는 학습 방향을<br />부담 없이 안내드릴게요.</p>
        <div className="cp-hero-chips">
          <span className="cp-chip">🌱 유치부</span>
          <span className="cp-chip">📚 초등부</span>
          <span className="cp-chip">🔤 파닉스</span>
          <span className="cp-chip">🗣️ 스피킹</span>
        </div>
      </div>

      <div className="cp-section">
        <div className="cp-ai-box" onClick={onChat}>
          <div className="cp-ai-icon">💬</div>
          <div className="cp-ai-text">
            <div className="cp-ai-title">AI에게 궁금한 점 물어보기</div>
            <div className="cp-ai-sub">버튼 탭 하나로 바로 안내받을 수 있어요</div>
          </div>
          <div className="cp-ai-arrow">›</div>
        </div>
      </div>

      <div className="cp-section">
        <div className="cp-section-label">상담 신청하기</div>
        <button className="cp-btn cp-btn-primary" onClick={() => onForm('방문상담')}>
          <span>🏫</span> 방문상담 예약하기
        </button>
        <button className="cp-btn cp-btn-secondary" onClick={() => onForm('레벨테스트')}>
          <span>📝</span> 레벨테스트 신청하기
        </button>
        <button className="cp-btn cp-btn-outline" onClick={() => onForm('바로 등록 문의')}>
          <span>✏️</span> 바로 등록 문의하기
        </button>
      </div>

      <div className="cp-section">
        <div className="cp-section-label">상담 절차</div>
        <div className="cp-steps-row">
          {[
            { icon: '💬', label: '문의 접수', desc: 'AI 안내 또는\n폼 제출' },
            { icon: '📞', label: '연락 드려요', desc: '24시간 내\n연락 드려요' },
            { icon: '🏫', label: '방문 상담', desc: '원에서\n직접 상담' },
            { icon: '🎯', label: '레벨 확인', desc: '딱 맞는 반\n편성' },
          ].map((s, i) => (
            <div key={i} className="cp-step-item">
              <div className="cp-step-icon">{s.icon}</div>
              <div className="cp-step-label">{s.label}</div>
              <div className="cp-step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="cp-section">
        <div className="cp-section-label">오시는 길</div>
        <div className="cp-info-card">
          <div className="cp-info-row">
            <span className="cp-info-icon">📍</span>
            <div>
              <div className="cp-info-main">링키영어 진해남문점</div>
              <div className="cp-info-sub">경남 창원시 진해구 남문동</div>
            </div>
          </div>
          <div className="cp-info-row">
            <span className="cp-info-icon">🕐</span>
            <div>
              <div className="cp-info-main">운영시간</div>
              <div className="cp-info-sub">월~금 14:00~21:00 · 토 10:00~14:00</div>
            </div>
          </div>
        </div>
      </div>

      <div className="cp-footer">링키영어 진해남문점 · 유치부·초등부 전문</div>
    </div>
  );
}

// ─── AI 채팅 화면 (카카오톡 스타일 버튼) ──────────────────────────────────────
function ChatScreen({ messages, loading, chatEndRef, onButton, onSend, onForm, onBack, onReset }) {
  const [input, setInput] = useState('');

  return (
    <div className="cp-chat-root">
      {/* 헤더 */}
      <div className="cp-chat-header">
        <button className="cp-back-btn" onClick={onBack}>‹</button>
        <div className="cp-chat-header-info">
          <div className="cp-chat-ai-dot" />
          <div>
            <div className="cp-chat-title">링키영어 AI 안내</div>
            <div className="cp-chat-subtitle">버튼을 눌러 질문해주세요</div>
          </div>
        </div>
        <button className="cp-reset-btn" onClick={onReset} title="처음 메뉴로">
          🏠 처음으로
        </button>
      </div>

      {/* 메시지 목록 */}
      <div className="cp-chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`cp-msg-wrap cp-msg-wrap-${m.role}`}>
            {/* 말풍선 */}
            <div className={`cp-msg cp-msg-${m.role}`}>
              {m.role === 'assistant' && <div className="cp-msg-avatar">AI</div>}
              <div className="cp-msg-bubble">
                {m.content.split('\n').map((line, j, arr) => (
                  <React.Fragment key={j}>
                    {line}{j < arr.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* 버튼 (AI 메시지에만, 버튼이 있을 때만) */}
            {m.role === 'assistant' && m.buttons && m.buttons.length > 0 && (
              <div className="cp-btn-group">
                {m.buttons.map((btn, bi) => (
                  <button
                    key={bi}
                    className={`cp-kakao-btn ${btn.type === 'form' ? 'cp-kakao-btn-cta' : btn.type === 'link' ? 'cp-kakao-btn-link' : ''}`}
                    onClick={() => onButton(btn)}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="cp-msg-wrap cp-msg-wrap-assistant">
            <div className="cp-msg cp-msg-assistant">
              <div className="cp-msg-avatar">AI</div>
              <div className="cp-msg-bubble cp-msg-loading">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* 직접 입력창 (선택 사항) */}
      <div className="cp-chat-input-row">
        <input
          className="cp-chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { onSend(input); setInput(''); } }}
          placeholder="직접 입력도 가능해요..."
          disabled={loading}
        />
        <button
          className="cp-chat-send"
          onClick={() => { onSend(input); setInput(''); }}
          disabled={!input.trim() || loading}
        >전송</button>
      </div>
    </div>
  );
}

// ─── 상담 폼 ───────────────────────────────────────────────────────────────────
function FormScreen({ consultType, sessionId, onDone, onBack }) {
  const [form, setForm] = useState({
    student_name: '', grade: '', school: '',
    parent_name: '', parent_phone: '',
    english_exp: [], concerns: [],
    consult_type: consultType || '',
    preferred_time: '', source: '', note: '',
    consent: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function toggle(field, value) {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(value) ? f[field].filter(v => v !== value) : [...f[field], value],
    }));
  }

  function validate() {
    const e = {};
    if (!form.student_name.trim()) e.student_name = '학생 이름을 입력해주세요';
    if (!form.parent_phone.trim()) e.parent_phone = '연락처를 입력해주세요';
    if (!form.consent) e.consent = '개인정보 수집에 동의해주세요';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/consult/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, session_id: sessionId }),
      });
      if (res.ok) onDone();
      else { const d = await res.json(); alert(d.error || '오류가 발생했어요.'); }
    } catch { alert('오류가 발생했어요. 다시 시도해주세요.'); }
    finally { setLoading(false); }
  }

  const englishExpOptions = ['처음', '파닉스 경험 있음', '학원 경험 있음', '영어유치원/어학원 경험', '기타'];
  const concernOptions = ['영어를 처음 시작', '파닉스가 약함', '읽기가 약함', '말하기 자신감 부족', '단어 암기 어려움', '학습 습관 부족', '기존 학원 적응 어려움', '기타'];
  const consultTypes = ['방문상담', '전화상담', '레벨테스트', '바로 등록 문의'];
  const sourceOptions = ['지인 소개', '블로그', '인스타그램', '네이버 플레이스', '카카오톡', '전단지/현수막', '기타'];

  return (
    <div className="cp-form-root">
      <div className="cp-form-header">
        <button className="cp-back-btn" onClick={onBack}>‹</button>
        <div className="cp-form-header-title">상담 신청</div>
      </div>

      <div className="cp-form-body">
        <div className="cp-form-desc">
          접수 후 <strong>24시간 내</strong>에 연락드릴게요.<br />
          필수 항목(*)만 입력하셔도 됩니다.
        </div>

        <div className="cp-form-section">
          <div className="cp-form-section-title">아이 정보</div>
          <label className="cp-label">학생 이름 <span className="cp-required">*</span></label>
          <input className={`cp-input ${errors.student_name ? 'cp-input-error' : ''}`}
            placeholder="홍길동" value={form.student_name}
            onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))} />
          {errors.student_name && <div className="cp-error">{errors.student_name}</div>}

          <label className="cp-label">나이 / 학년</label>
          <select className="cp-input" value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}>
            <option value="">선택해주세요</option>
            {['6세','7세','8세(초1)','9세(초2)','10세(초3)','11세(초4)','12세(초5)','13세(초6)'].map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <label className="cp-label">유치원 / 학교</label>
          <input className="cp-input" placeholder="○○유치원 / ○○초등학교"
            value={form.school} onChange={e => setForm(f => ({ ...f, school: e.target.value }))} />
        </div>

        <div className="cp-form-section">
          <div className="cp-form-section-title">학부모 정보</div>
          <label className="cp-label">학부모 이름</label>
          <input className="cp-input" placeholder="홍어머니"
            value={form.parent_name} onChange={e => setForm(f => ({ ...f, parent_name: e.target.value }))} />

          <label className="cp-label">연락처 <span className="cp-required">*</span></label>
          <input className={`cp-input ${errors.parent_phone ? 'cp-input-error' : ''}`}
            type="tel" placeholder="010-0000-0000"
            value={form.parent_phone} onChange={e => setForm(f => ({ ...f, parent_phone: e.target.value }))} />
          {errors.parent_phone && <div className="cp-error">{errors.parent_phone}</div>}
        </div>

        <div className="cp-form-section">
          <div className="cp-form-section-title">영어 학습 경험</div>
          <div className="cp-chip-group">
            {englishExpOptions.map(opt => (
              <button key={opt} className={`cp-chip-toggle ${form.english_exp.includes(opt) ? 'active' : ''}`}
                onClick={() => toggle('english_exp', opt)}>{opt}</button>
            ))}
          </div>
        </div>

        <div className="cp-form-section">
          <div className="cp-form-section-title">현재 고민 (복수 선택 가능)</div>
          <div className="cp-chip-group">
            {concernOptions.map(opt => (
              <button key={opt} className={`cp-chip-toggle ${form.concerns.includes(opt) ? 'active' : ''}`}
                onClick={() => toggle('concerns', opt)}>{opt}</button>
            ))}
          </div>
        </div>

        <div className="cp-form-section">
          <div className="cp-form-section-title">희망 상담 방식</div>
          <div className="cp-radio-group">
            {consultTypes.map(opt => (
              <label key={opt} className={`cp-radio-item ${form.consult_type === opt ? 'active' : ''}`}>
                <input type="radio" name="consult_type" value={opt}
                  checked={form.consult_type === opt}
                  onChange={() => setForm(f => ({ ...f, consult_type: opt }))} />
                {opt}
              </label>
            ))}
          </div>
        </div>

        <div className="cp-form-section">
          <div className="cp-form-section-title">희망 요일/시간</div>
          <input className="cp-input" placeholder="예: 화·목 오후 4시, 주말 오전 등"
            value={form.preferred_time} onChange={e => setForm(f => ({ ...f, preferred_time: e.target.value }))} />
        </div>

        <div className="cp-form-section">
          <div className="cp-form-section-title">어떻게 알게 되셨나요?</div>
          <div className="cp-chip-group">
            {sourceOptions.map(opt => (
              <button key={opt} className={`cp-chip-toggle ${form.source === opt ? 'active' : ''}`}
                onClick={() => setForm(f => ({ ...f, source: opt }))}>{opt}</button>
            ))}
          </div>
        </div>

        <div className="cp-form-section">
          <div className="cp-form-section-title">남기고 싶은 말</div>
          <textarea className="cp-input cp-textarea"
            placeholder="아이에 대해 더 알려주시면 상담에 도움이 돼요."
            value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
        </div>

        <div className="cp-form-section">
          <label className={`cp-consent ${errors.consent ? 'cp-consent-error' : ''}`}>
            <input type="checkbox" checked={form.consent}
              onChange={e => setForm(f => ({ ...f, consent: e.target.checked }))} />
            <span>상담 목적의 개인정보(이름, 연락처) 수집 및 연락에 동의합니다. <span className="cp-required">*</span></span>
          </label>
          {errors.consent && <div className="cp-error">{errors.consent}</div>}
        </div>

        <button className="cp-submit-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? '접수 중...' : '상담 신청 완료하기'}
        </button>
      </div>
    </div>
  );
}

// ─── 접수 완료 ─────────────────────────────────────────────────────────────────
function DoneScreen() {
  return (
    <div className="cp-done">
      <div className="cp-done-icon">✅</div>
      <h2 className="cp-done-title">상담 신청이 접수됐어요!</h2>
      <p className="cp-done-desc">
        확인 후 <strong>24시간 내</strong>에 연락드릴게요.<br />
        궁금한 점이 있으시면 AI 문의를 이용해주세요.
      </p>
      <div className="cp-done-card">
        <div className="cp-done-card-title">링키영어 진해남문점</div>
        <div className="cp-done-card-sub">유치부·초등부 전문 영어학원</div>
        <div className="cp-done-card-sub">월~금 14:00~21:00 · 토 10:00~14:00</div>
      </div>
      <button className="cp-btn cp-btn-secondary" style={{ marginTop: 24 }}
        onClick={() => window.location.reload()}>처음으로 돌아가기</button>
    </div>
  );
}
