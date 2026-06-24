import React, { useEffect, useState, useContext } from 'react';
import { ToastContext } from '../App.jsx';

export default function KakaoTemplates() {
  const [templates, setTemplates] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', content: '' });
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ title: '', content: '' });
  const { showToast } = useContext(ToastContext);

  async function load() {
    const res = await fetch('/api/kakao-templates');
    setTemplates(await res.json());
  }
  useEffect(() => { load(); }, []);

  function startEdit(t) { setEditingId(t.id); setEditForm({ title: t.title, content: t.content }); }

  async function saveEdit(id) {
    await fetch(`/api/kakao-templates/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditingId(null); showToast('저장됐어요!'); load();
  }

  async function handleDelete(id) {
    if (!window.confirm('이 템플릿을 삭제할까요?')) return;
    await fetch(`/api/kakao-templates/${id}`, { method: 'DELETE' });
    showToast('삭제됐어요.'); load();
  }

  async function handleAdd() {
    if (!newForm.title.trim()) { showToast('제목을 입력해주세요.', 'error'); return; }
    await fetch('/api/kakao-templates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newForm),
    });
    setShowNew(false); setNewForm({ title: '', content: '' });
    showToast('템플릿이 추가됐어요!'); load();
  }

  function copyText(content) {
    navigator.clipboard.writeText(content);
    showToast('복사됐어요! 카톡에 붙여넣기 하세요 😊');
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">카톡 템플릿</h1>
          <p className="page-subtitle">탭하면 바로 복사돼요</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowNew(true); setNewForm({ title: '', content: '' }); }}>
          + 추가
        </button>
      </div>

      {/* 새 템플릿 추가 */}
      {showNew && (
        <div style={{ background: '#fff', border: '2px solid #2B3660', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 4px 16px rgba(43,54,96,0.12)' }}>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="label">제목</label>
            <input className="input" value={newForm.title} onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))} placeholder="예: 📚 교재 안내" autoFocus />
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="label">내용</label>
            <textarea className="input" rows={6} style={{ resize: 'vertical', fontFamily: 'inherit' }}
              value={newForm.content} onChange={e => setNewForm(p => ({ ...p, content: e.target.value }))}
              placeholder="카카오톡에 보낼 내용을 입력하세요" />
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
            <h2 className="modal-title">템플릿 수정</h2>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="label">제목</label>
              <input className="input" value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="label">내용</label>
              <textarea className="input" rows={8} style={{ resize: 'vertical', fontFamily: 'inherit' }}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
        {templates.map(t => (
          <div key={t.id} style={{
            background: '#fff', borderRadius: 16,
            boxShadow: '0 2px 10px rgba(43,54,96,0.08)',
            display: 'flex', flexDirection: 'column',
            border: '1px solid #F0EEF8',
            overflow: 'hidden',
          }}>
            {/* 제목 */}
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1C1C1E' }}>{t.title}</div>
            </div>

            {/* 내용 미리보기 */}
            <div style={{ padding: '12px 16px', flex: 1 }}>
              <pre style={{
                margin: 0, fontFamily: 'inherit', fontSize: 12, color: '#6B7280',
                whiteSpace: 'pre-wrap', lineHeight: 1.6,
                display: '-webkit-box', WebkitLineClamp: 5,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {t.content}
              </pre>
            </div>

            {/* 버튼 */}
            <div style={{ padding: '10px 12px', display: 'flex', gap: 6 }}>
              <button onClick={() => copyText(t.content)} style={{
                flex: 1, padding: '10px', background: '#FFEB00', color: '#1C1C1E',
                border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13,
                cursor: 'pointer',
              }}>💬 복사</button>
              <button onClick={() => startEdit(t)} style={{
                padding: '10px 12px', background: '#F3F4F6', color: '#374151',
                border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 12,
                cursor: 'pointer',
              }}>수정</button>
              <button onClick={() => handleDelete(t.id)} style={{
                padding: '10px 12px', background: '#FEE2E2', color: '#DC2626',
                border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 12,
                cursor: 'pointer',
              }}>🗑</button>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && !showNew && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
          + 버튼으로 템플릿을 추가해보세요!
        </div>
      )}
    </div>
  );
}
