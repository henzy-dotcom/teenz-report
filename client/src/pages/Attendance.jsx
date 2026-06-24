import React, { useEffect, useState, useContext, useCallback } from 'react';
import { ToastContext } from '../App.jsx';

function Counter({ value, onChange, color, bg }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        style={{
          width: 30, height: 30, borderRadius: 8, border: 'none',
          background: '#F3F4F6', cursor: 'pointer', fontSize: 18, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280',
        }}
      >−</button>
      <span style={{
        width: 28, textAlign: 'center', fontWeight: 800, fontSize: 18, color,
        background: bg, borderRadius: 8, padding: '2px 0',
      }}>{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        style={{
          width: 30, height: 30, borderRadius: 8, border: 'none',
          background: '#F3F4F6', cursor: 'pointer', fontSize: 18, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280',
        }}
      >+</button>
    </div>
  );
}

export default function Attendance() {
  const now = new Date();
  const [yearMonth, setYearMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [rows, setRows] = useState([]);
  const showToast = useContext(ToastContext);

  function moveMonth(delta) {
    const [y, m] = yearMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setYearMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  function fmtYM(ym) {
    const [y, m] = ym.split('-');
    return `${y}년 ${parseInt(m)}월`;
  }

  const load = useCallback(async () => {
    const res = await fetch(`/api/attendance/${yearMonth}`);
    setRows(await res.json());
  }, [yearMonth]);

  useEffect(() => { load(); }, [load]);

  async function update(studentId, absent, makeup) {
    setRows(prev => prev.map(r => r.id === studentId ? { ...r, absent, makeup } : r));
    await fetch(`/api/attendance/${yearMonth}/${studentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ absent, makeup }),
    });
  }

  const totalAbsent = rows.reduce((s, r) => s + r.absent, 0);
  const totalMakeup = rows.reduce((s, r) => s + r.makeup, 0);
  const totalUnmade = rows.reduce((s, r) => s + Math.max(0, r.absent - r.makeup), 0);

  const grouped = rows.reduce((acc, r) => {
    const key = r.class_subject || '기타';
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">출결 관리</h1>
          <p className="page-subtitle">결석 및 보충 현황</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => moveMonth(-1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#2B3660' }}>‹</button>
          <div style={{ padding: '6px 14px', background: '#2B3660', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 700, minWidth: 110, textAlign: 'center' }}>{fmtYM(yearMonth)}</div>
          <button onClick={() => moveMonth(1)} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#2B3660' }}>›</button>
        </div>
      </div>

      {/* 요약 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: '총 결석', value: totalAbsent, bg: '#FEE2E2', color: '#DC2626' },
          { label: '보충 완료', value: totalMakeup, bg: '#D1FAE5', color: '#059669' },
          { label: '미보충', value: totalUnmade, bg: '#FEF3C7', color: '#D97706' },
        ].map(({ label, value, bg, color }) => (
          <div key={label} style={{ background: bg, borderRadius: 14, padding: '16px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 12, color, fontWeight: 600, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* 반별 카드 그리드 */}
      {Object.entries(grouped).map(([cls, students]) => (
        <div key={cls} style={{ marginBottom: 24 }}>
          {/* 반 이름 */}
          <div style={{
            display: 'inline-block', marginBottom: 12,
            padding: '4px 14px', borderRadius: 20,
            background: '#2B3660', color: '#fff',
            fontSize: 12, fontWeight: 700,
          }}>{cls}</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
            {students.map(s => {
              const unmade = Math.max(0, s.absent - s.makeup);
              return (
                <div key={s.id} style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: '12px 10px',
                  boxShadow: '0 2px 10px rgba(43,54,96,0.07)',
                  border: unmade > 0 ? '1.5px solid #FCD34D' : '1px solid #E5E7EB',
                }}>
                  {/* 이름 */}
                  <div style={{ textAlign: 'center', marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1C1C1E' }}>{s.name}</div>
                    {s.grade && <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>{s.grade}</div>}
                  </div>

                  {/* 결석 */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>결석</div>
                    <Counter value={s.absent} color="#DC2626" bg="#FEF2F2" onChange={v => update(s.id, v, s.makeup)} />
                  </div>

                  {/* 보충 */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: '#059669', fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>보충</div>
                    <Counter value={s.makeup} color="#059669" bg="#F0FDF4" onChange={v => update(s.id, s.absent, v)} />
                  </div>

                  {/* 미보충 뱃지 */}
                  <div style={{ textAlign: 'center' }}>
                    {unmade > 0 ? (
                      <span style={{ display: 'inline-block', padding: '2px 10px', background: '#FEF3C7', color: '#D97706', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>미보충 {unmade}회</span>
                    ) : (
                      <span style={{ display: 'inline-block', padding: '2px 10px', background: '#F3F4F6', color: '#9CA3AF', borderRadius: 20, fontSize: 10, fontWeight: 600 }}>완료</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {rows.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
          재원 학생이 없어요.
        </div>
      )}
    </div>
  );
}
