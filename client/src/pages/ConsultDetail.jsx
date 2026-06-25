import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

const STATUS_FLOW = ['신규 문의', '연락 중', '상담 예약', '방문 완료', '등록 완료'];
const STATUS_END  = ['보류', '미등록'];
const STATUS_LIST = [...STATUS_FLOW, ...STATUS_END];
const STATUS_COLOR = {
  '신규 문의': { bg: '#EBF8FD', color: '#1a6e8f', border: '#7EC8E3' },
  '연락 중':   { bg: '#FEF3C7', color: '#92400E', border: '#F0C060' },
  '상담 예약': { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD' },
  '방문 완료': { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
  '등록 완료': { bg: '#B8E8D8', color: '#065F46', border: '#34D399' },
  '보류':      { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
  '미등록':    { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
};

const MESSAGE_TEMPLATES = {
  '상담 접수 확인': (name) => `안녕하세요 😊 링키영어 진해남문점입니다.\n${name}학생 상담 신청 주셔서 연락드립니다.\n내용 확인 후 빠르게 안내드릴게요!`,
  '방문상담 일정 제안': (name) => `안녕하세요! 링키영어 진해남문점입니다.\n${name}학생 방문상담 일정 말씀드릴게요.\n희망하시는 시간을 알려주시면 조율해드릴게요 😊`,
  '레벨테스트 안내': (name) => `안녕하세요! 링키영어 진해남문점입니다.\n${name}학생 레벨테스트 일정 안내드릴게요.\n부담 없이 20~30분 내로 진행돼요. 가능한 날짜 알려주세요 😊`,
  '미응답 재연락': (name) => `안녕하세요! 링키영어 진해남문점입니다.\n${name}학생 상담 관련해서 연락드렸는데 아직 확인이 안 되셨나요?\n편하신 시간에 답장 주세요 😊`,
  '등록 안내': (name) => `안녕하세요! 링키영어 진해남문점입니다.\n${name}학생 등록 관련 안내드리려고 연락드렸어요.\n궁금한 점 있으시면 편하게 말씀해주세요 😊`,
};

const CONTACT_TYPES = ['전화', '카카오톡', '방문', '기타'];

function parseArr(str) { try { return JSON.parse(str) || []; } catch { return str ? [str] : []; } }

function Field({ label, value, children }) {
  if (!value && !children) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      {children || <div style={{ fontSize: 14, color: '#2C2C2C' }}>{value}</div>}
    </div>
  );
}

function TagList({ items, color = '#D8CCF1', textColor = '#6B4FA0', borderColor = '#CBB7E8' }) {
  if (!items?.length) return <span style={{ fontSize: 13, color: '#9CA3AF' }}>-</span>;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {items.map((it, i) => (
        <span key={i} style={{ background: color, color: textColor, border: `1px solid ${borderColor}`, borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>{it}</span>
      ))}
    </div>
  );
}

export default function ConsultDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ status: '', memo: '', next_contact: '', result: '', recommended: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showFullChat, setShowFullChat] = useState(false);
  const [msgTemplate, setMsgTemplate] = useState('');
  const [copied, setCopied] = useState(false);
  const [newLog, setNewLog] = useState({ content: '', contact_type: '전화' });
  const [addingLog, setAddingLog] = useState(false);

  async function load() {
    const d = await fetch(`${API}/api/admin/consult/${id}`).then(r => r.json());
    setData(d);
    setForm({ status: d.status || '신규 문의', memo: d.memo || '', next_contact: d.next_contact || '', result: d.result || '', recommended: d.recommended || '' });
  }

  useEffect(() => { load(); }, [id]);

  async function save(overrides = {}) {
    setSaving(true);
    await fetch(`${API}/api/admin/consult/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, ...overrides }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    if (overrides.status) setForm(f => ({ ...f, status: overrides.status }));
  }

  async function handleDelete() {
    if (!confirm('이 상담 건을 삭제할까요?')) return;
    await fetch(`${API}/api/admin/consult/${id}`, { method: 'DELETE' });
    navigate('/admin/consult');
  }

  async function addContactLog() {
    if (!newLog.content.trim()) return;
    setAddingLog(true);
    await fetch(`${API}/api/admin/consult/${id}/contact-logs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog),
    });
    setNewLog({ content: '', contact_type: '전화' });
    setAddingLog(false);
    load();
  }

  async function deleteContactLog(logId) {
    if (!confirm('이 이력을 삭제할까요?')) return;
    await fetch(`${API}/api/admin/consult/${id}/contact-logs/${logId}`, { method: 'DELETE' });
    load();
  }

  function copyMessage() {
    const text = MESSAGE_TEMPLATES[msgTemplate]?.(data?.student_name || '');
    if (text) { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>불러오는 중...</div>;

  const concerns = parseArr(data.concerns);
  const englishExp = parseArr(data.english_exp);
  const chatLogs = data.chatLogs || [];
  const contactLogs = data.contactLogs || [];
  const displayedLogs = showFullChat ? chatLogs : chatLogs.slice(-6);
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = form.next_contact && form.next_contact < today && !['등록 완료','미등록','보류'].includes(form.status);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px 60px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/admin/consult')}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6B7280', padding: '4px 8px' }}>‹ 목록</button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#2B3660' }}>{data.student_name}</h1>
            {data.grade && <span style={{ fontSize: 13, color: '#6B7280' }}>{data.grade}</span>}
            {(() => { const s = STATUS_COLOR[form.status]; return s ? (
              <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>{form.status}</span>
            ) : null; })()}
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>
            접수: {new Date(data.created_at).toLocaleString('ko-KR')}
          </div>
        </div>
        <button onClick={handleDelete} style={{ padding: '7px 14px', background: '#FEE2E2', border: 'none', borderRadius: 8, color: '#991B1B', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>삭제</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
        {/* 왼쪽 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* 학생/학부모 정보 */}
          <div style={card}>
            <div style={title}>학생 · 학부모 정보</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="학생 이름" value={data.student_name} />
              <Field label="나이/학년" value={data.grade || '-'} />
              <Field label="유치원/학교" value={data.school || '-'} />
              <Field label="학부모" value={data.parent_name || '-'} />
              <Field label="연락처" value={data.parent_phone} />
              <Field label="희망 시간" value={data.preferred_time || '-'} />
            </div>
            <Field label="유입 경로" value={data.source || '-'} />
          </div>

          {/* 영어 경험/고민 */}
          <div style={card}>
            <div style={title}>영어 경험 · 현재 고민</div>
            <Field label="영어 학습 경험"><TagList items={englishExp} color="#EBF8FD" textColor="#1a6e8f" borderColor="#7EC8E3" /></Field>
            <Field label="현재 고민"><TagList items={concerns} /></Field>
            <Field label="희망 상담 방식" value={data.consult_type || '-'} />
            {data.note && <Field label="남긴 말" value={data.note} />}
          </div>

          {/* 연락 이력 */}
          <div style={card}>
            <div style={title}>연락 이력</div>

            {/* 이력 추가 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <select value={newLog.contact_type} onChange={e => setNewLog(p => ({ ...p, contact_type: e.target.value }))}
                style={{ padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, flexShrink: 0 }}>
                {CONTACT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <input value={newLog.content} onChange={e => setNewLog(p => ({ ...p, content: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addContactLog()}
                placeholder="연락 내용 입력 후 Enter..."
                style={{ flex: 1, padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none' }} />
              <button onClick={addContactLog} disabled={addingLog}
                style={{ padding: '8px 14px', background: '#2B3660', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>
                추가
              </button>
            </div>

            {/* 이력 목록 */}
            {contactLogs.length === 0 ? (
              <div style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '16px 0' }}>연락 이력이 없어요</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {contactLogs.map(log => (
                  <div key={log.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #F0F0F0' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#2B3660', borderRadius: 6, padding: '2px 7px', flexShrink: 0, marginTop: 1 }}>{log.contact_type}</span>
                    <span style={{ flex: 1, fontSize: 13, color: '#2C2C2C', lineHeight: 1.5 }}>{log.content}</span>
                    <span style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0, marginTop: 1 }}>
                      {new Date(log.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </span>
                    <button onClick={() => deleteContactLog(log.id)}
                      style={{ background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 15, flexShrink: 0, padding: 0, lineHeight: 1 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI 채팅 */}
          {chatLogs.length > 0 && (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={title}>AI 채팅 내용</div>
                <button onClick={() => setShowFullChat(v => !v)}
                  style={{ background: 'none', border: 'none', fontSize: 12, color: '#7EC8E3', cursor: 'pointer', fontWeight: 600 }}>
                  {showFullChat ? '간략히' : `전체 (${chatLogs.length}개)`}
                </button>
              </div>
              {data.ai_summary && (
                <div style={{ background: '#F3EEFF', border: '1px solid #CBB7E8', borderRadius: 10, padding: '10px 13px', fontSize: 13, color: '#6B4FA0', marginBottom: 10, fontStyle: 'italic' }}>
                  {data.ai_summary}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {!showFullChat && chatLogs.length > 6 && <div style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF' }}>— 최근 6개 —</div>}
                {displayedLogs.map((log, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, justifyContent: log.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {log.role === 'assistant' && <div style={{ width: 24, height: 24, background: '#D8CCF1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#6B4FA0', flexShrink: 0 }}>AI</div>}
                    <div style={{ background: log.role === 'user' ? '#EBF8FD' : '#F9FAFB', color: '#2C2C2C', border: `1px solid ${log.role === 'user' ? '#7EC8E3' : '#E5E7EB'}`, borderRadius: 12, padding: '7px 12px', fontSize: 13, lineHeight: 1.5, maxWidth: '80%' }}>
                      {log.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 오른쪽: 상담 관리 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* 상태 흐름 */}
          <div style={card}>
            <div style={title}>상담 단계</div>
            {/* 단계 진행 버튼 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {STATUS_FLOW.map((s, idx) => {
                const currentIdx = STATUS_FLOW.indexOf(form.status);
                const isActive = form.status === s;
                const isDone = currentIdx > idx;
                return (
                  <button key={s} onClick={() => save({ status: s })}
                    style={{
                      width: '100%', padding: '10px 14px', border: 'none', borderRadius: 10, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: isActive ? STATUS_COLOR[s]?.bg || '#F3F4F6' : isDone ? '#F0FFF8' : '#F9FAFB',
                      fontWeight: isActive ? 800 : 500,
                      color: isActive ? STATUS_COLOR[s]?.color || '#2B3660' : isDone ? '#6EE7B7' : '#9CA3AF',
                      border: isActive ? `2px solid ${STATUS_COLOR[s]?.border || '#E5E7EB'}` : '1px solid #F0F0F0',
                    }}>
                    <span style={{ fontSize: 14 }}>{isDone ? '✓' : isActive ? '▶' : `${idx + 1}`}</span>
                    <span style={{ fontSize: 13 }}>{s}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {STATUS_END.map(s => (
                <button key={s} onClick={() => save({ status: s })}
                  style={{
                    padding: '9px', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                    background: form.status === s ? STATUS_COLOR[s]?.bg : '#F9FAFB',
                    color: form.status === s ? STATUS_COLOR[s]?.color : '#9CA3AF',
                    border: form.status === s ? `2px solid ${STATUS_COLOR[s]?.border}` : '1px solid #F0F0F0',
                  }}>{s}</button>
              ))}
            </div>
          </div>

          {/* 다음 연락일 */}
          <div style={card}>
            <div style={title}>다음 연락일</div>
            <input type="date" value={form.next_contact} onChange={e => setForm(f => ({ ...f, next_contact: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', border: isOverdue ? '2px solid #FCA5A5' : '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: isOverdue ? '#DC2626' : '#2C2C2C', fontWeight: isOverdue ? 700 : 400 }} />
            {isOverdue && <div style={{ fontSize: 12, color: '#DC2626', marginTop: 6, fontWeight: 600 }}>⚠️ 연락일이 지났어요</div>}
          </div>

          {/* 상담 메모 */}
          <div style={card}>
            <div style={title}>상담 내용</div>
            <label style={lbl}>추천 반/방향</label>
            <input value={form.recommended} onChange={e => setForm(f => ({ ...f, recommended: e.target.value }))}
              placeholder="예: 파닉스 A반" style={inp} />
            <label style={{ ...lbl, marginTop: 10 }}>상담 결과</label>
            <textarea value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))}
              placeholder="방문 후 결과, 반응 등..."
              style={{ ...inp, minHeight: 70, resize: 'vertical' }} />
            <label style={{ ...lbl, marginTop: 10 }}>메모</label>
            <textarea value={form.memo} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
              placeholder="특이사항, 통화 내용..."
              style={{ ...inp, minHeight: 80, resize: 'vertical' }} />
            <button onClick={() => save()} disabled={saving}
              style={{ width: '100%', padding: '11px', marginTop: 12, background: saving ? '#E5E7EB' : '#7EC8E3', border: 'none', borderRadius: 10, fontWeight: 800, cursor: saving ? 'default' : 'pointer', color: '#2B3660', fontSize: 14 }}>
              {saved ? '✅ 저장됨' : saving ? '저장 중...' : '저장하기'}
            </button>
          </div>

          {/* 발송 문구 */}
          <div style={card}>
            <div style={title}>카카오톡 발송 문구</div>
            <select value={msgTemplate} onChange={e => setMsgTemplate(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 13, marginBottom: 8 }}>
              <option value="">문구 선택...</option>
              {Object.keys(MESSAGE_TEMPLATES).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            {msgTemplate && (
              <>
                <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', fontSize: 13, lineHeight: 1.7, color: '#2C2C2C', whiteSpace: 'pre-line', marginBottom: 8 }}>
                  {MESSAGE_TEMPLATES[msgTemplate](data.student_name)}
                </div>
                <button onClick={copyMessage}
                  style={{ width: '100%', padding: '9px', background: copied ? '#B8E8D8' : '#F3EEFF', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', color: copied ? '#065F46' : '#6B4FA0', fontSize: 13 }}>
                  {copied ? '✅ 복사됨!' : '📋 문구 복사하기'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const card  = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' };
const title = { fontSize: 13, fontWeight: 800, color: '#2B3660', marginBottom: 14, borderBottom: '1px solid #F3F4F6', paddingBottom: 10 };
const lbl   = { display: 'block', fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 5 };
const inp   = { width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
