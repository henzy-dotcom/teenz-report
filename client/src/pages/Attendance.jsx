import React, { useEffect, useState, useContext, useCallback } from 'react';
import { ToastContext } from '../App.jsx';

function Counter({ value, onChange, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button onClick={() => onChange(Math.max(0, value - 1))} style={{
        width: 28, height: 28, borderRadius: 8, border: '1.5px solid #E5E7EB',
        background: '#F9FAFB', cursor: 'pointer', fontSize: 16, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280',
      }}>−</button>
      <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700, fontSize: 16, color }}>{value}</span>
      <button onClick={() => onChange(value + 1)} style={{
        width: 28, height: 28, borderRadius: 8, border: '1.5px solid #E5E7EB',
        background: '#F9FAFB', cursor: 'pointer', fontSize: 16, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280',
      }}>+</button>
    </div>
  );
}

export default function Attendance() {
  const now = new Date();
  const [yearMonth, setYearMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [rows, setRows] = useState([]);
  const { showToast } = useContext(ToastContext);

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
        <input type="month" value={yearMonth} onChange={e => setYearMonth(e.target.value)}
          style={{ padding: '8px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#2B3660', cursor: 'pointer' }} />
      </div>

      {/* 요약 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
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

      {/* 학생 목록 */}
      {Object.entries(grouped).map(([cls, students]) => (
        <div key={cls} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(43,54,96,0.07)', marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', background: '#2B3660', color: 'white', fontWeight: 700, fontSize: 13 }}>
            {cls}
          </div>
          <div>
            {students.map((s, i) => {
              const unmade = Math.max(0, s.absent - s.makeup);
              return (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', padding: '14px 18px',
                  borderBottom: i < students.length - 1 ? '1px solid #F3F4F6' : 'none',
                  gap: 12,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1C1C1E' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{s.grade}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 600, marginBottom: 4 }}>결석</div>
                      <Counter value={s.absent} color="#DC2626" onChange={v => update(s.id, v, s.makeup)} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#059669', fontWeight: 600, marginBottom: 4 }}>보충</div>
                      <Counter value={s.makeup} color="#059669" onChange={v => update(s.id, s.absent, v)} />
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 40 }}>
                      <div style={{ fontSize: 10, color: '#D97706', fontWeight: 600, marginBottom: 4 }}>미보충</div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: unmade > 0 ? '#D97706' : '#D1D5DB' }}>{unmade}</div>
                    </div>
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
