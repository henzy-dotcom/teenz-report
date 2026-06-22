import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

const STATUS_LIST = ['신규 문의','AI 응대 중','연락 필요','상담 예약','일정 확정','방문 완료','레벨테스트 완료','등록 완료','보류','미등록'];
const STATUS_COLOR = {
  '신규 문의': '#1a6e8f', '연락 필요': '#92400E', '상담 예약': '#1E40AF',
  '일정 확정': '#065F46', '방문 완료': '#065F46', '레벨테스트 완료': '#0369A1',
  '등록 완료': '#065F46', '보류': '#6B7280', '미등록': '#991B1B',
};

// 상담 건별 문구 생성
const MESSAGE_TEMPLATES = {
  '상담 접수 확인': (name) =>
    `안녕하세요 😊 링키영어 진해남문점입니다.\n${name || ''}학생 상담 신청 주셔서 연락드립니다.\n내용 확인 후 빠르게 안내드릴게요!`,
  '방문상담 일정 제안': (name) =>
    `안녕하세요! 링키영어 진해남문점입니다.\n${name || ''}학생 방문상담 일정 말씀드릴게요.\n희망하시는 시간을 알려주시면 조율해드릴게요 😊`,
  '레벨테스트 안내': (name) =>
    `안녕하세요! 링키영어 진해남문점입니다.\n${name || ''}학생 레벨테스트 일정 안내드릴게요.\n부담 없이 20~30분 내로 진행돼요. 가능한 날짜 알려주세요 😊`,
  '미응답 재연락': (name) =>
    `안녕하세요! 링키영어 진해남문점입니다.\n${name || ''}학생 상담 관련해서 연락드렸는데 아직 확인이 안 되셨나요?\n편하신 시간에 답장 주세요 😊`,
  '등록 안내': (name) =>
    `안녕하세요! 링키영어 진해남문점입니다.\n${name || ''}학생 등록 관련 안내드리려고 연락드렸어요.\n궁금한 점 있으시면 편하게 말씀해주세요 😊`,
  '보류 고객 재문의': (name) =>
    `안녕하세요! 링키영어 진해남문점입니다.\n${name || ''}학생 상담을 진행했었는데, 다시 한번 연락드려요.\n아이 영어 시작이 고민되신다면 편하게 문의해주세요 😊`,
};

