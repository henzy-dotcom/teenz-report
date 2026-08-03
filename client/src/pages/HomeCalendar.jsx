import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const TODAY = new Date();
const todayStr = [
  TODAY.getFullYear(),
  String(TODAY.getMonth() + 1).padStart(2, '0'),
  String(TODAY.getDate()).padStart(2, '0'),
].join('-');

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTH_LABELS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

const COLORS = {
  yellow: { bar: '#FEF08A', text: '#78350F', border: '#F59E0B' },
  blue:   { bar: '#BAE6FD', text: '#1E3A5F', border: '#3B82F6' },
  green:  { bar: '#BBF7D0', text: '#14532D', border: '#10B981' },
  pink:   { bar: '#FBCFE8', text: '#831843', border: '#EC4899' },
  purple: { bar: '#E9D5FF', text: '#4C1D95', border: '#A855F7' },
  orange: { bar: '#FED7AA', text: '#7C2D12', border: '#F97316' },
};
const COLOR_KEYS = Object.keys(COLORS);

function dateStr(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function addDays(s, n) {
  const d = new Date(s); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10);
}
function diffDays(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

// 주어진 달의 달력 주(weeks) 계산
function buildWeeks(year, month) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks = [];
  let day = 1 - firstDay;
  while (day <= daysInMonth) {
    const week = [];
    for (let i = 0; i < 7; i++, day++) {
      if (day >= 1 && day <= daysInMonth) {
        week.push({ day, date: dateStr(year, month, day), dow: i });
      } else {
        week.push(null);
      }
    }
    weeks.push(week);
  }
  return weeks;
}

// 이벤트를 주 단위로 잘라서 스팬 계산
function buildEventSpans(events, weeks) {
  const spans = weeks.map(() => []); // per week, list of {ev, startCol, endCol, lane}
  const sorted = [...events].sort((a, b) => {
    const lenA = a.end_date && a.end_date > a.event_date ? diffDays(a.event_date, a.end_date) : 0;
    const lenB = b.end_date && b.end_date > b.event_date ? diffDays(b.event_date, b.end_date) : 0;
    if (lenB !== lenA) return lenB - lenA; // 긴 이벤트 먼저
    return a.event_date.localeCompare(b.event_date);
  });

  for (const ev of sorted) {
    const start = ev.event_date;
    const end = (ev.end_date && ev.end_date >= start) ? ev.end_date : start;

    for (let wi = 0; wi < weeks.length; wi++) {
      const week = weeks[wi];
      const weekDates = week.filter(Boolean).map(c => c.date);
      if (!weekDates.length) continue;
      const weekStart = weekDates[0];
      const weekEnd = weekDates[weekDates.length - 1];
      if (end < weekStart || start > weekEnd) continue;

      const clampedStart = start < weekStart ? weekStart : start;
      const clampedEnd = end > weekEnd ? weekEnd : end;
      const startCol = week.findIndex(c => c && c.date === clampedStart);
      const endCol = week.findIndex(c => c && c.date === clampedEnd);
      if (startCol === -1 || endCol === -1) continue;

      // lane 배정: 겹치지 않는 첫 번째 lane 찾기
      const used = spans[wi].map(s => ({ lane: s.lane, sc: s.startCol, ec: s.endCol }));
      let lane = 0;
      while (used.some(u => u.lane === lane && u.sc <= endCol && u.ec >= startCol)) lane++;

      spans[wi].push({ ev, startCol, endCol, lane, isStart: start >= weekStart, isEnd: end <= weekEnd });
    }
  }
  return spans;
}

