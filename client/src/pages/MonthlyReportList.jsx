import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContext } from '../App.jsx';

export default function MonthlyReportList() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useContext(ToastContext);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  async function load() {
    const res = await fetch('/api/monthly-reports');
    setReports(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function createReport(ym) {
    const res = await fetch('/api/monthly-reports', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year_month: ym }),
    });
    if (!res.ok) { const d = await res.json(); showToast(d.error, 'error'); return; }
    const d = await res.json();
    navigate(`/monthly-reports/${d.id}`);
  }

  const thisMonthReport = reports.find(r => r.year_month === thisMonth);

  function fmtYearMonth(ym) {
    const [y, m] = ym.split('-');
    return `${y}년 ${parseInt(m)}월`;
  }

  function fmtMoney(n) {
    if (!n) return '—';
    return Number(n).toLocaleString('ko-KR') + '원';
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">월간 운영 리포트</h1>
          <p className="page-subtitle">매달 학원 운영 기록</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {thisMonthReport
            ? <button className="btn btn-primary" onClick={() => navigate(`/monthly-reports/${thisMonthReport.id}`)}>이번 달 리포트 열기</button>
            : <button className="btn btn-primary" onClick={() => createReport(thisMonth)}>이번 달 리포트 만들기</button>
          }
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>불러오는 중...</div>}

      {!loading && reports.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>아직 리포트가 없어요</div>
          <div style={{ fontSize: 13 }}>이번 달 리포트를 만들어보세요!</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {reports.map(r => {
          const isThis = r.year_month === thisMonth;
          return (
            <div key={r.id} onClick={() => navigate(`/monthly-reports/${r.id}`)} style={{
              background: '#fff', borderRadius: 16, padding: '18px 22px',
              boxShadow: '0 2px 10px rgba(43,54,96,0.07)',
              border: isThis ? '2px solid #7EC8E3' : '1px solid #E5E7EB',
              cursor: 'pointer', transition: 'box-shadow 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(43,54,96,0.14)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 10px rgba(43,54,96,0.07)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 16, color: '#2B3660' }}>{fmtYearMonth(r.year_month)} 운영 리포트</span>
                  {isThis && <span style={{ fontSize: 11, background: '#EFF6FF', color: '#2B3660', borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>이번 달</span>}
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700, borderRadius: 20, padding: '4px 12px',
                  background: r.status === '완료' ? '#D1FAE5' : '#FEF3C7',
                  color: r.status === '완료' ? '#065F46' : '#92400E',
                }}>{r.status}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                {[
                  { label: '재원생', value: `${r.enrolled_count}명`, color: '#2B3660' },
                  { label: '신규생', value: `${r.new_count}명`, color: '#059669' },
                  { label: '퇴원생', value: `${r.withdrawn_count}명`, color: '#DC2626' },
                  { label: '총 수납', value: fmtMoney(r.total_revenue), color: '#1C1C1E' },
                  { label: '교재비 제외', value: fmtMoney(r.revenue_excl_textbook), color: '#1C1C1E' },
                  { label: '홍보 달성', value: `${r.promo_rate}%`, color: r.promo_rate >= 100 ? '#059669' : '#D97706' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: '#F8F9FB', borderRadius: 10, padding: '8px 12px' }}>
                    <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
