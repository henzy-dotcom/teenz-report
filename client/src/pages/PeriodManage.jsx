import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContext } from '../App.jsx';

export default function PeriodManage() {
  const [periods, setPeriods]   = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]         = useState({ title: '', start_date: '', end_date: '' });
  const [loading, setLoading]   = useState(false);
  const showToast = useContext(ToastContext);
  const navigate  = useNavigate();

  async function load() {
    const data = await fetch('/api/periods').then(r => r.json());
    setPeriods(data);
  }
  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!form.start_date || !form.end_date) { showToast('기간을 입력해주세요.', 'error'); return; }
    setLoading(true);
    const res  = await fetch('/api/periods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || '생성 실패', 'error'); setLoading(false); return; }
    showToast('회차를 생성했습니다. 재원생 리포트가 자동 생성됩니다.');
    setShowModal(false);
    setForm({ title: '', start_date: '', end_date: '' });
    setLoading(false);
    load();
  }

  async function handleDelete(id) {
    if (!confirm('이 회차와 모든 리포트 데이터를 삭제할까요?')) return;
    await fetch(`/api/periods/${id}`, { method: 'DELETE' });
    showToast('삭제했습니다.', 'info');
    load();
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">리포트 회차 관리</h1>
          <p className="page-subtitle">2주 단위 리포트 기간을 관리합니다</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ 새 회차 생성</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {periods.map((p, idx) => (
          <div key={p.id} style={{
            background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            {/* 왼쪽: 제목 + 날짜 */}
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#2B3660' }}>{p.title}</span>
                {idx === 0 && (
                  <span style={{ fontSize: 10, padding: '2px 8px', background: '#EFF6FF', color: '#1D4ED8', borderRadius: 20, fontWeight: 700 }}>최신</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                {p.start_date} ~ {p.end_date}
              </div>
            </div>

            {/* 가운데: 진행 숫자 */}
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { label: '전체', val: p.report_count,    color: '#2B3660', bg: '#EFF6FF' },
                { label: '완료', val: p.completed_count, color: '#059669', bg: '#D1FAE5' },
                { label: '발송', val: p.sent_count,      color: '#1D4ED8', bg: '#DBEAFE' },
              ].map(({ label, val, color, bg }) => (
                <div key={label} style={{ textAlign: 'center', background: bg, borderRadius: 8, padding: '6px 14px', minWidth: 56 }}>
                  <div style={{ fontWeight: 800, fontSize: 18, color, lineHeight: 1 }}>{val ?? 0}</div>
                  <div style={{ fontSize: 10, color, opacity: 0.7, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* 진행률 바 */}
            {p.report_count > 0 && (
              <div style={{ minWidth: 100 }}>
                <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>
                  완료 {Math.round((p.completed_count / p.report_count) * 100)}%
                </div>
                <div style={{ height: 6, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden', width: 100 }}>
                  <div style={{
                    height: '100%', borderRadius: 3, transition: 'width 0.4s',
                    background: '#059669',
                    width: `${Math.round((p.completed_count / p.report_count) * 100)}%`,
                  }} />
                </div>
              </div>
            )}

            {/* 오른쪽: 버튼 */}
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>
                대시보드 보기
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(p.id)}>
                삭제
              </button>
            </div>
          </div>
        ))}

        {periods.length === 0 && (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '64px 24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
            <p style={{ color: '#6B7280', marginBottom: 6 }}>아직 리포트 회차가 없습니다.</p>
            <p style={{ fontSize: 12, color: '#9CA3AF' }}>새 회차를 생성하면 재원생 리포트가 자동으로 만들어집니다.</p>
          </div>
        )}
      </div>

      {/* 모달 */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h2 className="modal-title">새 회차 생성</h2>

            <div className="form-group">
              <label className="label">회차 제목 (비워두면 자동 생성)</label>
              <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="예: 6월 2주차 리포트" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="label">시작일 *</label>
                <input type="date" className="input" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="label">종료일 *</label>
                <input type="date" className="input" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>

            <div style={{ padding: '10px 12px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: 12, color: '#1D4ED8', marginBottom: 4 }}>
              💡 회차 생성 시 현재 재원 중인 학생들의 빈 리포트가 자동으로 생성됩니다.
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
                {loading ? <span className="spinner" /> : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
