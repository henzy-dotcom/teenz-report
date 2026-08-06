import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const TODAY = new Date();
const todayStr = [
  TODAY.getFullYear(),
  String(TODAY.getMonth() + 1).padStart(2, '0'),
  String(TODAY.getDate()).padStart(2, '0'),
].join('-');

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const DOW_KO = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const MONTH_LABELS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

const COLORS = {
  yellow: { bar: '#FEF08A', text: '#78350F', border: '#F59E0B', label: '노랑' },
  blue:   { bar: '#BAE6FD', text: '#1E3A5F', border: '#3B82F6', label: '파랑' },
  green:  { bar: '#BBF7D0', text: '#14532D', border: '#10B981', label: '초록' },
  pink:   { bar: '#FBCFE8', text: '#831843', border: '#EC4899', label: '분홍' },
  purple: { bar: '#E9D5FF', text: '#4C1D95', border: '#A855F7', label: '보라' },
  orange: { bar: '#FED7AA', text: '#7C2D12', border: '#F97316', label: '주황' },
};
const COLOR_KEYS = Object.keys(COLORS);

function makeDateStr(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function diffDays(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}
function fmtDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return `${m}월 ${d}일 (${DOW_KO[dow]})`;
}

function buildWeeks(year, month) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks = [];
  let day = 1 - firstDay;
  while (day <= daysInMonth) {
    const week = [];
    for (let i = 0; i < 7; i++, day++) {
      if (day >= 1 && day <= daysInMonth) {
        week.push({ day, date: makeDateStr(year, month, day), dow: i });
      } else {
        week.push(null);
      }
    }
    weeks.push(week);
  }
  return weeks;
}

