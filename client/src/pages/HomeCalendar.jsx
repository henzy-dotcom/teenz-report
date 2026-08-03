import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const TODAY = new Date();
const todayStr = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-${String(TODAY.getDate()).padStart(2, '0')}`;

const COLORS = {
  yellow: { chip: '#FEF08A', text: '#92400E', dot: '#F59E0B' },
  blue:   { chip: '#BAE6FD', text: '#1E40AF', dot: '#3B82F6' },
  green:  { chip: '#BBF7D0', text: '#166534', dot: '#10B981' },
  pink:   { chip: '#FBCFE8', text: '#9D174D', dot: '#EC4899' },
  purple: { chip: '#E9D5FF', text: '#6B21A8', dot: '#A855F7' },
};

const COLOR_KEYS = Object.keys(COLORS);

function toYM(y, m) {
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y, m)    { return new Date(y, m, 1).getDay(); }

export default function HomeCalendar() {
  const navigate = useNavigate();
  const [year, setYear]   = useState(TODAY.getFullYear());
  const [month, setMonth] = useState(TODAY.getMonth()); // 0-indexed
  const [events, setEvents]     = useState([]);
  const [monthReportId, setMonthReportId] = useState(null);
  const [selectedDate, setSelectedDate]   = useState(todayStr);
  const [panel, setPanel]   = useState(null); // { date, events }
  const [form, setForm]     = useState({ title: '', color: 'yellow', description: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm]   = useState({});
  const [loading, setLoading]     = useState(false);
  const panelRef = useRef(null);

  const ym = toYM(year, month);

  // 이번 달 운영일지 report_id 가져오기
  useEffect(() => {
    fetch('/api/monthly-reports')
      .then(r => r.json())
      .then(list => {
        const found = list.find(r => r.year_month === ym);
        if (found) {
          setMonthReportId(found.id);
        } else {
          setMonthReportId(null);
          setEvents([]);
        }
      });
  }, [ym]);

  // 해당 report의 캘린더 이벤트 로드
  useEffect(() => {
    if (!monthReportId) return;
    fetch(`/api/monthly-reports/${monthReportId}/calendar`)
      .then(r => r.json())
      .then(setEvents);
  }, [monthReportId]);

  // 날짜별 이벤트 맵
  const eventsByDate = {};
  for (const ev of events) {
    if (!eventsByDate[ev.event_date]) eventsByDate[ev.event_date] = [];
    eventsByDate[ev.event_date].push(ev);
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  function selectDate(dateStr) {
    setSelectedDate(dateStr);
    setPanel({ date: dateStr, evs: eventsByDate[dateStr] || [] });
    setForm({ title: '', color: 'yellow', description: '' });
    setEditingId(null);
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }

  async function ensureReport() {
    if (monthReportId) return monthReportId;
    // 운영일지 없으면 자동 생성
    const res = await fetch('/api/monthly-reports', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year_month: ym }),
    });
    const data = await res.json();
    setMonthReportId(data.id);
    return data.id;
  }

  async function loadEvents(rid) {
    const res = await fetch(`/api/monthly-reports/${rid}/calendar`);
    const data = await res.json();
    setEvents(data);
    return data;
  }

  async function addEvent() {
    if (!form.title.trim()) return;
    setLoading(true);
    const rid = await ensureReport();
    await fetch(`/api/monthly-reports/${rid}/calendar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, event_date: selectedDate }),
    });
    const updated = await loadEvents(rid);
    setPanel({ date: selectedDate, evs: updated.filter(e => e.event_date === selectedDate) });
    setForm({ title: '', color: 'yellow', description: '' });
    setLoading(false);
  }

  async function updateEvent(eid) {
    setLoading(true);
    await fetch(`/api/monthly-reports/${monthReportId}/calendar/${eid}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    const updated = await loadEvents(monthReportId);
    setPanel({ date: selectedDate, evs: updated.filter(e => e.event_date === selectedDate) });
    setEditingId(null);
    setLoading(false);
  }

  async function deleteEvent(eid) {
    setLoading(true);
    await fetch(`/api/monthly-reports/${monthReportId}/calendar/${eid}`, { method: 'DELETE' });
    const updated = await loadEvents(monthReportId);
    setPanel({ date: selectedDate, evs: updated.filter(e => e.event_date === selectedDate) });
    setLoading(false);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay    = getFirstDay(year, month);
  const weeks = [];
  let day = 1 - firstDay;
  while (day <= daysInMonth) {
    const week = [];
    for (let i = 0; i < 7; i++, day++) {
      week.push(day >= 1 && day <= daysInMonth ? day : null);
    }
    weeks.push(week);
  }

  const panelDate = panel?.date;
  const panelEvs  = panel?.evs || [];

  const [y2, m2, d2] = (panelDate || todayStr).split('-').map(Number);
  const panelLabel = panelDate ? `${m2}월 ${d2}일 (${DOW[new Date(y2, m2 - 1, d2).getDay()]})` : '';

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 14px 100px', fontFamily: 'inherit' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1C1C1E' }}>{year}년 {month + 1}월</div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>이달 플랜</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={prevMonth} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #E5E7EB', background: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <button onClick={() => { setYear(TODAY.getFullYear()); setMonth(TODAY.getMonth()); selectDate(todayStr); }} style={{ height: 36, padding: '0 14px', borderRadius: 18, border: '1px solid #E5E7EB', background: '#fff', fontSize: 12, fontWeight: 700, color: '#2B3660', cursor: 'pointer' }}>오늘</button>
          <button onClick={nextMonth} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #E5E7EB', background: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
        </div>
      </div>

      {/* 달력 */}
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(43,54,96,0.08)', overflow: 'hidden', marginBottom: 16 }}>
        {/* 요일 헤더 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #F3F4F6' }}>
          {DOW.map((d, i) => (
            <div key={d} style={{ textAlign: 'center', padding: '10px 0 8px', fontSize: 11, fontWeight: 700, color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : '#9CA3AF' }}>{d}</div>
          ))}
        </div>

        {/* 날짜 */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi < weeks.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
            {week.map((d, di) => {
              if (!d) return <div key={di} />;
              const dateStr = `${ym}-${String(d).padStart(2, '0')}`;
              const dayEvs  = eventsByDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              const isSel   = dateStr === selectedDate;
              const dow     = di;

              return (
                <div key={di} onClick={() => selectDate(dateStr)}
                  style={{ padding: '8px 4px 10px', cursor: 'pointer', textAlign: 'center', background: isSel ? '#F0F4FF' : 'transparent', transition: 'background 0.15s' }}>
                  {/* 날짜 숫자 */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', margin: '0 auto 4px',
                    background: isToday ? '#2B3660' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: isToday || isSel ? 700 : 400,
                    color: isToday ? '#fff' : dow === 0 ? '#EF4444' : dow === 6 ? '#3B82F6' : '#1C1C1E',
                    border: isSel && !isToday ? '2px solid #2B3660' : 'none',
                  }}>
                    {d}
                  </div>
                  {/* 이벤트 도트 */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap', minHeight: 8 }}>
                    {dayEvs.slice(0, 3).map(ev => (
                      <div key={ev.id} style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS[ev.color]?.dot || '#F59E0B', flexShrink: 0 }} />
                    ))}
                    {dayEvs.length > 3 && <div style={{ fontSize: 8, color: '#9CA3AF', lineHeight: '6px' }}>+</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 선택된 날짜 패널 */}
      {panel && (
        <div ref={panelRef} style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(43,54,96,0.08)', overflow: 'hidden' }}>
          {/* 패널 헤더 */}
          <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1C1C1E' }}>{panelLabel}</div>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>{panelEvs.length}개 일정</span>
          </div>

          {/* 일정 목록 */}
          <div style={{ padding: '10px 18px' }}>
            {panelEvs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#D1D5DB', fontSize: 13 }}>일정이 없어요. 아래에서 추가해보세요!</div>
            )}
            {panelEvs.map(ev => (
              <div key={ev.id} style={{ marginBottom: 8 }}>
                {editingId === ev.id ? (
                  <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '12px 14px', border: '1px solid #E5E7EB' }}>
                    <input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, marginBottom: 8, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                      {COLOR_KEYS.map(k => (
                        <button key={k} onClick={() => setEditForm(p => ({ ...p, color: k }))}
                          style={{ width: 24, height: 24, background: COLORS[k].chip, border: editForm.color === k ? '2.5px solid #2B3660' : '1px solid #E5E7EB', borderRadius: 6, cursor: 'pointer' }} />
                      ))}
                    </div>
                    <textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="상세 내용 (선택)" rows={2}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, resize: 'none', marginBottom: 8, boxSizing: 'border-box', fontFamily: 'inherit' }} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => updateEvent(ev.id)} style={{ flex: 1, padding: '8px', background: '#2B3660', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>저장</button>
                      <button onClick={() => setEditingId(null)} style={{ padding: '8px 12px', background: '#F3F4F6', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>취소</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: '#F9FAFB', borderRadius: 12, borderLeft: `4px solid ${COLORS[ev.color]?.dot || '#F59E0B'}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1E', marginBottom: ev.description ? 3 : 0 }}>{ev.title}</div>
                      {ev.description && <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>{ev.description}</div>}
                    </div>
                    <button onClick={() => { setEditingId(ev.id); setEditForm({ title: ev.title, color: ev.color, description: ev.description || '' }); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 15, padding: 2, flexShrink: 0 }}>✏️</button>
                    <button onClick={() => deleteEvent(ev.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FCA5A5', fontSize: 15, padding: 2, flexShrink: 0 }}>✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 추가 입력 */}
          <div style={{ padding: '0 18px 18px' }}>
            <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14 }}>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && addEvent()}
                placeholder="+ 일정 추가..."
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, marginBottom: 10, boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#2B3660'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
              {/* 색상 선택 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, flexShrink: 0 }}>색상</span>
                {COLOR_KEYS.map(k => (
                  <button key={k} onClick={() => setForm(p => ({ ...p, color: k }))}
                    title={COLORS[k].label}
                    style={{ width: 28, height: 28, background: COLORS[k].chip, border: form.color === k ? '2.5px solid #2B3660' : '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }} />
                ))}
              </div>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="메모 (선택)" rows={2}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 13, resize: 'none', marginBottom: 10, boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#2B3660'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
              <button onClick={addEvent} disabled={loading || !form.title.trim()}
                style={{ width: '100%', padding: '13px', background: form.title.trim() ? '#2B3660' : '#E5E7EB', color: form.title.trim() ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: form.title.trim() ? 'pointer' : 'default', transition: 'background 0.15s' }}>
                {loading ? '저장 중...' : '추가하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 운영일지 바로가기 */}
      {monthReportId && (
        <button onClick={() => navigate(`/monthly-reports/${monthReportId}`)}
          style={{ marginTop: 14, width: '100%', padding: '13px', background: '#F0F4FF', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 14, color: '#2B3660', cursor: 'pointer' }}>
          📋 {month + 1}월 운영일지 전체 보기 →
        </button>
      )}
    </div>
  );
}
