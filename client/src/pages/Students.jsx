import React, { useEffect, useState, useContext } from 'react';
import { ToastContext } from '../App.jsx';

const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;
const STATUS_LABEL = { active: '재원', suspended: '휴원', withdrawn: '퇴원' };
const emptyForm = { name: '', grade: '', class_subject: '', teacher: '', parent_phone: '', consent_photo: true, status: 'active' };

function parseBulkText(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const cols = line.split(/\t|,/).map(c => c.trim());
      return {
        name: cols[0] || '',
        grade: cols[1] || '',
        class_subject: cols[2] || '',
        teacher: cols[3] || '',
        parent_phone: cols[4] || '',
        consent_photo: true,
        status: 'active',
      };
    })
    .filter(s => s.name);
}

export default function Students() {
  const [students, setStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(emptyForm);
  const [filter, setFilter]     = useState('active');
  const [showBulk, setShowBulk]       = useState(false);
  const [bulkText, setBulkText]       = useState('');
  const [bulkPreview, setBulkPreview] = useState([]);
  const showToast = useContext(ToastContext);

  async function load() {
    const data = await fetch('/api/students').then(r => r.json());
    setStudents(data);
  }
  useEffect(() => { load(); }, []);

  function openNew()  { setEditing(null); setForm(emptyForm); setShowModal(true); }
  function openEdit(s) {
    setEditing(s);
    setForm({ name: s.name, grade: s.grade, class_subject: s.class_subject, teacher: s.teacher, parent_phone: s.parent_phone, consent_photo: !!s.consent_photo, status: s.status });
    setShowModal(true);
  }

  async function handleSubmit() {
    if (!form.name.trim()) { showToast('이름을 입력해주세요.', 'error'); return; }
    const url    = editing ? `/api/students/${editing.id}` : '/api/students';
    const method = editing ? 'PUT' : 'POST';
    const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) { const d = await res.json(); showToast(d.error || '저장 실패', 'error'); return; }
    showToast(editing ? '수정했습니다.' : '학생을 등록했습니다.');
    setShowModal(false);
    load();
  }

  function openBulk() { setBulkText(''); setBulkPreview([]); setShowBulk(true); }

  function handleBulkTextChange(e) {
    const text = e.target.value;
    setBulkText(text);
    setBulkPreview(parseBulkText(text));
  }

  async function handleBulkSubmit() {
    if (bulkPreview.length === 0) { showToast('등록할 학생이 없습니다. 이름을 한 줄에 한 명씩 입력하세요.', 'error'); return; }
    try {
      const res = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: bulkPreview }),
      });
      const d = await res.json();
      if (!res.ok) { showToast(d.error || '등록 실패', 'error'); return; }
      showToast(`${d.count}명 등록 완료!`);
      setShowBulk(false);
      load();
    } catch (e) {
      showToast('네트워크 오류가 발생했습니다.', 'error');
    }
  }

  async function handleDelete(s) {
    if (!window.confirm(`"${s.name}" 학생을 삭제할까요?\n관련 리포트와 데이터도 모두 삭제됩니다.`)) return;
    const res = await fetch(`/api/students/${s.id}`, { method: 'DELETE' });
    if (!res.ok) { showToast('삭제 실패', 'error'); return; }
    showToast(`${s.name} 학생이 삭제되었습니다.`);
    load();
  }

  async function toggleShareActive(s) {
    await fetch(`/api/students/${s.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ share_active: !s.share_active }) });
    showToast(s.share_active ? '공유 링크를 비활성화했습니다.' : '공유 링크를 활성화했습니다.', 'info');
    load();
  }

  function copyLink(s) {
    const link = s.share_code ? `${PUBLIC_BASE}/r/${s.share_code}` : `${PUBLIC_BASE}/report/${s.share_token}`;
    navigator.clipboard.writeText(link);
    showToast('링크가 복사되었습니다.');
  }

  const filtered = filter === 'all' ? students : students.filter(s => s.status === filter);
  const activeCount = students.filter(s => s.status === 'active').length;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">학생 관리</h1>
          <p className="page-subtitle">재원생 {activeCount}명</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={openBulk}>일괄 등록</button>
          <button className="btn btn-primary" onClick={openNew}>+ 학생 등록</button>
        </div>
      </div>

      <div className="filter-bar">
        {[['active', '재원'], ['suspended', '휴원'], ['withdrawn', '퇴원'], ['all', '전체']].map(([val, label]) => (
          <button key={val} className={`filter-btn ${filter === val ? 'active' : ''}`} onClick={() => setFilter(val)}>
            {label}
            {val !== 'all' && (
              <span style={{ marginLeft: 4, fontSize: 10, background: filter === val ? 'rgba(255,255,255,0.25)' : '#E5E7EB', color: filter === val ? '#fff' : '#6B7280', borderRadius: 10, padding: '0 5px', fontWeight: 700 }}>
                {students.filter(s => s.status === val).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>학생명</th>
                <th>학년</th>
                <th>반/과목</th>
                <th>담당강사</th>
                <th>학부모 연락처</th>
                <th style={{ textAlign: 'center' }}>사진동의</th>
                <th style={{ textAlign: 'center' }}>상태</th>
                <th style={{ textAlign: 'center' }}>공유링크</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#1D4ED8', flexShrink: 0 }}>
                        {s.name[0]}
                      </div>
                      <span style={{ fontWeight: 600, color: '#1C1C1E' }}>{s.name}</span>
                    </div>
                  </td>
                  <td style={{ color: '#6B7280' }}>{s.grade}</td>
                  <td style={{ color: '#374151' }}>{s.class_subject}</td>
                  <td style={{ color: '#6B7280' }}>{s.teacher}</td>
                  <td style={{ color: '#9CA3AF', fontSize: 12 }}>{s.parent_phone || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    {s.consent_photo
                      ? <span style={{ color: '#059669', fontWeight: 700 }}>✓</span>
                      : <span style={{ color: '#D1D5DB' }}>—</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge badge-${s.status}`}>{STATUS_LABEL[s.status]}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={() => toggleShareActive(s)} style={{
                      fontSize: 11, padding: '3px 10px', borderRadius: 20, border: '1px solid',
                      cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s',
                      background:  s.share_active ? '#D1FAE5' : '#F3F4F6',
                      borderColor: s.share_active ? '#A7F3D0' : '#E5E7EB',
                      color:       s.share_active ? '#065F46' : '#9CA3AF',
                    }}>
                      {s.share_active ? '활성' : '비활성'}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary btn-xs" onClick={() => openEdit(s)}>수정</button>
                      <button className="btn btn-secondary btn-xs" onClick={() => copyLink(s)} title="링크 복사">🔗</button>
                      {s.parent_phone && (
                        <a href={`sms:${s.parent_phone}`} className="btn btn-secondary btn-xs" title="문자">📱</a>
                      )}
                      <button className="btn btn-xs" onClick={() => handleDelete(s)} title="삭제" style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
              해당 상태의 학생이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* 일괄 등록 모달 */}
      {showBulk && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowBulk(false)}>
          <div className="modal" style={{ maxWidth: 640, width: '95%' }}>
            <h2 className="modal-title">학생 일괄 등록</h2>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
              한 줄에 한 명씩 입력하세요. 엑셀에서 복붙하거나 쉼표/탭으로 구분하면 자동 분리됩니다.<br />
              <span style={{ color: '#9CA3AF' }}>형식: 이름 · 학년 · 반/과목 · 담당강사 · 연락처 (이름만 필수)</span>
            </p>
            <textarea
              className="input"
              rows={8}
              style={{ fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }}
              placeholder={"홍길동\t중1\tT1R\tMs.Henzy\t010-1234-5678\n김철수\t초6\tT2\tMs.Henzy"}
              value={bulkText}
              onChange={handleBulkTextChange}
            />

            {bulkPreview.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                  미리보기 — {bulkPreview.length}명
                </p>
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 8 }}>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#F9FAFB' }}>
                        {['이름', '학년', '반/과목', '담당강사', '연락처'].map(h => (
                          <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreview.map((s, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '5px 10px', fontWeight: 600 }}>{s.name}</td>
                          <td style={{ padding: '5px 10px', color: '#6B7280' }}>{s.grade || '—'}</td>
                          <td style={{ padding: '5px 10px', color: '#6B7280' }}>{s.class_subject || '—'}</td>
                          <td style={{ padding: '5px 10px', color: '#6B7280' }}>{s.teacher || '—'}</td>
                          <td style={{ padding: '5px 10px', color: '#9CA3AF' }}>{s.parent_phone || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowBulk(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleBulkSubmit} disabled={bulkPreview.length === 0}>
                {bulkPreview.length > 0 ? `${bulkPreview.length}명 등록` : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 학생 등록/수정 모달 */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h2 className="modal-title">{editing ? '학생 정보 수정' : '학생 등록'}</h2>

            <div className="form-group">
              <label className="label">이름 *</label>
              <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="홍길동" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="label">학년</label>
                <input className="input" value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))} placeholder="중1" />
              </div>
              <div className="form-group">
                <label className="label">반/과목</label>
                <input className="input" value={form.class_subject} onChange={e => setForm(p => ({ ...p, class_subject: e.target.value }))} placeholder="T1R" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="label">담당 강사</label>
                <input className="input" value={form.teacher} onChange={e => setForm(p => ({ ...p, teacher: e.target.value }))} placeholder="박선생" />
              </div>
              <div className="form-group">
                <label className="label">학부모 연락처</label>
                <input className="input" value={form.parent_phone} onChange={e => setForm(p => ({ ...p, parent_phone: e.target.value }))} placeholder="010-0000-0000" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="label">재원 상태</label>
                <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="active">재원</option>
                  <option value="suspended">휴원</option>
                  <option value="withdrawn">퇴원</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">사진 공개 동의</label>
                <select className="input" value={form.consent_photo ? 'yes' : 'no'} onChange={e => setForm(p => ({ ...p, consent_photo: e.target.value === 'yes' }))}>
                  <option value="yes">동의</option>
                  <option value="no">미동의</option>
                </select>
              </div>
            </div>

            {!form.consent_photo && (
              <div style={{ padding: '8px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 12, color: '#92400E', marginBottom: 4 }}>
                ⚠️ 사진 공개 동의가 없는 학생의 사진은 학부모 화면에 표시되지 않습니다.
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleSubmit}>{editing ? '저장' : '등록'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