function parseArr(str) {
  try { return JSON.parse(str) || []; } catch { return str ? [str] : []; }
}

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
  const [form, setForm] = useState({ status: '', memo: '', next_contact: '', result: '', recommended: '', enrolled: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showFullChat, setShowFullChat] = useState(false);
  const [msgTemplate, setMsgTemplate] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/admin/consult/${id}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setForm({
          status: d.status || '신규 문의',
          memo: d.memo || '',
          next_contact: d.next_contact || '',
          result: d.result || '',
          recommended: d.recommended || '',
          enrolled: d.enrolled === 1,
        });
      });
  }, [id]);

  async function save() {
    setSaving(true);
    await fetch(`${API}/api/admin/consult/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleDelete() {
    if (!confirm('이 상담 건을 삭제할까요?')) return;
    await fetch(`${API}/api/admin/consult/${id}`, { method: 'DELETE' });
    navigate('/admin/consult');
  }

  function copyMessage() {
    const text = MESSAGE_TEMPLATES[msgTemplate]?.(data?.student_name);
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>불러오는 중...</div>;

  const concerns = parseArr(data.concerns);
  const englishExp = parseArr(data.english_exp);
  const chatLogs = data.chatLogs || [];
  const displayedLogs = showFullChat ? chatLogs : chatLogs.slice(-6);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px 60px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/admin/consult')}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6B7280', padding: '4px 8px' }}>
          ‹ 목록
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#2B3660' }}>{data.student_name}</h1>
            {data.grade && <span style={{ fontSize: 13, color: '#6B7280' }}>{data.grade}</span>}
            {data.is_priority === 1 && (
              <span style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #F0C060', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>즉시 확인</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>
            접수일: {new Date(data.created_at).toLocaleString('ko-KR')}
          </div>
        </div>
        <button onClick={handleDelete} style={{ padding: '7px 14px', background: '#FEE2E2', border: 'none', borderRadius: 8, color: '#991B1B', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>삭제</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
        {/* 왼쪽: 기본 정보 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* 학생/학부모 정보 */}
          <div style={cardStyle}>
            <div style={cardTitle}>학생 · 학부모 정보</div>
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
          <div style={cardStyle}>
            <div style={cardTitle}>영어 경험 · 현재 고민</div>
            <Field label="영어 학습 경험">
              <TagList items={englishExp} color="#EBF8FD" textColor="#1a6e8f" borderColor="#7EC8E3" />
            </Field>
            <Field label="현재 고민">
              <TagList items={concerns} />
            </Field>
            <Field label="희망 상담 방식" value={data.consult_type || '-'} />
            {data.note && <Field label="남긴 말" value={data.note} />}
          </div>

          {/* AI 채팅 요약 */}
          {chatLogs.length > 0 && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={cardTitle}>AI 채팅 내용</div>
                <button onClick={() => setShowFullChat(v => !v)}
                  style={{ background: 'none', border: 'none', fontSize: 12, color: '#7EC8E3', cursor: 'pointer', fontWeight: 600 }}>
                  {showFullChat ? '간략히 보기' : `전체 보기 (${chatLogs.length}개)`}
                </button>
              </div>
              {data.ai_summary && (
                <div style={{ background: '#F3EEFF', border: '1px solid #CBB7E8', borderRadius: 10, padding: '10px 13px', fontSize: 13, color: '#6B4FA0', marginBottom: 10, fontStyle: 'italic' }}>
                  {data.ai_summary}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {!showFullChat && chatLogs.length > 6 && (
                  <div style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF' }}>— 최근 {Math.min(6, chatLogs.length)}개 메시지 표시 —</div>
                )}
                {displayedLogs.map((log, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, justifyContent: log.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {log.role === 'assistant' && (
                      <div style={{ width: 24, height: 24, background: '#D8CCF1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#6B4FA0', flexShrink: 0 }}>AI</div>
                    )}
                    <div style={{
                      background: log.role === 'user' ? '#EBF8FD' : '#F9FAFB',
                      color: '#2C2C2C',
                      border: `1px solid ${log.role === 'user' ? '#7EC8E3' : '#E5E7EB'}`,
                      borderRadius: 12,
                      padding: '7px 12px',
                      fontSize: 13,
                      lineHeight: 1.5,
                      maxWidth: '80%',
                    }}>
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

          {/* 상태 변경 */}
          <div style={cardStyle}>
            <div style={cardTitle}>상담 상태</div>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, fontWeight: 700, color: STATUS_COLOR[form.status] || '#2B3660', marginBottom: 8 }}>
              {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <label style={labelStyle}>다음 연락일</label>
            <input type="date" value={form.next_contact} onChange={e => setForm(f => ({ ...f, next_contact: e.target.value }))}
              style={inputStyle} />

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#2C2C2C', marginTop: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.enrolled} onChange={e => setForm(f => ({ ...f, enrolled: e.target.checked }))} />
              등록 완료
            </label>
          </div>

          {/* 상담 메모 */}
          <div style={cardStyle}>
            <div style={cardTitle}>상담 메모</div>
            <textarea value={form.memo} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
              placeholder="통화 내용, 특이사항 등 자유롭게 기록..."
              style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} />

            <label style={labelStyle}>추천 반/방향</label>
            <input value={form.recommended} onChange={e => setForm(f => ({ ...f, recommended: e.target.value }))}
              placeholder="예: 파닉스 A반, 초등 리딩 입문" style={inputStyle} />

            <label style={labelStyle}>상담 결과</label>
            <textarea value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))}
              placeholder="방문 후 결과, 반응 등..."
              style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} />

            <button onClick={save} disabled={saving}
              style={{ width: '100%', padding: '11px', marginTop: 10, background: saving ? '#E5E7EB' : '#7EC8E3', border: 'none', borderRadius: 10, fontWeight: 800, cursor: saving ? 'default' : 'pointer', color: '#2B3660', fontSize: 14 }}>
              {saved ? '✅ 저장됨' : saving ? '저장 중...' : '저장하기'}
            </button>
          </div>

          {/* 발송 문구 */}
          <div style={cardStyle}>
            <div style={cardTitle}>카카오톡 발송 문구</div>
            <select value={msgTemplate} onChange={e => setMsgTemplate(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 13, marginBottom: 8 }}>
              <option value="">문구 종류 선택...</option>
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

const cardStyle = {
  background: '#fff',
  border: '1px solid #E5E7EB',
  borderRadius: 14,
  padding: '18px 20px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
};

const cardTitle = {
  fontSize: 13,
  fontWeight: 800,
  color: '#2B3660',
  marginBottom: 14,
  borderBottom: '1px solid #F3F4F6',
  paddingBottom: 10,
};

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: '#9CA3AF',
  marginBottom: 5,
  marginTop: 10,
};

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #E5E7EB',
  borderRadius: 8,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};
