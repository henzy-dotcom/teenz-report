import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

const STATUS_LIST = ['신규 문의', '연락 중', '상담 예약', '방문 완료', '등록 완료', '보류', '미등록'];
const STATUS_COLOR = {
  '신규 문의': { bg: '#EBF8FD', color: '#1a6e8f', border: '#7EC8E3' },
  '연락 중':   { bg: '#FEF3C7', color: '#92400E', border: '#F0C060' },
  '상담 예약': { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD' },
  '방문 완료': { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
  '등록 완료': { bg: '#B8E8D8', color: '#065F46', border: '#34D399' },
  '보류':      { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
  '미등록':    { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
};
const SOURCE_LIST = ['지인 소개', '블로그', '인스타그램', '네이버 플레이스', '카카오톡', '전단지/현수막', '기타'];
const SOURCE_EMOJI = { '지인 소개': '👥', '블로그': '📝', '인스타그램': '📸', '네이버 플레이스': '🗺️', '카카오톡': '💬', '전단지/현수막': '📋', '기타': '•' };

function StatusBadge({ status }) {
  const s = STATUS_COLOR[status] || { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' };
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}

// ─── 직접 등록 모달 ────────────────────────────────────────────────────────────
function AddModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    student_name: '', grade: '', school: '', parent_name: '', parent_phone: '',
    consult_type: '방문상담', source: '', preferred_time: '', memo: '', status: '신규 문의',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.student_name.trim()) return alert('학생 이름을 입력해주세요.');
    if (!form.parent_phone.trim()) return alert('연락처를 입력해주세요.');
    setSaving(true);
    await fetch(`${API}/api/admin/consult`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    onSaved();
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: 28, maxWidth: 480, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontWeight: 800, fontSize: 17, color: '#2B3660', marginBottom: 20 }}>✏️ 상담 직접 등록</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={lbl}>학생 이름 *</label>
            <input style={inp} placeholder="홍길동" value={form.student_name} onChange={e => set('student_name', e.target.value)} autoFocus />
          </div>
          <div>
            <label style={lbl}>나이/학년</label>
            <input style={inp} placeholder="예: 초1, 7세" value={form.grade} onChange={e => set('grade', e.target.value)} />
          </div>
          <div>
            <label style={lbl}>학부모 이름</label>
            <input style={inp} value={form.parent_name} onChange={e => set('parent_name', e.target.value)} />
          </div>
          <div>
            <label style={lbl}>연락처 *</label>
            <input style={inp} placeholder="010-0000-0000" value={form.parent_phone} onChange={e => set('parent_phone', e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>유치원/학교</label>
          <input style={inp} value={form.school} onChange={e => set('school', e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={lbl}>상담 유형</label>
            <select style={inp} value={form.consult_type} onChange={e => set('consult_type', e.target.value)}>
              {['방문상담','전화상담','레벨테스트','바로 등록 문의'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>유입 경로</label>
            <select style={inp} value={form.source} onChange={e => set('source', e.target.value)}>
              <option value="">선택</option>
              {SOURCE_LIST.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>희망 시간</label>
          <input style={inp} placeholder="예: 평일 오후 4시 이후" value={form.preferred_time} onChange={e => set('preferred_time', e.target.value)} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>초기 상태</label>
          <select style={inp} value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUS_LIST.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>메모</label>
          <textarea style={{ ...inp, minHeight: 70, resize: 'vertical' }} placeholder="특이사항, 통화 내용 등..."
            value={form.memo} onChange={e => set('memo', e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, background: '#F3F4F6', border: 'none', borderRadius: 10, fontWeight: 600, color: '#6B7280', cursor: 'pointer' }}>취소</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: 11, background: '#2B3660', border: 'none', borderRadius: 10, fontWeight: 800, color: '#fff', cursor: 'pointer' }}>
            {saving ? '등록 중...' : '등록하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 홍보 문구 모달 ────────────────────────────────────────────────────────────
function PromoModal({ onClose }) {
  const [baseUrl, setBaseUrl] = useState('');
  useEffect(() => {
    fetch(`${API}/api/config`).then(r => r.json()).then(d => setBaseUrl(d.publicBaseUrl || window.location.origin));
  }, []);
  const link = `${baseUrl}/start`;
  const promoText = `링키영어 진해남문점 유치부·초등부 상담 신청\n\n우리 아이 영어를 언제, 어떻게 시작해야 할지 고민이라면\n간단한 질문은 AI 안내로 바로 확인하고,\n방문상담·레벨테스트가 필요할 때만 예약하실 수 있어요.\n\n📌 상담 신청: ${link}`;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 480, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: '#2B3660', marginBottom: 16 }}>홍보 문구 / 링크 복사</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>상담 링크</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly value={link} style={{ flex: 1, padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, background: '#F9FAFB' }} />
            <button onClick={() => navigator.clipboard.writeText(link).then(() => alert('복사됨!'))}
              style={{ padding: '8px 14px', background: '#7EC8E3', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', color: '#2B3660', fontSize: 13 }}>복사</button>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>카톡·블로그·인스타 홍보 문구</div>
          <textarea readOnly value={promoText} rows={8} style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, background: '#F9FAFB', resize: 'none', lineHeight: 1.6, boxSizing: 'border-box' }} />
          <button onClick={() => navigator.clipboard.writeText(promoText).then(() => alert('복사됨!'))}
            style={{ marginTop: 8, width: '100%', padding: '10px', background: '#B8E8D8', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', color: '#065F46', fontSize: 13 }}>
            전체 문구 복사하기
          </button>
        </div>
        <button onClick={onClose} style={{ width: '100%', padding: 10, background: '#F3F4F6', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, color: '#6B7280' }}>닫기</button>
      </div>
    </div>
  );
}

// ─── 메인 ──────────────────────────────────────────────────────────────────────
export default function ConsultAdmin() {
  const [stats, setStats] = useState(null);
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState({ status: '', consult_type: '', source: '', search: '' });
  const [showPromo, setShowPromo] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    const [s, l] = await Promise.all([
      fetch(`${API}/api/admin/consult/stats`).then(r => r.json()),
      fetch(`${API}/api/admin/consult?${new URLSearchParams(
        Object.fromEntries(Object.entries(filter).filter(([,v]) => v))
      )}`).then(r => r.json()),
    ]);
    setStats(s);
    setList(l);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  function parseArr(str) { try { return JSON.parse(str) || []; } catch { return []; } }

  const conversionRate = stats && stats.monthNew > 0
    ? Math.round((stats.monthEnroll / stats.monthNew) * 100)
    : 0;

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1100, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#2B3660' }}>신규생 상담 관리</h1>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>링키영어 진해남문점</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setShowAdd(true)}
            style={{ padding: '9px 18px', background: '#2B3660', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', color: '#fff', fontSize: 13 }}>
            ✏️ 직접 등록
          </button>
          <button onClick={() => navigate('/admin/consult/answers')}
            style={{ padding: '9px 18px', background: '#F3EEFF', border: '1px solid #CBB7E8', borderRadius: 10, fontWeight: 700, cursor: 'pointer', color: '#6B4FA0', fontSize: 13 }}>
            💬 AI 답변 편집
          </button>
          <button onClick={() => setShowPromo(true)}
            style={{ padding: '9px 18px', background: '#B8E8D8', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', color: '#065F46', fontSize: 13 }}>
            📢 홍보 링크
          </button>
        </div>
      </div>

      {/* 통계 — 이번 달 요약 + 전체 현황 */}
      {stats && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', marginBottom: 8 }}>이번 달 현황</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
            <StatCard label="신규 문의" value={stats.monthNew} color="#2B3660" />
            <StatCard label="등록 전환" value={stats.monthEnroll} color="#065F46" />
            <StatCard label="전환율" value={`${conversionRate}%`} color={conversionRate >= 50 ? '#065F46' : '#92400E'} />
            <StatCard label="연락 지연" value={stats.overdue} highlight={stats.overdue > 0} color="#991B1B" />
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', marginBottom: 8 }}>전체 현황</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 24 }}>
            <StatCard label="오늘 신규" value={stats.todayCount} color="#2B3660" />
            <StatCard label="이번 주" value={stats.weekCount} color="#2B3660" />
            <StatCard label="상담 예약" value={stats.reserved} color="#1E40AF" />
            <StatCard label="연락 중" value={stats.needContact} highlight={stats.needContact > 0} color="#92400E" />
            <StatCard label="누적 등록" value={stats.enrolled} color="#065F46" />
            <StatCard label="보류" value={stats.pending} color="#6B7280" />
          </div>
        </>
      )}

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="이름·연락처 검색..."
          value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
          style={{ padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, minWidth: 160, outline: 'none' }} />
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          style={{ padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }}>
          <option value="">전체 상태</option>
          {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filter.consult_type} onChange={e => setFilter(f => ({ ...f, consult_type: e.target.value }))}
          style={{ padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }}>
          <option value="">유형 전체</option>
          {['방문상담','전화상담','레벨테스트','바로 등록 문의'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filter.source} onChange={e => setFilter(f => ({ ...f, source: e.target.value }))}
          style={{ padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }}>
          <option value="">경로 전체</option>
          {SOURCE_LIST.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(filter.status || filter.consult_type || filter.source || filter.search) && (
          <button onClick={() => setFilter({ status: '', consult_type: '', source: '', search: '' })}
            style={{ padding: '8px 12px', background: '#F3F4F6', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#6B7280', fontWeight: 600 }}>
            초기화
          </button>
        )}
        <div style={{ marginLeft: 'auto', fontSize: 13, color: '#6B7280', fontWeight: 600 }}>총 {list.length}건</div>
      </div>

      {/* 목록 */}
      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF', fontSize: 15 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>상담 건이 없습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(item => {
            const concerns = parseArr(item.concerns);
            const isOverdue = item.next_contact && item.next_contact < today && !['등록 완료','미등록','보류'].includes(item.status);
            return (
              <div key={item.id} onClick={() => navigate(`/admin/consult/${item.id}`)}
                style={{
                  background: '#fff',
                  border: isOverdue ? '2px solid #FCA5A5' : '1px solid #E5E7EB',
                  borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
                  boxShadow: isOverdue ? '0 2px 10px rgba(252,165,165,0.25)' : '0 1px 4px rgba(0,0,0,0.05)',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = isOverdue ? '0 2px 10px rgba(252,165,165,0.25)' : '0 1px 4px rgba(0,0,0,0.05)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      {isOverdue && <span style={{ background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 800 }}>연락 지연</span>}
                      <span style={{ fontWeight: 800, fontSize: 15, color: '#2B3660' }}>{item.student_name}</span>
                      {item.grade && <span style={{ fontSize: 12, color: '#6B7280' }}>{item.grade}</span>}
                      <StatusBadge status={item.status} />
                    </div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: '#6B7280', marginBottom: 6 }}>
                      {item.parent_phone && <span>📞 {item.parent_phone}</span>}
                      {item.consult_type && <span>💬 {item.consult_type}</span>}
                      {item.source && <span>{SOURCE_EMOJI[item.source] || '•'} {item.source}</span>}
                      {item.preferred_time && <span>🕐 {item.preferred_time}</span>}
                    </div>
                    {concerns.length > 0 && (
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {concerns.slice(0, 3).map((c, i) => (
                          <span key={i} style={{ background: '#F3EEFF', color: '#6B4FA0', border: '1px solid #CBB7E8', borderRadius: 10, padding: '1px 8px', fontSize: 11 }}>{c}</span>
                        ))}
                        {concerns.length > 3 && <span style={{ fontSize: 11, color: '#9CA3AF' }}>+{concerns.length - 3}개</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>
                    <div>{new Date(item.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</div>
                    {item.next_contact && (
                      <div style={{ marginTop: 4, color: isOverdue ? '#DC2626' : '#D97706', fontWeight: 700 }}>
                        📅 {item.next_contact}
                      </div>
                    )}
                    {item.memo && <div style={{ marginTop: 4 }}>📝 메모</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSaved={load} />}
      {showPromo && <PromoModal onClose={() => setShowPromo(false)} />}
    </div>
  );
}

function StatCard({ label, value, color, highlight }) {
  return (
    <div style={{
      background: highlight ? '#FEF3C7' : '#fff',
      border: highlight ? '2px solid #F0C060' : '1px solid #E5E7EB',
      borderRadius: 12, padding: '14px 10px', textAlign: 'center',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || '#2B3660' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

const lbl = { display: 'block', fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 5 };
const inp = { width: '100%', padding: '9px 11px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
