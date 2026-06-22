import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

const STATUS_LIST = ['신규 문의','AI 응대 중','연락 필요','상담 예약','일정 확정','방문 완료','레벨테스트 완료','등록 완료','보류','미등록'];
const STATUS_COLOR = {
  '신규 문의': { bg: '#EBF8FD', color: '#1a6e8f', border: '#7EC8E3' },
  'AI 응대 중': { bg: '#F3EEFF', color: '#6B4FA0', border: '#CBB7E8' },
  '연락 필요': { bg: '#FEF3C7', color: '#92400E', border: '#F0C060' },
  '상담 예약': { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD' },
  '일정 확정': { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
  '방문 완료': { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
  '레벨테스트 완료': { bg: '#E0F2FE', color: '#0369A1', border: '#38BDF8' },
  '등록 완료': { bg: '#B8E8D8', color: '#065F46', border: '#34D399' },
  '보류': { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
  '미등록': { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
};

const SOURCE_EMOJI = { '지인 소개': '👥', '블로그': '📝', '인스타그램': '📸', '네이버 플레이스': '🗺️', '카카오톡': '💬', '전단지/현수막': '📋', '기타': '•' };

function StatusBadge({ status }) {
  const s = STATUS_COLOR[status] || { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' };
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}

function StatCard({ label, value, color, highlight }) {
  return (
    <div style={{
      background: highlight ? '#FEF3C7' : '#fff',
      border: highlight ? '2px solid #F0C060' : '1px solid #E5E7EB',
      borderRadius: 12,
      padding: '14px 16px',
      textAlign: 'center',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || '#2B3660' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

// ─── 홍보 문구 생성기 ──────────────────────────────────────────────────────────
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
            <button onClick={() => { navigator.clipboard.writeText(link); alert('링크 복사됨!'); }}
              style={{ padding: '8px 14px', background: '#7EC8E3', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', color: '#2B3660', fontSize: 13 }}>복사</button>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>카톡·블로그·인스타 홍보 문구</div>
          <textarea readOnly value={promoText} rows={8}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, background: '#F9FAFB', resize: 'none', lineHeight: 1.6, boxSizing: 'border-box' }} />
          <button onClick={() => { navigator.clipboard.writeText(promoText); alert('홍보 문구 복사됨!'); }}
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
  const navigate = useNavigate();

  const loadStats = useCallback(async () => {
    const r = await fetch(`${API}/api/admin/consult/stats`);
    const d = await r.json();
    setStats(d);
  }, []);

  const loadList = useCallback(async () => {
    const p = new URLSearchParams();
    if (filter.status) p.set('status', filter.status);
    if (filter.consult_type) p.set('consult_type', filter.consult_type);
    if (filter.source) p.set('source', filter.source);
    if (filter.search) p.set('search', filter.search);
    const r = await fetch(`${API}/api/admin/consult?${p}`);
    const d = await r.json();
    setList(d);
  }, [filter]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadList(); }, [loadList]);

  function parseArr(str) {
    try { return JSON.parse(str) || []; } catch { return []; }
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#2B3660' }}>신규생 상담 관리</h1>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 3 }}>링키영어 진해남문점 유치부·초등부</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowPromo(true)}
            style={{ padding: '9px 18px', background: '#B8E8D8', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', color: '#065F46', fontSize: 13 }}>
            📢 홍보 문구/링크
          </button>
          <button onClick={() => window.open('/start', '_blank')}
            style={{ padding: '9px 18px', background: '#7EC8E3', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', color: '#2B3660', fontSize: 13 }}>
            📱 상담 페이지 미리보기
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 28 }}>
          <StatCard label="오늘 신규 문의" value={stats.todayCount} color="#2B3660" />
          <StatCard label="이번 주 문의" value={stats.weekCount} color="#2B3660" />
          <StatCard label="상담 예약" value={stats.reserved} color="#1E40AF" />
          <StatCard label="레벨테스트" value={stats.levelTest} color="#0369A1" />
          <StatCard label="등록 완료" value={stats.enrolled} color="#065F46" />
          <StatCard label="연락 필요" value={stats.needContact} highlight={stats.needContact > 0} color="#92400E" />
          <StatCard label="보류/미응답" value={stats.pending} />
          <StatCard label="즉시 확인 필요" value={stats.priority} highlight={stats.priority > 0} color="#C05621" />
        </div>
      )}

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="이름·연락처 검색..."
          value={filter.search}
          onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
          style={{ padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, minWidth: 180, outline: 'none' }}
        />
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          style={{ padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }}>
          <option value="">전체 상태</option>
          {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filter.consult_type} onChange={e => setFilter(f => ({ ...f, consult_type: e.target.value }))}
          style={{ padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }}>
          <option value="">상담 유형 전체</option>
          {['방문상담','전화상담','레벨테스트','바로 등록 문의'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filter.source} onChange={e => setFilter(f => ({ ...f, source: e.target.value }))}
          style={{ padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }}>
          <option value="">유입 경로 전체</option>
          {['지인 소개','블로그','인스타그램','네이버 플레이스','카카오톡','전단지/현수막'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(filter.status || filter.consult_type || filter.source || filter.search) && (
          <button onClick={() => setFilter({ status: '', consult_type: '', source: '', search: '' })}
            style={{ padding: '8px 14px', background: '#F3F4F6', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#6B7280', fontWeight: 600 }}>
            필터 초기화
          </button>
        )}
        <div style={{ marginLeft: 'auto', fontSize: 13, color: '#6B7280', fontWeight: 600 }}>
          총 {list.length}건
        </div>
      </div>

      {/* 상담 목록 */}
      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF', fontSize: 15 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          상담 건이 없습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(item => {
            const concerns = parseArr(item.concerns);
            const isPriority = item.is_priority === 1;
            return (
              <div key={item.id}
                onClick={() => navigate(`/admin/consult/${item.id}`)}
                style={{
                  background: '#fff',
                  border: isPriority ? '2px solid #7EC8E3' : '1px solid #E5E7EB',
                  borderRadius: 14,
                  padding: '16px 18px',
                  cursor: 'pointer',
                  boxShadow: isPriority ? '0 2px 12px rgba(126,200,227,0.2)' : '0 1px 4px rgba(0,0,0,0.05)',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = isPriority ? '0 2px 12px rgba(126,200,227,0.2)' : '0 1px 4px rgba(0,0,0,0.05)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      {isPriority && (
                        <span style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #F0C060', borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 800 }}>
                          즉시 확인
                        </span>
                      )}
                      <span style={{ fontWeight: 800, fontSize: 15, color: '#2B3660' }}>{item.student_name}</span>
                      {item.grade && <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>{item.grade}</span>}
                      <StatusBadge status={item.status} />
                    </div>

                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: '#6B7280', marginBottom: 6 }}>
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
                      <div style={{ marginTop: 4, color: '#D97706', fontWeight: 600 }}>
                        📅 {item.next_contact}
                      </div>
                    )}
                    {item.memo && <div style={{ marginTop: 4, color: '#9CA3AF' }}>📝 메모 있음</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showPromo && <PromoModal onClose={() => setShowPromo(false)} />}
    </div>
  );
}