function buildEventSpans(events, weeks) {
  const spans = weeks.map(() => []);
  const sorted = [...events].sort((a, b) => {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
    const lenA = a.end_date && a.end_date > a.event_date ? diffDays(a.event_date, a.end_date) : 0;
    const lenB = b.end_date && b.end_date > b.event_date ? diffDays(b.event_date, b.end_date) : 0;
    if (lenB !== lenA) return lenB - lenA;
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
  const [events, setEvents]               = useState([]);
  const [monthReportId, setMonthReportId] = useState(null);
  const [selectedDate, setSelectedDate]   = useState(null); // 오른쪽 패널용
  const [editModal, setEditModal]         = useState(null); // { date, ev? }
  const [form, setForm]                   = useState({ title: '', color: 'yellow', description: '', end_date: '' });
  const [saving, setSaving]               = useState(false);
  const [showYearPicker, setShowYearPicker]   = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [dragEvent, setDragEvent]     = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);

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
    if (editModal.ev) {
      await fetch(`/api/monthly-reports/${rid}/calendar/${editModal.ev.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, color: form.color, description: form.description, end_date: form.end_date }),
      });
    } else {
      await fetch(`/api/monthly-reports/${rid}/calendar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_date: editModal.date, end_date: form.end_date, title: form.title, color: form.color, description: form.description }),
      });
    }
    await refreshEvents(rid);
    setSaving(false);
    setEditModal(null);
  };

  const deleteEvent = async (ev) => {
    if (!window.confirm('삭제할까요?')) return;
    if (!monthReportId) return;
    await fetch(`/api/monthly-reports/${monthReportId}/calendar/${ev.id}`, { method: 'DELETE' });
    await refreshEvents(monthReportId);
    setEditModal(null);
  };

  const toggleDone = async (ev) => {
    const rid = monthReportId || await ensureReport();
    await fetch(`/api/monthly-reports/${rid}/calendar/${ev.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !ev.done }),
    });
    await refreshEvents(rid);
  };

  const handleDrop = async (targetDate) => {
    const ev = dragEvent;
    setDragEvent(null);
    setDragOverDate(null);
    if (!ev || targetDate === ev.event_date) return;
    const rid = monthReportId;
    if (!rid) return;
    const origD = new Date(ev.event_date + 'T00:00:00');
    const targD = new Date(targetDate + 'T00:00:00');
    const dayShift = Math.round((targD - origD) / 86400000);
    let newEndDate = '';
    if (ev.end_date && ev.end_date >= ev.event_date) {
      const endD = new Date(ev.end_date + 'T00:00:00');
      endD.setDate(endD.getDate() + dayShift);
      newEndDate = makeDateStr(endD.getFullYear(), endD.getMonth() + 1, endD.getDate());
    }
    await fetch(`/api/monthly-reports/${rid}/calendar/${ev.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: ev.title, color: ev.color, description: ev.description || '', end_date: newEndDate, done: ev.done ? 1 : 0, event_date: targetDate }),
    });
    await refreshEvents(rid);
  };

  function prevMonth() { if (month === 1) { setYear(y => y-1); setMonth(12); } else setMonth(m => m-1); }
  function nextMonth() { if (month === 12) { setYear(y => y+1); setMonth(1); } else setMonth(m => m+1); }
  function goToday()   { setYear(TODAY.getFullYear()); setMonth(TODAY.getMonth()+1); setSelectedDate(todayStr); }

  function openDayPanel(date) {
    setSelectedDate(date);
    setShowYearPicker(false);
    setShowMonthPicker(false);
  }

  function openEditModal(date, ev) {
    setForm({ title: ev?.title || '', color: ev?.color || 'yellow', description: ev?.description || '', end_date: ev?.end_date || '' });
    setEditModal({ date, ev: ev || null });
  }

  const panelEvents = selectedDate
    ? events
        .filter(ev => {
          const end = ev.end_date && ev.end_date >= ev.event_date ? ev.end_date : ev.event_date;
          return ev.event_date <= selectedDate && end >= selectedDate;
        })
        .sort((a, b) => (!!a.done !== !!b.done ? (a.done ? 1 : -1) : 0))
    : [];

  const weeks = buildWeeks(year, month);
  const spans = buildEventSpans(events, weeks);
  const MAX_LANES = 3;
  const LANE_H = 22;
  const CELL_TOP = 28;
  const CELL_MIN_H = CELL_TOP + MAX_LANES * LANE_H + 10;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 57px)', background: '#F8F9FB', fontFamily: 'inherit', overflow: 'hidden' }}>

      {/* 헤더 */}
      <div style={{ padding: '12px 20px 10px', background: '#fff', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setShowYearPicker(p => !p); setShowMonthPicker(false); }}
              style={{ fontSize: 22, fontWeight: 800, color: '#1C1C1E', background: showYearPicker ? '#F0F4FF' : '#F3F4F6', border: '1px solid #E5E7EB', cursor: 'pointer', padding: '4px 10px', borderRadius: 8, lineHeight: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
              {year}년 <span style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{showYearPicker ? '▲' : '▼'}</span>
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
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setShowMonthPicker(p => !p); setShowYearPicker(false); }}
              style={{ fontSize: 22, fontWeight: 800, color: '#2B3660', background: showMonthPicker ? '#F0F4FF' : '#F3F4F6', border: '1px solid #E5E7EB', cursor: 'pointer', padding: '4px 10px', borderRadius: 8, lineHeight: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
              {month}월 <span style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{showMonthPicker ? '▲' : '▼'}</span>
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

      {/* 본문 (달력 + 우측 패널) */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
        onClick={() => { setShowYearPicker(false); setShowMonthPicker(false); }}>

        {/* 달력 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'all 0.25s' }}>
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
                {week.map((cell, ci) => {
                  if (!cell) return <div key={ci} style={{ background: '#F3F4F6', borderRight: ci < 6 ? '1px solid #E5E7EB' : 'none' }} />;
                  const isToday = cell.date === todayStr;
                  const isSelected = cell.date === selectedDate;
                  const isWeekend = cell.dow === 0 || cell.dow === 6;
                  return (
                    <div key={ci} onClick={() => { if (!dragEvent) openDayPanel(cell.date); }}
                      style={{ position: 'relative', background: (dragEvent && dragOverDate === cell.date) ? '#DBEAFE' : isSelected ? '#EEF2FF' : isToday ? '#FFF7ED' : '#fff', borderRight: ci < 6 ? '1px solid #E5E7EB' : 'none', cursor: dragEvent ? 'copy' : 'pointer', padding: '5px 6px 4px', outline: (dragEvent && dragOverDate === cell.date) ? '2px solid #3B82F6' : isSelected ? '2px solid #2B3660' : 'none', outlineOffset: '-2px' }}
                      onMouseEnter={e => { if (!dragEvent && !isSelected && !isToday) e.currentTarget.style.background = '#F8FAFF'; }}
                      onMouseLeave={e => { if (!dragEvent) e.currentTarget.style.background = isSelected ? '#EEF2FF' : isToday ? '#FFF7ED' : '#fff'; }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: isToday ? 800 : 500, background: isToday ? '#2B3660' : 'transparent', color: isToday ? '#fff' : isWeekend ? (cell.dow === 0 ? '#EF4444' : '#3B82F6') : '#374151' }}>{cell.day}</div>
                    </div>
                  );
                })}

                {/* 이벤트 바 */}
                {spans[wi].map(({ ev, startCol, endCol, lane, isStart, isEnd }) => {
                  if (lane >= MAX_LANES) return null;
                  const colW = 100 / 7;
                  const left = startCol * colW;
                  const width = (endCol - startCol + 1) * colW;
                  const top = CELL_TOP + lane * LANE_H;
                  const c = COLORS[ev.color] || COLORS.yellow;
                  return (
                    <div key={`${ev.id}-${wi}`}
                      draggable={true}
                      onDragStart={e => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; setDragEvent(ev); }}
                      onDragEnd={() => { setDragEvent(null); setDragOverDate(null); }}
                      onClick={e => { e.stopPropagation(); if (!dragEvent) openEditModal(ev.event_date, ev); }}
                      style={{ position: 'absolute', left: `calc(${left}% + ${isStart ? 3 : 0}px)`, width: `calc(${width}% - ${isStart ? 3 : 0}px - ${isEnd ? 3 : 0}px)`, top, height: LANE_H - 3, background: ev.done ? '#F3F4F6' : c.bar, borderLeft: isStart ? `3px solid ${ev.done ? '#D1D5DB' : c.border}` : 'none', borderRadius: isStart && isEnd ? 6 : isStart ? '6px 0 0 6px' : isEnd ? '0 6px 6px 0' : 0, display: 'flex', alignItems: 'center', padding: '0 5px', cursor: dragEvent?.id === ev.id ? 'grabbing' : 'grab', zIndex: 10, overflow: 'hidden', boxSizing: 'border-box', opacity: dragEvent?.id === ev.id ? 0.4 : ev.done ? 0.7 : 1 }}>
                      {isStart && <>
                        <span style={{ fontSize: 10, color: ev.done ? '#C4C9D4' : c.border, marginRight: 3, flexShrink: 0, letterSpacing: -1, lineHeight: 1 }}>⠿</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: ev.done ? '#9CA3AF' : c.text, textDecoration: ev.done ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</span>
                      </>}
                    </div>
                  );
                })}

                {/* 드래그 드롭존 오버레이 */}
                {dragEvent && week.map((cell, ci) => !cell ? null : (
                  <div key={`dz-${ci}`}
                    style={{ position: 'absolute', left: `${ci * 100/7}%`, width: `${100/7}%`, top: 0, bottom: 0, zIndex: 20 }}
                    onDragOver={e => { e.preventDefault(); setDragOverDate(cell.date); }}
                    onDrop={e => { e.preventDefault(); handleDrop(cell.date); }}
                    onDragLeave={() => setDragOverDate(null)}
                  />
                ))}

                {/* +N 더보기 */}
                {(() => {
                  const over = {};
                  spans[wi].forEach(({ startCol, endCol, lane }) => {
                    if (lane >= MAX_LANES) for (let c = startCol; c <= endCol; c++) over[c] = (over[c] || 0) + 1;
                  });
                  return Object.entries(over).map(([col, cnt]) => (
                    <div key={`more-${col}`} style={{ position: 'absolute', left: `calc(${Number(col) * 100/7}% + 3px)`, top: CELL_TOP + MAX_LANES * LANE_H, fontSize: 10, color: '#9CA3AF', fontWeight: 700, zIndex: 11 }}>+{cnt}개</div>
                  ));
                })()}
              </div>
            ))}
          </div>
        </div>

        {/* 우측 날짜 상세 패널 */}
        {selectedDate && (
          <div style={{ width: 320, borderLeft: '1px solid #E5E7EB', background: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
            {/* 패널 헤더 */}
            <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: selectedDate === todayStr ? '#2B3660' : '#1C1C1E' }}>
                  {fmtDateLabel(selectedDate)}
                  {selectedDate === todayStr && <span style={{ marginLeft: 8, fontSize: 11, background: '#2B3660', color: '#fff', borderRadius: 10, padding: '2px 8px', verticalAlign: 'middle' }}>오늘</span>}
                </div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 3 }}>{panelEvents.length}개 일정</div>
              </div>
              <button onClick={() => setSelectedDate(null)} style={{ background: 'none', border: 'none', fontSize: 18, color: '#9CA3AF', cursor: 'pointer', padding: 4, lineHeight: 1 }}>✕</button>
            </div>

            {/* 일정 목록 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              {panelEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#D1D5DB' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                  <div style={{ fontSize: 13 }}>일정이 없어요</div>
                </div>
              ) : (
                panelEvents.map(ev => {
                  const c = COLORS[ev.color] || COLORS.yellow;
                  const hasRange = ev.end_date && ev.end_date > ev.event_date;
                  return (
                    <div key={ev.id} style={{ background: ev.done ? '#F3F4F6' : '#F9FAFB', borderRadius: 14, padding: '14px 16px', marginBottom: 10, borderLeft: `4px solid ${ev.done ? '#D1D5DB' : c.border}`, position: 'relative', opacity: ev.done ? 0.7 : 1, transition: 'all 0.2s' }}>
                      {/* 체크박스 + 색상 뱃지 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <button onClick={() => toggleDone(ev)}
                          style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${ev.done ? '#10B981' : '#D1D5DB'}`, background: ev.done ? '#10B981' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                          {ev.done && <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, lineHeight: 1 }}>✓</span>}
                        </button>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: ev.done ? '#D1D5DB' : c.border, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>{c.label}</span>
                        {hasRange && (
                          <span style={{ fontSize: 11, background: '#EEF2FF', color: '#2B3660', borderRadius: 6, padding: '1px 7px', fontWeight: 600 }}>
                            {fmtDateLabel(ev.event_date).slice(0, -5)} – {fmtDateLabel(ev.end_date).slice(0, -5)}
                          </span>
                        )}
                      </div>
                      {/* 제목 (취소선) */}
                      <div style={{ fontSize: 15, fontWeight: 700, color: ev.done ? '#9CA3AF' : '#1C1C1E', marginBottom: ev.description ? 6 : 0, lineHeight: 1.4, textDecoration: ev.done ? 'line-through' : 'none' }}>{ev.title}</div>
                      {/* 설명 (취소선) */}
                      {ev.description && (
                        <div style={{ fontSize: 13, color: ev.done ? '#B0B7C3' : '#6B7280', lineHeight: 1.6, whiteSpace: 'pre-wrap', textDecoration: ev.done ? 'line-through' : 'none' }}>{ev.description}</div>
                      )}
                      {/* 수정 버튼 */}
                      {!ev.done && (
                        <button onClick={() => openEditModal(ev.event_date, ev)}
                          style={{ position: 'absolute', top: 12, right: 12, background: '#F3F4F6', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                          수정
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* 일정 추가 버튼 */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}>
              <button onClick={() => openEditModal(selectedDate, null)}
                style={{ width: '100%', padding: '12px', background: '#2B3660', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                + 일정 추가
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 수정/추가 모달 */}
      {editModal && (
        <div onClick={e => e.target === e.currentTarget && setEditModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 600, padding: '20px 20px 32px', boxShadow: '0 -4px 32px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1C1C1E' }}>
                {editModal.ev ? '일정 수정' : `${fmtDateLabel(editModal.date)} 일정 추가`}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {editModal.ev && (
                  <button onClick={() => deleteEvent(editModal.ev)} style={{ padding: '6px 12px', background: '#FEE2E2', border: 'none', borderRadius: 8, color: '#B91C1C', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>삭제</button>
                )}
                <button onClick={() => setEditModal(null)} style={{ padding: '6px 12px', background: '#F3F4F6', border: 'none', borderRadius: 8, color: '#6B7280', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>닫기</button>
              </div>
            </div>

            <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))}
              onKeyDown={e => e.key === 'Enter' && saveEvent()}
              placeholder="일정 제목" autoFocus
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 15, marginBottom: 10, boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#2B3660'}
              onBlur={e => e.target.style.borderColor = '#E5E7EB'} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600, flexShrink: 0 }}>종료일</span>
              <input type="date" value={form.end_date} min={editModal.date}
                onChange={e => setForm(p => ({...p, end_date: e.target.value}))}
                style={{ flex: 1, padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
              {form.end_date && <button onClick={() => setForm(p => ({...p, end_date: ''}))} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 16 }}>✕</button>}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>색상</span>
              {COLOR_KEYS.map(k => (
                <button key={k} onClick={() => setForm(p => ({...p, color: k}))}
                  style={{ width: 28, height: 28, background: COLORS[k].bar, border: form.color === k ? `2.5px solid ${COLORS[k].border}` : '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }} />
              ))}
            </div>

            <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
              placeholder="메모 (선택)" rows={3}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 13, resize: 'none', marginBottom: 12, boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }} />

            <button onClick={saveEvent} disabled={saving || !form.title.trim()}
              style={{ width: '100%', padding: '14px', background: form.title.trim() ? '#2B3660' : '#E5E7EB', color: form.title.trim() ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: form.title.trim() ? 'pointer' : 'default' }}>
              {saving ? '저장 중...' : editModal.ev ? '수정 완료' : '추가하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
