import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContext } from '../App.jsx';

const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;

function buildMessage(r, period, base) {
  if (!period) return '';
  const link = r.share_code ? `${base}/r/${r.share_code}` : `${base}/report/${r.share_token}`;
  return `${r.name} 학부모님, 안녕하세요.\n링키영어 진해남문점입니다🍀\n\n${period.title} 학습 리포트를 공유드립니다.\n아래 링크에서 확인하실 수 있습니다. 😊\n\n${link}`;
}

function StatusPill({ sent, completed }) {
  if (sent)      return <span style={{ fontSize: 11, fontWeight: 600, color: '#065F46', background: '#D1FAE5', padding: '2px 8px', borderRadius: 20 }}>발송됨</span>;
  if (completed) return <span style={{ fontSize: 11, fontWeight: 600, color: '#1D4ED8', background: '#DBEAFE', padding: '2px 8px', borderRadius: 20 }}>완료</span>;
  return <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', background: '#F3F4F6', padding: '2px 8px', borderRadius: 20 }}>작성중</span>;
}

function CheckCell({ val }) {
  return val
    ? <span style={{ color: '#059669', fontWeight: 700 }}>✓</span>
    : <span style={{ color: '#D1D5DB' }}>—</span>;
}

export default function Dashboard() {
  const [periods, setPeriods]       = useState([]);
  const [selected, setSelected]     = useState(null);
  const [reports, setReports]       = useState([]);
  const [stats, setStats]           = useState(null);
  const [filter, setFilter]         = useState('all');
  const [loading, setLoading]       = useState(true);
  const [showAllMsg, setShowAllMsg] = useState(false);
  const showToast = useContext(ToastContext);
  const navigate  = useNavigate();

  useEffect(() => {
    fetch('/api/periods').then(r => r.json()).then(data => {
      setPeriods(data);
      if (data.length > 0) setSelected(data[0]);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    Promise.all([
      fetch(`/api/reports/period/${selected.id}`).then(r => r.json()),
      fetch(`/api/reports/period/${selected.id}/stats`).then(r => r.json()),
    ]).then(([r, s]) => { setReports(r); setStats(s); });
  }, [selected]);

  const filtered = () => {
    switch (filter) {
      case 'incomplete': return reports.filter(r => !r.completed);
      case 'no_pdf':     return reports.filter(r => !r.pdf_weekly1 && !r.pdf_weekly2 && !r.pdf_monthly);
      case 'unsent':     return reports.filter(r => r.completed && !r.sent);
      case 'no_photo':   return reports.filter(r => r.photo_count === 0);
      default:           return reports;
    }
  };

  const counts = {
    incomplete: reports.filter(r => !r.completed).length,
    no_pdf:     reports.filter(r => !r.pdf_weekly1 && !r.pdf_weekly2 && !r.pdf_monthly).length,
    unsent:     reports.filter(r => r.completed && !r.sent).length,
    no_photo:   reports.filter(r => r.photo_count === 0).length,
  };

  async function toggleSent(r) {
    const res  = await fetch(`/api/reports/period/${selected.id}/student/${r.student_id}/toggle-sent`, { method: 'POST' });
    const data = await res.json();
    setReports(prev => prev.map(x => x.student_id === r.student_id ? { ...x, sent: data.sent ? 1 : 0 } : x));
    showToast(data.sent ? '발송 완료 처리했습니다.' : '발송 취소했습니다.', data.sent ? 'success' : 'info');
  }

  function shortLink(r) { return r.share_code ? `${PUBLIC_BASE}/r/${r.share_code}` : `${PUBLIC_BASE}/report/${r.share_token}`; }
  function copyLink(r)  { navigator.clipboard.writeText(shortLink(r)); showToast('링크 복사됨'); }
  function copyMsg(r)   { navigator.clipboard.writeText(buildMessage(r, selected, PUBLIC_BASE)); showToast('발송 문구 복사됨'); }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <span className="spinner" />
    </div>
  );

  const rows = filtered();

  return (
    <div className="page-container">

      {/* 헤더 */}
      <div className="page-header">
        <div>
          <h1 className="page-title">대시보드</h1>
          <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            학습 리포트 현황
            {PUBLIC_BASE.includes('localhost') && (
              <span style={{ fontSize: 11, color: '#92400E', background: '#FEF3C7', padding: '1px 7px', borderRadius: 20, fontWeight: 600 }}>로컬 환경</span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {selected && (
            <button className="btn btn-secondary" onClick={() => setShowAllMsg(true)}>💬 전체 발송 문구</button>
          )}
          <button className="btn btn-primary" onClick={() => navigate('/periods')}>+ 새 회차</button>
        </div>
      </div>

      {/* localhost 경고 */}
      {PUBLIC_BASE.includes('localhost') && (
        <div className="warning-banner">
          <span style={{ flexShrink: 0 }}>⚠️</span>
          <span>
            <b>localhost</b> 링크는 학부모 휴대폰에서 열리지 않습니다. 배포 후{' '}
            <code style={{ background: '#FDE68A', padding: '1px 4px', borderRadius: 3 }}>VITE_PUBLIC_BASE_URL</code>을 실제 도메인으로 바꿔주세요.
          </span>
        </div>
      )}

      {periods.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '80px 24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <p style={{ color: '#6B7280', marginBottom: 16 }}>아직 리포트 회차가 없습니다.</p>
          <button className="btn btn-primary" onClick={() => navigate('/periods')}>첫 회차 만들기</button>
        </div>
      ) : (
        <>
          {/* 회차 탭 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 2 }}>
            {periods.map(p => (
              <button key={p.id} onClick={() => setSelected(p)} style={{
                padding: '7px 16px', borderRadius: 20, border: '1px solid', fontSize: 13,
                fontWeight: selected?.id === p.id ? 700 : 500, cursor: 'pointer', flexShrink: 0,
                transition: 'all 0.15s',
                background:  selected?.id === p.id ? '#2B3660' : '#fff',
                borderColor: selected?.id === p.id ? '#2B3660' : '#E5E7EB',
                color:       selected?.id === p.id ? '#fff'    : '#6B7280',
                boxShadow:   selected?.id === p.id ? '0 2px 6px rgba(43,54,96,0.18)' : 'none',
              }}>{p.title}</button>
            ))}
          </div>

          {/* 통계 카드 */}
          {stats && (
            <div className="stats-grid">
              {[
                { label: '전체 학생',  val: stats.total,                   color: '#2B3660' },
                { label: '작성 완료',  val: stats.completed,               color: '#059669' },
                { label: '미작성',     val: stats.total - stats.completed, color: (stats.total - stats.completed) > 0 ? '#D97706' : '#9CA3AF' },
                { label: '발송 완료',  val: stats.sent,                    color: '#1D4ED8' },
                { label: 'AI 리포트', val: stats.has_pdf,                 color: '#7C3AED' },
                { label: '사진 첨부',  val: stats.has_photo,               color: '#0891B2' },
              ].map(({ label, val, color }) => (
                <div key={label} className="stat-card">
                  <div className="stat-value" style={{ color }}>{val ?? 0}</div>
                  <div className="stat-label">{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* 필터 */}
          <div className="filter-bar">
            {[
              ['all',        '전체',            null],
              ['incomplete', '미작성',          counts.incomplete],
              ['no_pdf',     'AI 리포트 없음',  counts.no_pdf],
              ['unsent',     '발송 전',          counts.unsent],
              ['no_photo',   '사진 없음',        counts.no_photo],
            ].map(([val, label, cnt]) => (
              <button key={val} className={`filter-btn ${filter === val ? 'active' : ''}`}
                onClick={() => setFilter(val)}>
                {label}
                {cnt !== null && cnt > 0 && (
                  <span style={{
                    marginLeft: 4, borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700,
                    background: filter === val ? 'rgba(255,255,255,0.25)' : '#E5E7EB',
                    color:      filter === val ? '#fff' : '#6B7280',
                  }}>{cnt}</span>
                )}
              </button>
            ))}
          </div>

          {/* 테이블 */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>학생</th>
                    <th>반</th>
                    <th style={{ textAlign: 'center' }}>주간1</th>
                    <th style={{ textAlign: 'center' }}>주간2</th>
                    <th style={{ textAlign: 'center' }}>월간</th>
                    <th style={{ textAlign: 'center' }}>사진</th>
                    <th style={{ textAlign: 'center' }}>코멘트</th>
                    <th style={{ textAlign: 'center' }}>상태</th>
                    <th style={{ textAlign: 'center' }}>발송</th>
                    <th>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.student_id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                            background: '#EFF6FF', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#1D4ED8',
                          }}>{r.name[0]}</div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#1C1C1E', lineHeight: 1.3 }}>{r.name}</div>
                            <div style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1 }}>{r.grade}</div>
                          </div>
                          {r.student_status !== 'active' && (
                            <span className={`badge badge-${r.student_status}`} style={{ fontSize: 10 }}>
                              {r.student_status === 'suspended' ? '휴원' : '퇴원'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ color: '#6B7280', fontSize: 12 }}>{r.class_subject}</td>
                      <td style={{ textAlign: 'center' }}><CheckCell val={r.pdf_weekly1} /></td>
                      <td style={{ textAlign: 'center' }}><CheckCell val={r.pdf_weekly2} /></td>
                      <td style={{ textAlign: 'center' }}><CheckCell val={r.pdf_monthly} /></td>
                      <td style={{ textAlign: 'center' }}>
                        {r.photo_count > 0
                          ? <span style={{ fontSize: 12, color: '#0891B2', fontWeight: 600 }}>📷 {r.photo_count}</span>
                          : <span style={{ color: '#D1D5DB' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'center' }}><CheckCell val={r.comment} /></td>
                      <td style={{ textAlign: 'center' }}><StatusPill sent={r.sent} completed={r.completed} /></td>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => toggleSent(r)} style={{
                          padding: '3px 10px', borderRadius: 12, border: '1px solid',
                          fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                          background: r.sent ? '#D1FAE5' : '#fff',
                          borderColor: r.sent ? '#A7F3D0' : '#E5E7EB',
                          color: r.sent ? '#065F46' : '#9CA3AF',
                        }}>{r.sent ? '✓ 발송됨' : '미발송'}</button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-primary btn-xs"
                            onClick={() => navigate(`/reports/${selected.id}/${r.student_id}`)}>편집</button>
                          <button className="btn btn-secondary btn-xs" onClick={() => copyLink(r)} title="링크 복사">🔗</button>
                          <button className="btn btn-secondary btn-xs" onClick={() => copyMsg(r)} title="카톡 발송 문구 복사">💬</button>
                          <a href={`/r/${r.share_code}`} target="_blank" rel="noopener noreferrer"
                            className="btn btn-secondary btn-xs" title="미리보기">👁</a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>해당 조건의 학생이 없습니다.</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* 전체 발송 문구 모달 */}
      {showAllMsg && selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAllMsg(false)}>
          <div className="modal" style={{ maxWidth: 660 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="modal-title" style={{ margin: 0 }}>전체 발송 문구 — {selected.title}</h2>
              <button onClick={() => {
                const all = reports.filter(r => r.completed && r.share_code)
                  .map(r => buildMessage(r, selected, PUBLIC_BASE)).join('\n\n──────────\n\n');
                navigator.clipboard.writeText(all);
                showToast('전체 문구 복사됨');
              }} className="btn btn-primary btn-sm">전체 복사</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '58vh', overflowY: 'auto' }}>
              {reports.map(r => (
                <div key={r.student_id} style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, color: '#1C1C1E' }}>{r.name}</span>
                      {r.share_code && (
                        <span style={{ fontSize: 11, padding: '1px 7px', background: '#EFF6FF', color: '#1D4ED8', borderRadius: 10, fontFamily: 'monospace', fontWeight: 700 }}>
                          /r/{r.share_code}
                        </span>
                      )}
                      {r.sent && <span style={{ fontSize: 11, color: '#065F46', background: '#D1FAE5', padding: '1px 7px', borderRadius: 20, fontWeight: 600 }}>✓ 발송됨</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-xs" onClick={() => copyMsg(r)}>카톡 문구 복사</button>
                    </div>
                  </div>
                  <pre style={{ fontSize: 12, color: '#374151', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.75, margin: 0, padding: '12px 14px', fontFamily: "-apple-system,'Apple SD Gothic Neo',sans-serif" }}>
                    {buildMessage(r, selected, PUBLIC_BASE)}
                  </pre>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAllMsg(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
