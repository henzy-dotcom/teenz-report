import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { ToastContext } from '../App.jsx';

const COLORS = {
  enrolled: '#2B3660',
  new: '#059669',
  withdrawn: '#DC2626',
  revenue: '#7EC8E3',
  excl_textbook: '#2B3660',
  expense: '#F97316',
  net: '#059669',
};

function fmtYM(ym) { const [, m] = ym.split('-'); return `${parseInt(m)}월`; }

const CustomTooltip = ({ active, payload, label, unit = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
      <div style={{ fontWeight: 700, fontSize: 12, color: '#9CA3AF', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ color: '#374151' }}>{p.name}</span>
          <span style={{ fontWeight: 700, color: p.color, marginLeft: 'auto' }}>{p.value}{unit}</span>
        </div>
      ))}
    </div>
  );
};

const MoneyTooltip = (props) => <CustomTooltip {...props} unit="만원" />;
const CountTooltip = (props) => <CustomTooltip {...props} unit="명" />;
const TimeTooltip = (props) => <CustomTooltip {...props} unit="%" />;

// ─── 운영 그래프 패널 (운영 일지 목록에서 토글로 열림) ───
function StatsPanel({ reports, navigate }) {
  const sorted = [...reports].sort((a, b) => a.year_month.localeCompare(b.year_month));
  const data = sorted.map(r => ({
    name: fmtYM(r.year_month),
    ym: r.year_month,
    id: r.id,
    재원생: r.enrolled_count || 0,
    신규생: r.new_count || 0,
    퇴원생: r.withdrawn_count || 0,
    총수납: Math.round((r.total_revenue || 0) / 10000),
    교재비제외: Math.round((r.revenue_excl_textbook || 0) / 10000),
    지출: Math.round((r.expense_total || 0) / 10000),
    잔액: Math.round((r.net_revenue || 0) / 10000),
    홍보달성: r.promo_rate || 0,
  }));

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 50, color: '#9CA3AF', background: '#FBFAFF', border: '1.5px solid #E9E5FA', borderRadius: 16, marginBottom: 24 }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
        아직 리포트 데이터가 없어요. 운영 일지를 작성하면 여기서 추이를 볼 수 있어요.
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div style={{ textAlign: 'center', padding: 50, color: '#9CA3AF', background: '#FBFAFF', border: '1.5px solid #E9E5FA', borderRadius: 16, marginBottom: 24 }}>
        <div style={{ fontSize: 13 }}>그래프는 2개월 이상 데이터가 있어야 그려져요</div>
      </div>
    );
  }

  const latestEnrolled = data[data.length - 1]?.재원생 || 0;
  const prevEnrolled = data[data.length - 2]?.재원생 || 0;
  const enrolledDiff = latestEnrolled - prevEnrolled;

  const cards = [
    { label: '현재 재원생', value: `${latestEnrolled}명`, sub: enrolledDiff >= 0 ? `▲ ${enrolledDiff}명` : `▼ ${Math.abs(enrolledDiff)}명`, subColor: enrolledDiff >= 0 ? '#059669' : '#DC2626' },
    { label: '최근 신규생', value: `${data[data.length - 1]?.신규생 || 0}명`, sub: `${data[data.length - 1]?.name}`, subColor: '#9CA3AF' },
    { label: '최근 교재비 제외 매출', value: `${data[data.length - 1]?.교재비제외 || 0}만원`, sub: `총수납 ${data[data.length - 1]?.총수납 || 0}만원`, subColor: '#9CA3AF' },
    { label: '최근 홍보 달성률', value: `${data[data.length - 1]?.홍보달성 || 0}%`, sub: data[data.length - 1]?.홍보달성 >= 100 ? '목표 달성 🎉' : '목표 미달성', subColor: (data[data.length - 1]?.홍보달성 || 0) >= 100 ? '#059669' : '#D97706' },
  ];

  const chartProps = { data, margin: { top: 10, right: 20, left: 0, bottom: 0 } };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>{data[0]?.name} ~ {data[data.length - 1]?.name} · {data.length}개월</div>

      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', boxShadow: '0 2px 8px rgba(43,54,96,0.07)', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#2B3660' }}>{c.value}</div>
            <div style={{ fontSize: 11, color: c.subColor, fontWeight: 600, marginTop: 2 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* 그래프 1: 학생 현황 */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 2px 10px rgba(43,54,96,0.07)', border: '1px solid #E5E7EB', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#2B3660', marginBottom: 16 }}>👥 학생 현황 추이</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9CA3AF' }} />
            <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} allowDecimals={false} />
            <Tooltip content={<CountTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="재원생" stroke={COLORS.enrolled} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.enrolled }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="신규생" stroke={COLORS.new} strokeWidth={2} dot={{ r: 4, fill: COLORS.new }} activeDot={{ r: 6 }} strokeDasharray="5 3" />
            <Line type="monotone" dataKey="퇴원생" stroke={COLORS.withdrawn} strokeWidth={2} dot={{ r: 4, fill: COLORS.withdrawn }} activeDot={{ r: 6 }} strokeDasharray="5 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 그래프 2: 수납/정산 */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 2px 10px rgba(43,54,96,0.07)', border: '1px solid #E5E7EB', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#2B3660', marginBottom: 4 }}>💰 수납 / 정산 추이</div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 16 }}>단위: 만원</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9CA3AF' }} />
            <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} unit="만" />
            <Tooltip content={<MoneyTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} stroke="#E5E7EB" />
            <Line type="monotone" dataKey="총수납" stroke={COLORS.revenue} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="교재비제외" stroke={COLORS.excl_textbook} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="지출" stroke={COLORS.expense} strokeWidth={2} dot={{ r: 4 }} strokeDasharray="4 2" />
            <Line type="monotone" dataKey="잔액" stroke={COLORS.net} strokeWidth={2.5} dot={{ r: 5, fill: COLORS.net }} activeDot={{ r: 7 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 그래프 3: 홍보 달성률 */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 2px 10px rgba(43,54,96,0.07)', border: '1px solid #E5E7EB', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#2B3660', marginBottom: 16 }}>📣 홍보 달성률 추이</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9CA3AF' }} />
            <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} domain={[0, 120]} unit="%" />
            <Tooltip content={<TimeTooltip />} />
            <ReferenceLine y={100} stroke="#059669" strokeDasharray="4 2" label={{ value: '목표 100%', position: 'right', fill: '#059669', fontSize: 11 }} />
            <Line type="monotone" dataKey="홍보달성" name="홍보 달성률" stroke="#D97706" strokeWidth={2.5} dot={({ cx, cy, payload }) => (
              <circle key={payload.ym} cx={cx} cy={cy} r={5} fill={payload.홍보달성 >= 100 ? '#059669' : '#D97706'} />
            )} activeDot={{ r: 7 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 월별 데이터 테이블 */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 2px 10px rgba(43,54,96,0.07)', border: '1px solid #E5E7EB' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#2B3660', marginBottom: 14 }}>📋 월별 데이터 요약</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F8F9FB' }}>
                {['월', '재원생', '신규', '퇴원', '총수납', '교재비제외', '지출', '잔액', '홍보'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'center', color: '#9CA3AF', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map(r => (
                <tr key={r.ym} onClick={() => navigate(`/monthly-reports/${r.id}`)} style={{ borderTop: '1px solid #F3F4F6', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8F9FB'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td style={{ padding: '8px 12px', fontWeight: 700, color: '#2B3660', whiteSpace: 'nowrap' }}>{r.name}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>{r.재원생}명</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', color: '#059669', fontWeight: 600 }}>+{r.신규생}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', color: '#DC2626', fontWeight: 600 }}>-{r.퇴원생}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>{r.총수납}만</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>{r.교재비제외}만</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', color: '#F97316' }}>{r.지출}만</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: r.잔액 >= 0 ? '#059669' : '#DC2626' }}>{r.잔액}만</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', color: r.홍보달성 >= 100 ? '#059669' : '#D97706', fontWeight: 600 }}>{r.홍보달성}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function MonthlyReportList() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const navigate = useNavigate();
  const showToast = useContext(ToastContext);

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

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
          <h1 className="page-title">운영 일지</h1>
          <p className="page-subtitle">매달 학원 운영 기록 · 운영 추이 그래프도 여기서 볼 수 있어요</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowStats(v => !v)}>
            {showStats ? '📊 그래프 닫기' : '📊 운영 그래프 보기'}
          </button>
          {thisMonthReport
            ? <button className="btn btn-primary" onClick={() => navigate(`/monthly-reports/${thisMonthReport.id}`)}>이번 달 리포트 열기</button>
            : <button className="btn btn-primary" onClick={() => createReport(thisMonth)}>이번 달 리포트 만들기</button>
          }
        </div>
      </div>

      {showStats && !loading && <StatsPanel reports={reports} navigate={navigate} />}

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
