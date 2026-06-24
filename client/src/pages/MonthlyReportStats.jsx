import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

const COLORS = {
  enrolled: '#2B3660',
  new: '#059669',
  withdrawn: '#DC2626',
  revenue: '#7EC8E3',
  excl_textbook: '#2B3660',
  expense: '#F97316',
  net: '#059669',
  insta: '#E1306C',
  blog: '#F97316',
  cafe: '#2B3660',
  offline: '#7EC8E3',
};

function fmtMoney(n) { return (Number(n || 0) / 10000).toFixed(0) + '만'; }
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
const TimeTooltip = (props) => <CustomTooltip {...props} unit="회" />;

export default function MonthlyReportStats() {
  const [reports, setReports] = useState([]);
  const [data, setData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/monthly-reports')
      .then(r => r.json())
      .then(list => {
        const sorted = [...list].sort((a, b) => a.year_month.localeCompare(b.year_month));
        setReports(sorted);

        const chartData = sorted.map(r => ({
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
        setData(chartData);
      });
  }, []);

  if (reports.length === 0) return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">운영 추이 그래프</h1>
          <p className="page-subtitle">월별 변화를 한눈에</p>
        </div>
      </div>
      <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
        <div style={{ fontWeight: 600 }}>아직 리포트 데이터가 없어요</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>월간 운영 리포트를 작성하면 여기서 추이를 볼 수 있어요</div>
        <button onClick={() => navigate('/monthly-reports')} style={{ marginTop: 16, padding: '10px 20px', background: '#2B3660', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>리포트 작성하러 가기</button>
      </div>
    </div>
  );

  if (reports.length < 2) return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">운영 추이 그래프</h1>
        </div>
      </div>
      <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>
        <div style={{ fontSize: 13 }}>그래프는 2개월 이상 데이터가 있어야 그려져요</div>
      </div>
    </div>
  );

  const latestEnrolled = data[data.length - 1]?.재원생 || 0;
  const prevEnrolled = data[data.length - 2]?.재원생 || 0;
  const enrolledDiff = latestEnrolled - prevEnrolled;

  const cards = [
    { label: '현재 재원생', value: `${latestEnrolled}명`, sub: enrolledDiff >= 0 ? `▲ ${enrolledDiff}명` : `▼ ${Math.abs(enrolledDiff)}명`, subColor: enrolledDiff >= 0 ? '#059669' : '#DC2626' },
    { label: '최근 신규생', value: `${data[data.length-1]?.신규생 || 0}명`, sub: `${data[data.length-1]?.name}`, subColor: '#9CA3AF' },
    { label: '최근 교재비 제외 매출', value: `${data[data.length-1]?.교재비제외 || 0}만원`, sub: `총수납 ${data[data.length-1]?.총수납 || 0}만원`, subColor: '#9CA3AF' },
    { label: '최근 홍보 달성률', value: `${data[data.length-1]?.홍보달성 || 0}%`, sub: data[data.length-1]?.홍보달성 >= 100 ? '목표 달성 🎉' : '목표 미달성', subColor: (data[data.length-1]?.홍보달성 || 0) >= 100 ? '#059669' : '#D97706' },
  ];

  const chartProps = {
    data,
    margin: { top: 10, right: 20, left: 0, bottom: 0 },
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">운영 추이 그래프</h1>
          <p className="page-subtitle">{data[0]?.name} ~ {data[data.length-1]?.name} · {data.length}개월</p>
        </div>
        <button onClick={() => navigate('/monthly-reports')} style={{ padding: '8px 16px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>← 리포트 목록</button>
      </div>

      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 24 }}>
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
              {[...data].reverse().map((r, i) => (
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
