import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

const TYPE_OPTIONS = [
  { value: 'msg',  label: '💬 다음 질문으로 연결' },
  { value: 'form', label: '🏫 상담 폼 열기' },
  { value: 'link', label: '🔗 블로그/링크 열기' },
];
const FORM_TYPES = ['방문상담', '레벨테스트', '바로 등록 문의'];
const MSG_PRESETS = [
  '👶 유치부 수업이 궁금해요', '📚 초등부 수업이 궁금해요', '🌱 영어 처음 시작이에요',
  '📝 레벨테스트가 뭔가요?', '💰 수강료가 궁금해요', '📍 위치/운영시간 알려주세요',
  '📖 숙제는 얼마나 있나요?', '🎯 수업 방식이 어떻게 되나요?', '🔤 파닉스가 약한데요',
  '📗 읽기가 약한데요', '🗣️ 말하기 자신감이 없어요', '💬 다른 질문이 있어요',
];

export default function ConsultAnswers() {
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null); // 현재 편집 중인 key
  const [form, setForm] = useState({ reply: '', buttons: [] });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/api/admin/consult/answers`)
      .then(r => r.json())
      .then(setAnswers);
  }, []);

  function selectAnswer(a) {
    setSelected(a.key);
    setForm({ reply: a.reply, buttons: a.buttons || [] });
    setSaved(false);
  }

  // 버튼 수정
  function updateBtn(i, field, value) {
    setForm(f => {
      const btns = [...f.buttons];
      btns[i] = { ...btns[i], [field]: value };
      // form 타입이면 url 초기화, link면 formType 초기화
      if (field === 'type') {
        if (value === 'form') delete btns[i].url;
        if (value === 'link') delete btns[i].formType;
        if (value === 'msg') { delete btns[i].url; delete btns[i].formType; }
      }
      return { ...f, buttons: btns };
    });
  }

  function addBtn() {
    setForm(f => ({ ...f, buttons: [...f.buttons, { label: '', type: 'msg' }] }));
  }

  function removeBtn(i) {
    setForm(f => ({ ...f, buttons: f.buttons.filter((_, idx) => idx !== i) }));
  }

  function moveBtn(i, dir) {
    setForm(f => {
      const btns = [...f.buttons];
      const j = i + dir;
      if (j < 0 || j >= btns.length) return f;
      [btns[i], btns[j]] = [btns[j], btns[i]];
      return { ...f, buttons: btns };
    });
  }

  async function save() {
    setSaving(true);
    await fetch(`${API}/api/admin/consult/answers/${selected}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    // 목록도 업데이트
    setAnswers(prev => prev.map(a => a.key === selected ? { ...a, ...form } : a));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div style={{ padding: '24px', maxWidth: 980, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => navigate('/admin/consult')}
          style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B7280' }}>
          ‹ 상담 관리
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#2B3660' }}>AI 챗봇 답변 편집</h1>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>저장 즉시 반영돼요 — 재시작 불필요</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>

        {/* 왼쪽: 답변 목록 */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB', fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            답변 항목
          </div>
          {answers.map(a => (
            <button key={a.key} onClick={() => selectAnswer(a)}
              style={{
                width: '100%', textAlign: 'left', padding: '12px 16px',
                background: selected === a.key ? '#F3EEFF' : 'transparent',
                border: 'none', borderBottom: '1px solid #F3F4F6',
                cursor: 'pointer', transition: 'background 0.1s',
              }}>
              <div style={{ fontSize: 13, fontWeight: selected === a.key ? 700 : 500, color: selected === a.key ? '#2B3660' : '#374151' }}>
                {a.label}
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.reply.split('\n')[0]}
              </div>
            </button>
          ))}
        </div>

        {/* 오른쪽: 편집 패널 */}
        {!selected ? (
          <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 14, padding: '60px 40px', textAlign: 'center', color: '#9CA3AF' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>👈</div>
            <div style={{ fontSize: 14 }}>왼쪽에서 편집할 항목을 선택하세요</div>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '24px' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#2B3660', marginBottom: 20 }}>
              {answers.find(a => a.key === selected)?.label} 편집
            </div>

            {/* 답변 텍스트 */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>채팅 답변 내용</label>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6 }}>줄바꿈은 Enter로 입력하세요 (최대 3~4줄 권장)</div>
              <textarea
                value={form.reply}
                onChange={e => setForm(f => ({ ...f, reply: e.target.value }))}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }}
              />
            </div>

            {/* 버튼 목록 */}
            <div>
              <label style={labelStyle}>버튼 목록</label>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 10 }}>
                학부모가 답변 아래에서 탭할 버튼이에요. 순서도 바꿀 수 있어요.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                {form.buttons.map((btn, i) => (
                  <div key={i} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: '12px 14px' }}>
                    {/* 버튼 종류 */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                      {TYPE_OPTIONS.map(opt => (
                        <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: btn.type === opt.value ? 700 : 400, color: btn.type === opt.value ? '#2B3660' : '#6B7280', cursor: 'pointer', background: btn.type === opt.value ? '#E0F2FE' : 'transparent', padding: '3px 10px', borderRadius: 20, border: `1px solid ${btn.type === opt.value ? '#7EC8E3' : '#E5E7EB'}` }}>
                          <input type="radio" name={`type-${i}`} value={opt.value} checked={btn.type === opt.value} onChange={() => updateBtn(i, 'type', opt.value)} style={{ display: 'none' }} />
                          {opt.label}
                        </label>
                      ))}
                    </div>

                    {/* 버튼 텍스트 */}
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>버튼 텍스트</div>
                      {btn.type === 'msg' ? (
                        <>
                          <input
                            list={`presets-${i}`}
                            value={btn.label}
                            onChange={e => updateBtn(i, 'label', e.target.value)}
                            placeholder="직접 입력하거나 아래 목록에서 선택..."
                            style={{ ...inputStyle, fontSize: 13 }}
                          />
                          <datalist id={`presets-${i}`}>
                            {MSG_PRESETS.map(p => <option key={p} value={p} />)}
                          </datalist>
                        </>
                      ) : (
                        <input value={btn.label} onChange={e => updateBtn(i, 'label', e.target.value)}
                          placeholder={btn.type === 'form' ? '예: 🏫 방문상담 신청할게요' : '예: 📝 블로그에서 자세히 보기'}
                          style={{ ...inputStyle, fontSize: 13 }} />
                      )}
                    </div>

                    {/* form 타입: 상담 종류 */}
                    {btn.type === 'form' && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>열릴 상담 종류</div>
                        <select value={btn.formType || ''} onChange={e => updateBtn(i, 'formType', e.target.value)} style={{ ...inputStyle, fontSize: 13 }}>
                          <option value="">선택...</option>
                          {FORM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    )}

                    {/* link 타입: URL */}
                    {btn.type === 'link' && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>링크 주소 (블로그, 네이버 지도 등)</div>
                        <input value={btn.url || ''} onChange={e => updateBtn(i, 'url', e.target.value)}
                          placeholder="https://blog.naver.com/..." style={{ ...inputStyle, fontSize: 13 }} />
                      </div>
                    )}

                    {/* 순서 이동 / 삭제 */}
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button onClick={() => moveBtn(i, -1)} disabled={i === 0} style={smallBtnStyle}>↑ 위로</button>
                      <button onClick={() => moveBtn(i, 1)} disabled={i === form.buttons.length - 1} style={smallBtnStyle}>↓ 아래로</button>
                      <button onClick={() => removeBtn(i)} style={{ ...smallBtnStyle, color: '#E05555', borderColor: '#FCA5A5' }}>삭제</button>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={addBtn}
                style={{ width: '100%', padding: '10px', border: '1.5px dashed #D8CCF1', borderRadius: 10, background: '#F9FAFB', color: '#6B4FA0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                + 버튼 추가
              </button>
            </div>

            {/* 미리보기 */}
            <div style={{ marginTop: 24, background: '#F3EEFF', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6B4FA0', marginBottom: 10 }}>미리보기</div>
              <div style={{ background: '#fff', borderRadius: 12, padding: '10px 14px', fontSize: 13, lineHeight: 1.7, color: '#2C2C2C', marginBottom: 10, whiteSpace: 'pre-line' }}>
                {form.reply}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {form.buttons.map((btn, i) => (
                  <div key={i} style={{
                    padding: '9px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    background: btn.type === 'form' ? '#EBF8FD' : btn.type === 'link' ? '#F0FBF7' : '#fff',
                    border: `1.5px solid ${btn.type === 'form' ? '#7EC8E3' : btn.type === 'link' ? '#B8E8D8' : '#D8CCF1'}`,
                    color: btn.type === 'form' ? '#1a6e8f' : btn.type === 'link' ? '#065F46' : '#2B3660',
                  }}>
                    {btn.label || '(버튼 텍스트 없음)'}
                    {btn.type === 'link' && btn.url && <span style={{ fontSize: 10, color: '#9CA3AF', marginLeft: 6 }}>↗ {btn.url.slice(0, 30)}...</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* 저장 버튼 */}
            <button onClick={save} disabled={saving}
              style={{ width: '100%', marginTop: 20, padding: '13px', background: saved ? '#B8E8D8' : '#7EC8E3', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: saving ? 'default' : 'pointer', color: saved ? '#065F46' : '#2B3660' }}>
              {saved ? '✅ 저장됐어요! 즉시 반영됩니다' : saving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 700, color: '#2B3660', marginBottom: 6 };
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' };
const smallBtnStyle = { padding: '4px 10px', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11, cursor: 'pointer', color: '#6B7280', fontWeight: 600 };
