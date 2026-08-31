import React, { useEffect, useState, useContext, useCallback } from 'react';
import { ToastContext } from '../App.jsx';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDate(dateStr) {
  const [, m, d] = dateStr.split('-');
  const wd = '일월화수목금토'[new Date(dateStr).getDay()];
  return `${parseInt(m)}/${parseInt(d)}(${wd})`;
}

function DateChips({ records, color, bg, onRemove }) {
  if (records.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6, justifyContent: 'center' }}>
      {records.map(r => (
        <span
          key={r.id}
          onClick={() => onRemove(r.id)}
          title="탭하면 삭제"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '2px 6px', borderRadius: 8, background: bg, color,
            fontSize: 10, fontWeight: 700, cursor: 'pointer',
          }}
        >{fmtDate(r.date)} ✕</span>
      ))}
    </div>
  );
}

function AddDateRow({ color, onAdd }) {
  const [date, setDate] = useState(todayStr());
  return (
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'center' }}>
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        style={{
          border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 10,
          padding: '2px 4px', color: '#374151', width: 108,
        }}
      />
      <button
        onClick={() => onAdd(date)}
        style={{
          border: 'none', borderRadius: 6, background: color, color: '#fff',
          fontSize: 11, fontWeight: 700, padding: '4px 8px', cursor: 'pointer',
        }}
      >+ 추가</button>
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

  async function addRecord(studentId, type, date) {
    await fetch(`/api/attendance/${yearMonth}/${studentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, date }),
    });
    load();
    showToast?.(type === 'absent' ? '결석 기록 추가됨' : '보충 기록 추가됨');
  }

  async function removeRecord(id) {
    await fetch(`/api/attendance/record/${id}`, { method: 'DELETE' });
    load();
  }

  const totalAbsent = rows.reduce((s, r) => s + r.absent + (r.legacyAbsent || 0), 0);
  const totalMakeup = rows.reduce((s, r) => s + r.makeup + (r.legacyMakeup || 0), 0);
  const totalUnmade = rows.reduce((s, r) => s + Math.max(0, (r.absent + (r.legacyAbsent || 0)) - (r.makeup + (r.legacyMakeup || 0))), 0);

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
          <p className="page-subtitle">결석 및 보충 현황 (날짜별 기록)</p>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {students.map(s => {
              const absentTotal = s.absent + (s.legacyAbsent || 0);
              const makeupTotal = s.makeup + (s.legacyMakeup || 0);
              const unmade = Math.max(0, absentTotal - makeupTotal);
              const absentRecords = s.records.filter(r => r.type === 'absent');
              const makeupRecords = s.records.filter(r => r.type === 'makeup');
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
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>
                      결석 {absentTotal > 0 && `(${absentTotal})`}
                    </div>
                    <AddDateRow color="#DC2626" onAdd={date => addRecord(s.id, 'absent', date)} />
                    <DateChips records={absentRecords} color="#DC2626" bg="#FEF2F2" onRemove={removeRecord} />
                  </div>

                  {/* 보충 */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: '#059669', fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>
                      보충 {makeupTotal > 0 && `(${makeupTotal})`}
                    </div>
                    <AddDateRow color="#059669" onAdd={date => addRecord(s.id, 'makeup', date)} />
                    <DateChips records={makeupRecords} color="#059669" bg="#F0FDF4" onRemove={removeRecord} />
                  </div>

                  {/* 이전 기록(날짜 미상) 안내 */}
                  {(s.legacyAbsent > 0 || s.legacyMakeup > 0) && (
                    <div style={{ textAlign: 'center', fontSize: 9, color: '#9CA3AF', marginBottom: 6 }}>
                      이전 기록(날짜 미상) 결석 {s.legacyAbsent} · 보충 {s.legacyMakeup}
                    </div>
                  )}

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