export default function HomeCalendar() {
  const navigate = useNavigate();
  const [year, setYear]   = useState(TODAY.getFullYear());
  const [month, setMonth] = useState(TODAY.getMonth() + 1);
  const [events, setEvents]         = useState([]);
  const [monthReportId, setMonthReportId] = useState(null);
  const [modal, setModal]           = useState(null); // { type: 'day'|'event', date, ev? }
  const [form, setForm]             = useState({ title: '', color: 'yellow', description: '', end_date: '' });
  const [saving, setSaving]         = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const ym = `${year}-${String(month).padStart(2,'0')}`;

  const loadReport = useCallback(async () => {
    const res = await fetch('/api/monthly-reports');
    const list = await res.json();
    const found = list.find(r => r.year_month === ym);
    if (found) {
      setMonthReportId(found.id);
      const evRes = await fetch(`/api/monthly-reports/${found.id}/calendar`);
      setEvents(await evRes.json());
    } else {
      setMonthReportId(null);
      setEvents([]);
    }
  }, [ym]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const ensureReport = async () => {
    if (monthReportId) return monthReportId;
    const res = await fetch('/api/monthly-reports', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year_month: ym }),
    });
    const data = await res.json();
    setMonthReportId(data.id);
    return data.id;
  };

  const refreshEvents = async (rid) => {
    const res = await fetch(`/api/monthly-reports/${rid}/calendar`);
    setEvents(await res.json());
  };

  const saveEvent = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const rid = await ensureReport();
    if (modal.ev) {
      await fetch(`/api/monthly-reports/${rid}/calendar/${modal.ev.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, color: form.color, description: form.description, end_date: form.end_date }),
      });
    } else {
      await fetch(`/api/monthly-reports/${rid}/calendar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_date: modal.date, end_date: form.end_date, title: form.title, color: form.color, description: form.description }),
      });
    }
    await refreshEvents(rid);
    setSaving(false);
    setModal(null);
  };

  const deleteEvent = async (ev) => {
    if (!monthReportId) return;
    await fetch(`/api/monthly-reports/${monthReportId}/calendar/${ev.id}`, { method: 'DELETE' });
    await refreshEvents(monthReportId);
    setModal(null);
  };

  function prevMonth() { if (month === 1) { setYear(y => y-1); setMonth(12); } else setMonth(m => m-1); }
  function nextMonth() { if (month === 12) { setYear(y => y+1); setMonth(1); } else setMonth(m => m+1); }
  function goToday()   { setYear(TODAY.getFullYear()); setMonth(TODAY.getMonth()+1); }

  function openDay(date) {
    setForm({ title: '', color: 'yellow', description: '', end_date: '' });
    setModal({ type: 'day', date });
  }
  function openEvent(ev, e) {
    e.stopPropagation();
    setForm({ title: ev.title, color: ev.color, description: ev.description||'', end_date: ev.end_date||'' });
    setModal({ type: 'event', date: ev.event_date, ev });
  }

  const weeks = buildWeeks(year, month);
  const spans = buildEventSpans(events, weeks);
  const MAX_LANES = 3;
  const LANE_H = 22;
  const CELL_TOP = 28; // space for date number
  const CELL_MIN_H = CELL_TOP + MAX_LANES * LANE_H + 10;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 57px)', background: '#F8F9FB', fontFamily: 'inherit', overflow: 'hidden' }}>

      {/* 헤더 */}
      <div style={{ padding: '12px 20px 10px', background: '#fff', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* 년도 클릭 */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setShowYearPicker(p => !p); setShowMonthPicker(false); }}
              style={{ fontSize: 22, fontWeight: 800, color: '#1C1C1E', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 6, lineHeight: 1 }}>
              {year}년
            </button>
            {showYearPicker && (
              <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 300, background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, minWidth: 220 }}>
                {Array.from({ length: 10 }, (_, i) => TODAY.getFullYear() - 2 + i).map(y => (
                  <button key={y} onClick={() => { setYear(y); setShowYearPicker(false); }}
                    style={{ padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: y === year ? 800 : 400, background: y === year ? '#2B3660' : '#F3F4F6', color: y === year ? '#fff' : '#374151', fontSize: 13 }}>
                    {y}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* 월 클릭 */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setShowMonthPicker(p => !p); setShowYearPicker(false); }}
              style={{ fontSize: 22, fontWeight: 800, color: '#2B3660', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 6, lineHeight: 1 }}>
              {month}월
            </button>
            {showMonthPicker && (
              <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 300, background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, minWidth: 200 }}>
                {MONTH_LABELS.map((label, i) => (
                  <button key={i} onClick={() => { setMonth(i+1); setShowMonthPicker(false); }}
                    style={{ padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: i+1 === month ? 800 : 400, background: i+1 === month ? '#2B3660' : '#F3F4F6', color: i+1 === month ? '#fff' : '#374151', fontSize: 13 }}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', alignItems: 'center' }}>
          <button onClick={goToday} style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 700, color: '#2B3660', cursor: 'pointer' }}>오늘</button>
          <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #E5E7EB', background: '#fff', fontSize: 16, cursor: 'pointer' }}>‹</button>
          <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #E5E7EB', background: '#fff', fontSize: 16, cursor: 'pointer' }}>›</button>
          {monthReportId && (
            <button onClick={() => navigate(`/monthly-reports/${monthReportId}`)}
              style={{ padding: '6px 14px', borderRadius: 20, border: 'none', background: '#2B3660', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', marginLeft: 4 }}>
              운영일지 →
            </button>
          )}
        </div>
      </div>

      {/* 달력 영역 */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        onClick={() => { setShowYearPicker(false); setShowMonthPicker(false); }}>

        {/* 요일 헤더 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#fff', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
          {DOW_LABELS.map((d, i) => (
            <div key={d} style={{ textAlign: 'center', padding: '8px 0', fontSize: 12, fontWeight: 700, color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : '#9CA3AF' }}>{d}</div>
          ))}
        </div>

        {/* 주 rows */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi < weeks.length - 1 ? '1px solid #E5E7EB' : 'none', position: 'relative', minHeight: CELL_MIN_H }}>

              {/* 날짜 셀 배경 */}
              {week.map((cell, ci) => {
                if (!cell) return <div key={ci} style={{ background: '#F3F4F6', borderRight: ci < 6 ? '1px solid #E5E7EB' : 'none' }} />;
                const isToday = cell.date === todayStr;
                const isWeekend = cell.dow === 0 || cell.dow === 6;
                return (
                  <div key={ci} onClick={() => openDay(cell.date)}
                    style={{ position: 'relative', background: isToday ? '#EEF2FF' : '#fff', borderRight: ci < 6 ? '1px solid #E5E7EB' : 'none', cursor: 'pointer', padding: '5px 6px 4px' }}
                    onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = '#F8FAFF'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isToday ? '#EEF2FF' : '#fff'; }}>
                    {/* 날짜 숫자 */}
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: isToday ? 800 : 500,
                      background: isToday ? '#2B3660' : 'transparent',
                      color: isToday ? '#fff' : isWeekend ? (cell.dow === 0 ? '#EF4444' : '#3B82F6') : '#374151',
                    }}>{cell.day}</div>
                  </div>
                );
              })}

              {/* 이벤트 바 - absolute positioning over the week row */}
              {spans[wi].map(({ ev, startCol, endCol, lane, isStart, isEnd }) => {
                if (lane >= MAX_LANES) return null;
                const colW = 100 / 7;
                const left = startCol * colW;
                const width = (endCol - startCol + 1) * colW;
                const top = CELL_TOP + lane * LANE_H;
                const c = COLORS[ev.color] || COLORS.yellow;
                return (
                  <div key={`${ev.id}-${wi}`}
                    onClick={e => openEvent(ev, e)}
                    style={{
                      position: 'absolute',
                      left: `calc(${left}% + ${isStart ? 3 : 0}px)`,
                      width: `calc(${width}% - ${isStart ? 3 : 0}px - ${isEnd ? 3 : 0}px)`,
                      top, height: LANE_H - 3,
                      background: c.bar,
                      borderLeft: isStart ? `3px solid ${c.border}` : 'none',
                      borderRadius: isStart && isEnd ? 6 : isStart ? '6px 0 0 6px' : isEnd ? '0 6px 6px 0' : 0,
                      display: 'flex', alignItems: 'center',
                      padding: '0 5px',
                      cursor: 'pointer',
                      zIndex: 10,
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                    }}>
                    {isStart && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ev.title}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* +N 더보기 표시 */}
              {(() => {
                const overflowCols = {};
                spans[wi].forEach(({ startCol, endCol, lane }) => {
                  if (lane >= MAX_LANES) {
                    for (let c = startCol; c <= endCol; c++) {
                      overflowCols[c] = (overflowCols[c] || 0) + 1;
                    }
                  }
                });
                return Object.entries(overflowCols).map(([col, cnt]) => {
                  const colW = 100 / 7;
                  return (
                    <div key={`more-${col}`} style={{
                      position: 'absolute',
                      left: `calc(${Number(col) * colW}% + 3px)`,
                      top: CELL_TOP + MAX_LANES * LANE_H,
                      fontSize: 10, color: '#9CA3AF', fontWeight: 700, zIndex: 11,
                    }}>+{cnt}개</div>
                  );
                });
              })()}
            </div>
          ))}
        </div>
      </div>

      {/* 모달 */}
      {modal && (
        <div onClick={e => e.target === e.currentTarget && setModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 600, padding: '20px 20px 32px', boxShadow: '0 -4px 32px rgba(0,0,0,0.12)' }}>
            {/* 제목 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1C1C1E' }}>
                {modal.ev ? '일정 수정' : `${modal.date?.slice(5).replace('-','월 ')}일`}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {modal.ev && (
                  <button onClick={() => { if (window.confirm('삭제할까요?')) deleteEvent(modal.ev); }}
                    style={{ padding: '6px 12px', background: '#FEE2E2', border: 'none', borderRadius: 8, color: '#B91C1C', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>삭제</button>
                )}
                <button onClick={() => setModal(null)}
                  style={{ padding: '6px 12px', background: '#F3F4F6', border: 'none', borderRadius: 8, color: '#6B7280', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>닫기</button>
              </div>
            </div>

            {/* 제목 입력 */}
            <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))}
              onKeyDown={e => e.key === 'Enter' && saveEvent()}
              placeholder="일정 제목" autoFocus
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 15, marginBottom: 10, boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#2B3660'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'}
            />

            {/* 종료일 (기간 일정) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600, flexShrink: 0 }}>종료일</span>
              <input type="date" value={form.end_date} min={modal.date}
                onChange={e => setForm(p => ({...p, end_date: e.target.value}))}
                style={{ flex: 1, padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
              {form.end_date && <button onClick={() => setForm(p => ({...p, end_date: ''}))} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 16 }}>✕</button>}
            </div>

            {/* 색상 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>색상</span>
              {COLOR_KEYS.map(k => (
                <button key={k} onClick={() => setForm(p => ({...p, color: k}))}
                  style={{ width: 28, height: 28, background: COLORS[k].bar, border: form.color === k ? `2.5px solid ${COLORS[k].border}` : '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }} />
              ))}
            </div>

            {/* 메모 */}
            <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
              placeholder="메모 (선택)" rows={2}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 13, resize: 'none', marginBottom: 12, boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }} />

            {/* 저장 */}
            <button onClick={saveEvent} disabled={saving || !form.title.trim()}
              style={{ width: '100%', padding: '14px', background: form.title.trim() ? '#2B3660' : '#E5E7EB', color: form.title.trim() ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: form.title.trim() ? 'pointer' : 'default' }}>
              {saving ? '저장 중...' : modal.ev ? '수정 완료' : '추가하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
