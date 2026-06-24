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

  function startEdit(t) {
    setEditingId(t.id);
    setEditForm({ title: t.title, content: t.content });
  }

  async function saveEdit(id) {
    await fetch(`/api/kakao-templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditingId(null);
    showToast('저장됐어요!');
    load();
  }

  async function handleDelete(id) {
    if (!window.confirm('이 템플릿을 삭제할까요?')) return;
    await fetch(`/api/kakao-templates/${id}`, { method: 'DELETE' });
    showToast('삭제됐어요.');
    load();
  }

  async function handleAdd() {
    if (!newForm.title.trim()) { showToast('제목을 입력해주세요.', 'error'); return; }
    await fetch('/api/kakao-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newForm),
    });
    setShowNew(false);
    setNewForm({ title: '', content: '' });
    showToast('템플릿이 추가됐어요!');
    load();
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
          <p className="page-subtitle">자주 보내는 메시지를 복사해서 바로 붙여넣기</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowNew(true); setNewForm({ title: '', content: '' }); }}>
          + 템플릿 추가
        </button>
      </div>

      {/* 새 템플릿 추가 */}
      {showNew && (
        <div style={{ background: '#fff', border: '2px solid #2B3660', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 4px 16px rgba(43,54,96,0.12)' }}>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="label">제목</label>
            <input className="input" value={newForm.title} onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))} placeholder="예: 📚 교재 안내" />
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {templates.map(t => (
          <div key={t.id} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(43,54,96,0.07)', overflow: 'hidden' }}>
            {/* 헤더 */}
            <div style={{ padding: '14px 18px', background: '#F8F9FC', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {editingId === t.id ? (
                <input className="input" value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                  style={{ fontWeight: 700, fontSize: 15, flex: 1, marginRight: 8 }} />
              ) : (
                <span style={{ fontWeight: 700, fontSize: 15, color: '#1C1C1E' }}>{t.title}</span>
              )}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {editingId === t.id ? (
                  <>
                    <button className="btn btn-secondary btn-xs" onClick={() => setEditingId(null)}>취소</button>
                    <button className="btn btn-primary btn-xs" onClick={() => saveEdit(t.id)}>저장</button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-secondary btn-xs" onClick={() => startEdit(t)}>수정</button>
                    <button className="btn btn-xs" onClick={() => handleDelete(t.id)}
                      style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}>🗑</button>
                  </>
                )}
              </div>
            </div>

            {/* 내용 */}
            <div style={{ padding: '16px 18px' }}>
              {editingId === t.id ? (
                <textarea className="input" rows={6} style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 14 }}
                  value={editForm.content} onChange={e => setEditForm(p => ({ ...p, content: e.target.value }))} />
              ) : (
                <pre style={{ margin: 0, fontFamily: 'inherit', fontSize: 14, color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                  {t.content}
                </pre>
              )}
            </div>

            {/* 복사 버튼 */}
            {editingId !== t.id && (
              <div style={{ padding: '0 18px 16px' }}>
                <button onClick={() => copyText(t.content)}
                  style={{
                    width: '100%', padding: '12px', background: '#FFEB00', color: '#1C1C1E',
                    border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  💬 카카오톡에 복사하기
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {templates.length === 0 && !showNew && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
          템플릿이 없어요. + 버튼으로 추가해보세요!
        </div>
      )}
    </div>
  );
}
