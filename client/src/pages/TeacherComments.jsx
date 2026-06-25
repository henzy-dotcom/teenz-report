import React, { useEffect, useState, useContext } from 'react';
import { ToastContext } from '../App.jsx';

const CATEGORIES = [
  '🌟 열심히 하는 학생',
  '😊 밝고 활발한 학생',
  '📚 성실하고 조용한 학생',
  '💪 성장 중인 학생',
];

export default function TeacherComments() {
  const [comments, setComments] = useState([]);
  const [tab, setTab] = useState(CATEGORIES[0]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ category: '', content: '' });
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ category: CATEGORIES[0], content: '' });
  const showToast = useContext(ToastContext);

  async function load() {
    const res = await fetch('/api/teacher-comments');
    setComments(await res.json());
  }
  useEffect(() => { load(); }, []);

  const filtered = comments.filter(c => c.category === tab);

  function startEdit(c) {
    setEditingId(c.id);
    setEditForm({ category: c.category, content: c.content });
  }

  async function saveEdit(id) {
    await fetch(`/api/teacher-comments/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditingId(null); showToast('저장됐어요!'); load();
  }

  async function handleDelete(id) {
    if (!window.confirm('삭제할까요?')) return;
    await fetch(`/api/teacher-comments/${id}`, { method: 'DELETE' });
    showToast('삭제됐어요.'); load();
  }

  async function handleAdd() {
    if (!newForm.content.trim()) { showToast('내용을 입력해주세요.', 'error'); return; }
    await fetch('/api/teacher-comments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newForm),
    });
    setShowNew(false); setNewForm({ category: tab, content: '' });
    showToast('추가됐어요!'); load();
  }

  function copyText(content) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(content)
        .then(() => showToast('복사됐어요! 리포트에 붙여넣기 하세요 😊'))
        .catch(() => fallbackCopy(content));
    } else {
      fallbackCopy(content);
    }
  }

  function fallbackCopy(content) {
    const ta = document.createElement('textarea');
    ta.value = content;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try { document.execCommand('copy'); showToast('복사됐어요! 리포트에 붙여넣기 하세요 😊'); }
    catch { showToast('직접 길게 눌러서 복사해주세요', 'error'); }
    document.body.removeChild(ta);
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">선생님 한마디</h1>
          <p className="page-subtitle">탭하면 바로 복사돼요</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowNew(true); setNewForm({ category: tab, content: '' }); }}>
          + 추가
        </button>
      </div>

      {/* 카테고리 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setTab(cat)} style={{
            padding: '8px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: tab === cat ? 700 : 400,
            background: tab === cat ? '#2B3660' : '#F3F4F6',
            color: tab === cat ? '#fff' : '#374151',
            transition: 'all 0.15s',
          }}>
            {cat}
          </button>
        ))}
      </div>

      {/* 새 코멘트 추가 */}
      {showNew && (
        <div style={{ background: '#fff', border: '2px solid #2B3660', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 4px 16px rgba(43,54,96,0.12)' }}>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="label">카테고리</label>
            <select className="input" value={newForm.category} onChange={e => setNewForm(p => ({ ...p, category: e.target.value }))}>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="label">내용</label>
            <textarea className="input" rows={4} style={{ resize: 'vertical', fontFamily: 'inherit' }}
              value={newForm.content} onChange={e => setNewForm(p => ({ ...p, content: e.target.value }))}
              placeholder="선생님 한마디를 입력하세요" autoFocus />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setShowNew(false)}>취소</button>
            <button className="btn btn-primary" onClick={handleAdd}>추가</button>
          </div>
        </div>
      )}

      {/* 편집 모달 */}
      {editingId && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingId(null)}>
          <div className="modal" style={{ maxWidth: 500, width: '95%' }}>
            <h2 className="modal-title">한마디 수정</h2>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="label">카테고리</label>
              <select className="input" value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="label">내용</label>
              <textarea className="input" rows={5} style={{ resize: 'vertical', fontFamily: 'inherit' }}
                value={editForm.content} onChange={e => setEditForm(p => ({ ...p, content: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditingId(null)}>취소</button>
              <button className="btn btn-primary" onClick={() => saveEdit(editingId)}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 카드 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 14 }}>
        {filtered.map((c, idx) => (
          <div key={c.id} style={{
            background: '#fff', borderRadius: 16,
            boxShadow: '0 2px 10px rgba(43,54,96,0.08)',
            border: '1px solid #F0EEF8',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* 번호 + 내용 */}
            <div style={{ padding: '16px 16px 12px', flex: 1 }}>
              <span style={{
                display: 'inline-block', fontSize: 10, fontWeight: 700,
                color: '#F0547A', background: '#FFF0F4', borderRadius: 20,
                padding: '2px 8px', marginBottom: 10,
              }}>
                {idx + 1}
              </span>
              <p style={{ margin: 0, fontSize: 13, color: '#1C1C1E', lineHeight: 1.8, wordBreak: 'keep-all' }}>
                {c.content}
              </p>
            </div>
            {/* 버튼 */}
            <div style={{ padding: '10px 12px', display: 'flex', gap: 6, borderTop: '1px solid #F3F4F6' }}>
              <button onClick={() => copyText(c.content)} style={{
                flex: 1, padding: '10px', background: '#F0547A', color: '#fff',
                border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13,
                cursor: 'pointer',
              }}>📋 복사</button>
              <button onClick={() => startEdit(c)} style={{
                padding: '10px 12px', background: '#F3F4F6', color: '#374151',
                border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 12,
                cursor: 'pointer',
              }}>수정</button>
              <button onClick={() => handleDelete(c.id)} style={{
                padding: '10px 12px', background: '#FEE2E2', color: '#DC2626',
                border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 12,
                cursor: 'pointer',
              }}>🗑</button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && !showNew && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
          + 버튼으로 한마디를 추가해보세요!
        </div>
      )}
    </div>
  );
}
