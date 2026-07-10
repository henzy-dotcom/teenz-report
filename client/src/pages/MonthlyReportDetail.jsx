import React, { useEffect, useState, useCallback, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ToastContext } from '../App.jsx';

function Section({ title, open, onToggle, badge, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(43,54,96,0.07)', border: '1px solid #E5E7EB', marginBottom: 12, overflow: 'hidden' }}>
      <button onClick={onToggle} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
        borderBottom: open ? '1px solid #F3F4F6' : 'none',
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#2B3660' }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {badge && <span style={{ fontSize: 11, color: '#9CA3AF' }}>{badge}</span>}
          <span style={{ fontSize: 18, color: '#9CA3AF', lineHeight: 1, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>⌄</span>
        </div>
      </button>
      {open && <div style={{ padding: '16px 20px' }}>{children}</div>}
    </div>
  );
}

const S = {
  card: { background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 2px 10px rgba(43,54,96,0.07)', border: '1px solid #E5E7EB', marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: '#2B3660', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 },
  label: { fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 4 },
  numInput: { width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 15, fontWeight: 600, color: '#1C1C1E', fontFamily: 'inherit', outline: 'none' },
  textarea: { width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.6 },
  btn: (bg, color) => ({ padding: '8px 14px', background: bg, color, border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }),
};

function fmtMoney(n) { return Number(n || 0).toLocaleString('ko-KR') + '원'; }
function fmtYM(ym) { const [y, m] = ym.split('-'); return `${y}년 ${parseInt(m)}월`; }

const COLORS = {
  yellow: { bg: '#FEFCE8', border: '#FDE68A', chip: '#FEF08A', text: '#92400E', label: '노랑' },
  blue:   { bg: '#EFF6FF', border: '#BAE6FD', chip: '#BAE6FD', text: '#1E40AF', label: '파랑' },
  green:  { bg: '#F0FDF4', border: '#BBF7D0', chip: '#BBF7D0', text: '#166534', label: '초록' },
  pink:   { bg: '#FDF2F8', border: '#FBCFE8', chip: '#FBCFE8', text: '#9D174D', label: '분홍' },
  purple: { bg: '#FAF5FF', border: '#E9D5FF', chip: '#E9D5FF', text: '#6B21A8', label: '보라' },
};

const DOW = ['일','월','화','수','목','금','토'];

function CalendarGrid({ yearMonth, events, onDayClick }) {
  const [y, m] = yearMonth.split('-').map(Number);
  const firstDay = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();

  const eventsByDate = {};
  for (const ev of events) {
    const d = ev.event_date;
    if (!eventsByDate[d]) eventsByDate[d] = [];
    eventsByDate[d].push(ev);
  }

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {DOW.map((d, i) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '4px 0',
            color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : '#9CA3AF' }}>{d}</div>
        ))}
      </div>
      {/* 날짜 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e${idx}`} />;
          const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;
          const dayEvents = eventsByDate[dateStr] || [];
          const dow = (firstDay + day - 1) % 7;
          return (
            <div key={day} onClick={() => onDayClick(dateStr, dayEvents)}
              style={{ minHeight: 56, background: '#FAFAFA', border: '1px solid #F3F4F6', borderRadius: 8, padding: '4px 5px', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F0F4FF'}
              onMouseLeave={e => e.currentTarget.style.background = '#FAFAFA'}>
              <div style={{ fontSize: 12, fontWeight: 600, color: dow === 0 ? '#EF4444' : dow === 6 ? '#3B82F6' : '#374151', marginBottom: 3 }}>{day}</div>
              {dayEvents.slice(0, 3).map(ev => (
                <div key={ev.id} style={{ fontSize: 10, background: COLORS[ev.color]?.chip || '#FEF08A', color: COLORS[ev.color]?.text || '#92400E', borderRadius: 3, padding: '1px 4px', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
                  {ev.title}
                </div>
              ))}
              {dayEvents.length > 3 && <div style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 600 }}>+{dayEvents.length - 3}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Counter({ value, onChange, min = 0 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button onClick={() => onChange(Math.max(min, value - 1))} style={S.btn('#F3F4F6', '#374151')}>−</button>
      <span style={{ minWidth: 32, textAlign: 'center', fontWeight: 700, fontSize: 16 }}>{value}</span>
      <button onClick={() => onChange(value + 1)} style={S.btn('#F3F4F6', '#374151')}>+</button>
    </div>
  );
}

function ProgressBar({ actual, target }) {
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;
  const color = pct >= 100 ? '#059669' : pct >= 60 ? '#D97706' : '#DC2626';
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ background: '#F3F4F6', borderRadius: 99, height: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 99, transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 2 }}>{actual} / {target}회 ({pct}%)</div>
    </div>
  );
}

export default function MonthlyReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useContext(ToastContext);
  const [report, setReport] = useState(null);
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);

  const [open, setOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('mr-sections');
      return saved ? JSON.parse(saved) : { students: true, finance: true, checklist: true, promo: true, calendar: true, retro: true };
    } catch { return { students: true, finance: true, checklist: true, promo: true, calendar: true, retro: true }; }
  });
  const toggle = (key) => setOpen(prev => {
    const next = { ...prev, [key]: !prev[key] };
    localStorage.setItem('mr-sections', JSON.stringify(next));
    return next;
  });

  // 캘린더
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarModal, setCalendarModal] = useState(null); // { date, events }
  const [eventForm, setEventForm] = useState({ title: '', color: 'yellow', description: '' });
  const [editingEvent, setEditingEvent] = useState(null);

  async function loadCalendar() {
    const res = await fetch(`/api/monthly-reports/${id}/calendar`);
    const data = await res.json();
    setCalendarEvents(data);
    return data;
  }
  useEffect(() => { if (id) loadCalendar(); }, [id]);

  async function addEvent() {
    if (!eventForm.title.trim()) return;
    await fetch(`/api/monthly-reports/${id}/calendar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...eventForm, event_date: calendarModal.date }),
    });
    setEventForm({ title: '', color: 'yellow', description: '' });
    const updated = await loadCalendar();
    setCalendarModal(p => ({ ...p, events: updated.filter(e => e.event_date === p.date) }));
  }

  async function updateEvent(eid) {
    await fetch(`/api/monthly-reports/${id}/calendar/${eid}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingEvent),
    });
    setEditingEvent(null);
    const updated = await loadCalendar();
    setCalendarModal(p => ({ ...p, events: updated.filter(e => e.event_date === p.date) }));
  }

  async function deleteEvent(eid) {
    await fetch(`/api/monthly-reports/${id}/calendar/${eid}`, { method: 'DELETE' });
    const updated = await loadCalendar();
    setCalendarModal(p => p ? ({ ...p, events: updated.filter(e => e.event_date === p.date) }) : null);
  }

  // 신규생/퇴원생 모달
  const [newStudentModal, setNewStudentModal] = useState(false);
  const [withdrawnModal, setWithdrawnModal] = useState(false);
  const [studentForm, setStudentForm] = useState({ name: '', grade: '', class_subject: '', reason: '', note: '' });

  async function load() {
    const res = await fetch(`/api/monthly-reports/${id}`);
    if (!res.ok) { navigate('/monthly-reports'); return; }
    setReport(await res.json());
  }
  useEffect(() => { load(); }, [id]);

  // 자동 저장 (debounce 1.5s)
  const autoSave = useCallback((data) => {
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await fetch(`/api/monthly-reports/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      setSaving(false); setSaved(true);
    }, 1500);
  }, [id]);

  function updateField(field, value) {
    setReport(prev => {
      const next = { ...prev, [field]: value };
      autoSave({ [field]: value });
      return next;
    });
  }

  // 지출 관련
  async function addExpense() {
    const name = prompt('지출명을 입력하세요');
    if (!name) return;
    const res = await fetch(`/api/monthly-reports/${id}/expenses`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, amount: 0, memo: '' }),
    });
    const item = await res.json();
    setReport(prev => ({ ...prev, expenses: [...prev.expenses, item] }));
  }

  async function updateExpense(eid, field, value) {
    setReport(prev => ({
      ...prev,
      expenses: prev.expenses.map(e => e.id === eid ? { ...e, [field]: value } : e),
    }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const exp = report?.expenses?.find(e => e.id === eid);
      if (!exp) return;
      await fetch(`/api/monthly-reports/${id}/expenses/${eid}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...exp, [field]: value }),
      });
      setSaved(true);
    }, 1500);
    setSaved(false);
  }

  async function deleteExpense(eid) {
    if (!window.confirm('삭제할까요?')) return;
    await fetch(`/api/monthly-reports/${id}/expenses/${eid}`, { method: 'DELETE' });
    setReport(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== eid) }));
  }

  // 체크리스트
  async function toggleCheck(key, checked, memo) {
    setReport(prev => ({
      ...prev,
      checklist: prev.checklist.map(c => c.item_key === key ? { ...c, checked: checked ? 1 : 0 } : c),
    }));
    await fetch(`/api/monthly-reports/${id}/checklist/${encodeURIComponent(key)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checked, memo }),
    });
  }

  async function updateCheckMemo(key, memo) {
    setReport(prev => ({
      ...prev,
      checklist: prev.checklist.map(c => c.item_key === key ? { ...c, memo } : c),
    }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const item = report?.checklist?.find(c => c.item_key === key);
      await fetch(`/api/monthly-reports/${id}/checklist/${encodeURIComponent(key)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked: item?.checked, memo }),
      });
    }, 1500);
    setSaved(false);
  }

  // 홍보
  async function updatePromo(pid, field, value) {
    setReport(prev => ({
      ...prev,
      promotions: prev.promotions.map(p => p.id === pid ? { ...p, [field]: value } : p),
    }));
    const promo = report?.promotions?.find(p => p.id === pid);
    if (!promo) return;
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await fetch(`/api/monthly-reports/${id}/promotions/${pid}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...promo, [field]: value }),
      });
      setSaved(true);
    }, 800);
  }

  // 신규생 추가
  async function addNewStudent() {
    if (!studentForm.name.trim()) { showToast('이름을 입력하세요', 'error'); return; }
    const res = await fetch(`/api/monthly-reports/${id}/new-students`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentForm),
    });
    const s = await res.json();
    setReport(prev => ({ ...prev, new_students: [...prev.new_students, s], new_count: prev.new_count + 1 }));
    autoSave({ new_count: (report.new_count || 0) + 1 });
    setStudentForm({ name: '', grade: '', class_subject: '', reason: '', note: '' });
    setNewStudentModal(false);
    showToast('신규생 추가됐어요!');
  }

  async function deleteNewStudent(sid) {
    await fetch(`/api/monthly-reports/${id}/new-students/${sid}`, { method: 'DELETE' });
    setReport(prev => ({ ...prev, new_students: prev.new_students.filter(s => s.id !== sid), new_count: Math.max(0, prev.new_count - 1) }));
    autoSave({ new_count: Math.max(0, (report.new_count || 0) - 1) });
  }

  async function addWithdrawnStudent() {
    if (!studentForm.name.trim()) { showToast('이름을 입력하세요', 'error'); return; }
    const res = await fetch(`/api/monthly-reports/${id}/withdrawn-students`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentForm),
    });
    const s = await res.json();
    setReport(prev => ({ ...prev, withdrawn_students: [...prev.withdrawn_students, s], withdrawn_count: prev.withdrawn_count + 1 }));
    autoSave({ withdrawn_count: (report.withdrawn_count || 0) + 1 });
    setStudentForm({ name: '', grade: '', class_subject: '', reason: '', note: '' });
    setWithdrawnModal(false);
    showToast('퇴원생 추가됐어요.');
  }

  async function deleteWithdrawnStudent(sid) {
    await fetch(`/api/monthly-reports/${id}/withdrawn-students/${sid}`, { method: 'DELETE' });
    setReport(prev => ({ ...prev, withdrawn_students: prev.withdrawn_students.filter(s => s.id !== sid), withdrawn_count: Math.max(0, prev.withdrawn_count - 1) }));
    autoSave({ withdrawn_count: Math.max(0, (report.withdrawn_count || 0) - 1) });
  }

  async function toggleStatus() {
    const next = report.status === '완료' ? '작성중' : '완료';
    updateField('status', next);
    showToast(next === '완료' ? '완료 처리됐어요! 🎉' : '다시 작성 중으로 변경됐어요.');
  }

  if (!report) return <div style={{ textAlign: 'center', padding: 80, color: '#9CA3AF' }}>불러오는 중...</div>;

  const expenseTotal = (report.expenses || []).reduce((s, e) => s + Number(e.amount || 0), 0);
  const revenueExcl = Number(report.total_revenue || 0) - Number(report.textbook_fee || 0);
  const netRevenue = revenueExcl - expenseTotal;
  const checkDone = (report.checklist || []).filter(c => c.checked).length;
  const checkTotal = (report.checklist || []).length;

  return (
    <div className="page-container" style={{ maxWidth: 760 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <button onClick={() => navigate('/monthly-reports')} style={{ ...S.btn('#F3F4F6', '#374151'), marginBottom: 8, fontSize: 11 }}>← 목록으로</button>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#2B3660', margin: 0 }}>{fmtYM(report.year_month)} 운영 리포트</h1>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 12, fontWeight: 700, borderRadius: 20, padding: '3px 12px',
              background: report.status === '완료' ? '#D1FAE5' : '#FEF3C7',
              color: report.status === '완료' ? '#065F46' : '#92400E',
            }}>{report.status}</span>
            <span style={{ fontSize: 11, color: saving ? '#D97706' : saved ? '#9CA3AF' : '#D97706' }}>
              {saving ? '저장 중...' : saved ? '저장됨' : '저장 대기'}
            </span>
          </div>
        </div>
        <button onClick={toggleStatus} style={{
          padding: '10px 18px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          background: report.status === '완료' ? '#FEF3C7' : '#D1FAE5',
          color: report.status === '완료' ? '#92400E' : '#065F46',
        }}>
          {report.status === '완료' ? '다시 작성 중으로' : '✅ 완료 처리'}
        </button>
      </div>

      {/* 1. 학생 현황 */}
      <Section title="👥 학생 현황" open={open.students} onToggle={() => toggle('students')}
        badge={`재원 ${report.enrolled_count || 0}명 · 신규 ${report.new_count || 0} · 퇴원 ${report.withdrawn_count || 0}`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: '재원생', field: 'enrolled_count', color: '#2B3660', bg: '#EFF6FF' },
            { label: '신규생', field: 'new_count', color: '#059669', bg: '#D1FAE5' },
            { label: '퇴원생', field: 'withdrawn_count', color: '#DC2626', bg: '#FEE2E2' },
          ].map(({ label, field, color, bg }) => (
            <div key={field} style={{ background: bg, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color, fontWeight: 600, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color }}>{report[field] || 0}</div>
              <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>명</div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={S.label}>재원생 수 직접 입력</div>
          <input type="number" style={{ ...S.numInput, maxWidth: 140 }} value={report.enrolled_count || 0}
            onChange={e => updateField('enrolled_count', parseInt(e.target.value) || 0)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>📗 신규생 ({report.new_students?.length || 0}명)</div>
            <button onClick={() => { setStudentForm({ name: '', grade: '', class_subject: '', reason: '', note: '' }); setNewStudentModal(true); }} style={S.btn('#D1FAE5', '#065F46')}>+ 추가</button>
          </div>
          {(report.new_students || []).map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F8F9FB', borderRadius: 8, marginBottom: 4 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</span>
                {s.grade && <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 6 }}>{s.grade}</span>}
                {s.class_subject && <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 4 }}>/ {s.class_subject}</span>}
                {s.note && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{s.note}</div>}
              </div>
              <button onClick={() => deleteNewStudent(s.id)} style={{ ...S.btn('#FEE2E2', '#DC2626'), padding: '4px 8px' }}>🗑</button>
            </div>
          ))}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626' }}>📕 퇴원생 ({report.withdrawn_students?.length || 0}명)</div>
            <button onClick={() => { setStudentForm({ name: '', grade: '', class_subject: '', reason: '', note: '' }); setWithdrawnModal(true); }} style={S.btn('#FEE2E2', '#DC2626')}>+ 추가</button>
          </div>
          {(report.withdrawn_students || []).map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F8F9FB', borderRadius: 8, marginBottom: 4 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</span>
                {s.grade && <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 6 }}>{s.grade}</span>}
                {s.reason && <span style={{ fontSize: 11, color: '#DC2626', marginLeft: 4 }}>/ {s.reason}</span>}
                {s.note && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{s.note}</div>}
              </div>
              <button onClick={() => deleteWithdrawnStudent(s.id)} style={{ ...S.btn('#FEE2E2', '#DC2626'), padding: '4px 8px' }}>🗑</button>
            </div>
          ))}
        </div>
      </Section>

      {/* 2. 수납/정산 */}
      <Section title="💰 수납 / 정산" open={open.finance} onToggle={() => toggle('finance')}
        badge={`수납 ${fmtMoney(report.total_revenue)} · 잔액 ${fmtMoney(netRevenue)}`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 18, padding: '14px 16px', background: '#F8F9FB', borderRadius: 12 }}>
          {[
            { label: '교재비 제외 매출', value: fmtMoney(revenueExcl), color: '#2B3660' },
            { label: '총 운영 지출', value: fmtMoney(expenseTotal), color: '#DC2626' },
            { label: '실운영 잔액', value: fmtMoney(netRevenue), color: netRevenue >= 0 ? '#059669' : '#DC2626' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div style={S.label}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          {[
            { label: '총 수납액', field: 'total_revenue' },
            { label: '교재비', field: 'textbook_fee' },
          ].map(({ label, field }) => (
            <div key={field}>
              <div style={S.label}>{label}</div>
              <input type="number" style={S.numInput} value={report[field] || 0}
                onChange={e => updateField(field, parseInt(e.target.value) || 0)} />
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>🧾 지출 항목 (합계: {fmtMoney(expenseTotal)})</div>
            <button onClick={addExpense} style={S.btn('#F3F4F6', '#374151')}>+ 지출 추가</button>
          </div>
          {(report.expenses || []).map(e => (
            <div key={e.id} style={{ background: '#F8F9FB', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input style={{ ...S.numInput, fontSize: 13, flex: 2 }} value={e.name} placeholder="지출명"
                  onChange={ev => updateExpense(e.id, 'name', ev.target.value)} />
                <input type="number" style={{ ...S.numInput, fontSize: 13, flex: 1 }} value={e.amount || 0} placeholder="금액"
                  onChange={ev => updateExpense(e.id, 'amount', parseInt(ev.target.value) || 0)} />
                <button onClick={() => deleteExpense(e.id)} style={{ ...S.btn('#FEE2E2', '#DC2626'), padding: '6px 10px', flexShrink: 0 }}>🗑</button>
              </div>
              <input style={{ ...S.numInput, fontSize: 12 }} value={e.memo} placeholder="메모 (선택)"
                onChange={ev => updateExpense(e.id, 'memo', ev.target.value)} />
            </div>
          ))}
        </div>
        {[
          { label: '미납 메모', field: 'unpaid_memo', placeholder: '미납 학생 및 금액 메모' },
          { label: '환불/할인 메모', field: 'refund_memo', placeholder: '환불 또는 할인 내용 메모' },
          { label: '정산 관련 특이사항', field: 'settlement_memo', placeholder: '기타 정산 메모' },
        ].map(({ label, field, placeholder }) => (
          <div key={field} style={{ marginBottom: 10 }}>
            <div style={S.label}>{label}</div>
            <textarea rows={2} style={S.textarea} value={report[field] || ''} placeholder={placeholder}
              onChange={e => updateField(field, e.target.value)} />
          </div>
        ))}
      </Section>

      {/* 3. 재원생 관리 체크리스트 */}
      <Section title="✅ 재원생 관리 기록" open={open.checklist} onToggle={() => toggle('checklist')}
        badge={`${checkDone}/${checkTotal} 완료`}>
        {(report.checklist || []).map(c => (
          <div key={c.item_key} style={{ marginBottom: 10, padding: '10px 12px', background: c.checked ? '#F0FDF4' : '#F8F9FB', borderRadius: 10, border: `1px solid ${c.checked ? '#BBF7D0' : '#E5E7EB'}` }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!c.checked} onChange={e => toggleCheck(c.item_key, e.target.checked, c.memo)}
                style={{ width: 18, height: 18, accentColor: '#2B3660', cursor: 'pointer' }} />
              <span style={{ fontWeight: 600, fontSize: 13, color: c.checked ? '#065F46' : '#374151' }}>{c.item_key}</span>
            </label>
            <input style={{ ...S.numInput, fontSize: 12, marginTop: 8, fontWeight: 400, color: '#6B7280' }}
              placeholder="메모 (선택)" value={c.memo || ''}
              onChange={e => updateCheckMemo(c.item_key, e.target.value)} />
          </div>
        ))}
      </Section>

      {/* 4. 홍보 기록 */}
      <Section title="📣 홍보 기록" open={open.promo} onToggle={() => toggle('promo')}
        badge={`달성률 ${report.promotions?.length ? Math.round((report.promotions.reduce((s,p)=>s+p.actual,0)/report.promotions.reduce((s,p)=>s+p.target,0))*100) : 0}%`}>
        {(report.promotions || []).map(p => (
          <div key={p.id} style={{ marginBottom: 14, padding: '14px 16px', background: '#F8F9FB', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#2B3660' }}>{p.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>목표</span>
                <input type="number" style={{ width: 52, padding: '4px 8px', border: '1px solid #E5E7EB', borderRadius: 6, textAlign: 'center', fontSize: 13, fontWeight: 700 }}
                  value={p.target} onChange={e => updatePromo(p.id, 'target', parseInt(e.target.value) || 0)} />
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>회</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <Counter value={p.actual} onChange={v => updatePromo(p.id, 'actual', v)} />
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>실제 횟수</span>
            </div>
            <ProgressBar actual={p.actual} target={p.target} />
            <input style={{ ...S.numInput, fontSize: 12, fontWeight: 400, color: '#6B7280', marginTop: 8 }}
              placeholder="메모 (예: 업로드 내용)" value={p.memo || ''}
              onChange={e => updatePromo(p.id, 'memo', e.target.value)} />
          </div>
        ))}
      </Section>

      {/* 5. 이달 플랜 */}
      <Section title="📅 이달 플랜" open={open.calendar} onToggle={() => toggle('calendar')}
        badge={`${calendarEvents.length}개`}>
        <CalendarGrid
          yearMonth={report.year_month}
          events={calendarEvents}
          onDayClick={(date, events) => setCalendarModal({ date, events })}
        />
      </Section>

      {/* 6. 월간 회고 */}
      <Section title="📝 월간 회고" open={open.retro} onToggle={() => toggle('retro')}
        badge={report.reflection_good ? '작성됨' : '미작성'}>
        {[
          { label: '이번 달 잘된 점', field: 'reflection_good', placeholder: '이번 달 특히 잘 됐던 것들을 기록해보세요' },
          { label: '이번 달 아쉬운 점', field: 'reflection_bad', placeholder: '아쉬웠거나 개선이 필요한 부분을 적어보세요' },
          { label: '다음 달 집중할 것', field: 'reflection_next', placeholder: '다음 달에 특히 신경 쓸 목표나 계획을 적어보세요' },
          { label: '기타 메모', field: 'reflection_memo', placeholder: '그 외 자유롭게 기록하고 싶은 것들' },
        ].map(({ label, field, placeholder }) => (
          <div key={field} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>{label}</div>
            <textarea rows={3} style={S.textarea} value={report[field] || ''} placeholder={placeholder}
              onChange={e => updateField(field, e.target.value)} />
          </div>
        ))}
      </Section>

      {/* 캘린더 날짜 모달 */}
      {calendarModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCalendarModal(null)}>
          <div className="modal" style={{ maxWidth: 420, width: '95%' }}>
            <h2 className="modal-title">📅 {calendarModal.date.slice(5).replace('-', '월 ')}일</h2>

            {/* 기존 일정 목록 */}
            {calendarModal.events.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {calendarModal.events.map(ev => (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: COLORS[ev.color]?.bg || '#FEFCE8', borderRadius: 10, marginBottom: 6, border: `1px solid ${COLORS[ev.color]?.border || '#FDE68A'}` }}>
                    {editingEvent?.id === ev.id ? (
                      <div style={{ flex: 1 }}>
                        <input value={editingEvent.title} onChange={e => setEditingEvent(p => ({ ...p, title: e.target.value }))}
                          style={{ width: '100%', padding: '6px 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 13, marginBottom: 6, boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>
                          {Object.entries(COLORS).map(([k, v]) => (
                            <button key={k} onClick={() => setEditingEvent(p => ({ ...p, color: k }))}
                              style={{ width: 22, height: 22, background: v.chip, border: editingEvent.color === k ? '2px solid #2B3660' : '1px solid #E5E7EB', borderRadius: 4, cursor: 'pointer' }} />
                          ))}
                        </div>
                        <textarea value={editingEvent.description} onChange={e => setEditingEvent(p => ({ ...p, description: e.target.value }))}
                          placeholder="상세 내용 (선택)" rows={2} style={{ width: '100%', padding: '6px 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                          <button onClick={() => updateEvent(ev.id)} style={{ flex: 1, padding: '7px', background: '#2B3660', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>저장</button>
                          <button onClick={() => setEditingEvent(null)} style={{ padding: '7px 10px', background: '#F3F4F6', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 12 }}>취소</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS[ev.color]?.text || '#92400E' }}>{ev.title}</div>
                          {ev.description && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2, lineHeight: 1.4 }}>{ev.description}</div>}
                        </div>
                        <button onClick={() => setEditingEvent({ ...ev })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#9CA3AF', padding: 2 }}>✏️</button>
                        <button onClick={() => { deleteEvent(ev.id); setCalendarModal(p => ({ ...p, events: p.events.filter(e => e.id !== ev.id) })); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#FCA5A5', padding: 2 }}>✕</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 새 일정 추가 */}
            <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 8 }}>새 일정 추가</div>
              <input value={eventForm.title} onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addEvent()}
                placeholder="일정 제목 입력..." autoFocus
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, marginBottom: 8, boxSizing: 'border-box', outline: 'none' }} />
              {/* 색상 선택 */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>색상</span>
                {Object.entries(COLORS).map(([k, v]) => (
                  <button key={k} onClick={() => setEventForm(p => ({ ...p, color: k }))}
                    title={v.label}
                    style={{ width: 26, height: 26, background: v.chip, border: eventForm.color === k ? '2px solid #2B3660' : '1px solid #E5E7EB', borderRadius: 6, cursor: 'pointer' }} />
                ))}
              </div>
              <textarea value={eventForm.description} onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))}
                placeholder="상세 내용 (선택)" rows={2}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, resize: 'none', marginBottom: 10, boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setCalendarModal(null)} style={{ flex: 1, padding: 10, background: '#F3F4F6', border: 'none', borderRadius: 8, fontWeight: 600, color: '#6B7280', cursor: 'pointer' }}>닫기</button>
                <button onClick={addEvent} style={{ flex: 2, padding: 10, background: '#2B3660', border: 'none', borderRadius: 8, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>추가</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 신규생 모달 */}
      {newStudentModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setNewStudentModal(false)}>
          <div className="modal" style={{ maxWidth: 440, width: '95%' }}>
            <h2 className="modal-title">📗 신규생 추가</h2>
            {[
              { label: '이름 *', key: 'name', placeholder: '학생 이름' },
              { label: '학년', key: 'grade', placeholder: '예: 초3, 중1' },
              { label: '수업 과목/반', key: 'class_subject', placeholder: '예: 파닉스반, 중등독해' },
              { label: '메모', key: 'note', placeholder: '특이사항, 소개 경로 등' },
            ].map(({ label, key, placeholder }) => (
              <div key={key} className="form-group" style={{ marginBottom: 10 }}>
                <label className="label">{label}</label>
                <input className="input" value={studentForm[key]} placeholder={placeholder}
                  onChange={e => setStudentForm(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setNewStudentModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={addNewStudent}>추가</button>
            </div>
          </div>
        </div>
      )}

      {/* 퇴원생 모달 */}
      {withdrawnModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setWithdrawnModal(false)}>
          <div className="modal" style={{ maxWidth: 440, width: '95%' }}>
            <h2 className="modal-title">📕 퇴원생 추가</h2>
            {[
              { label: '이름 *', key: 'name', placeholder: '학생 이름' },
              { label: '학년', key: 'grade', placeholder: '예: 초3, 중1' },
              { label: '퇴원 사유', key: 'reason', placeholder: '예: 이사, 학습 중단' },
              { label: '메모', key: 'note', placeholder: '기타 메모' },
            ].map(({ label, key, placeholder }) => (
              <div key={key} className="form-group" style={{ marginBottom: 10 }}>
                <label className="label">{label}</label>
                <input className="input" value={studentForm[key]} placeholder={placeholder}
                  onChange={e => setStudentForm(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setWithdrawnModal(false)}>취소</button>
              <button className="btn btn-danger" onClick={addWithdrawnStudent}>추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
