import React, { useEffect, useState, useContext, useMemo } from 'react';
import { ToastContext } from '../App.jsx';

const CATEGORIES = [
  '🌟 열심히 하는 학생',
  '😊 밝고 활발한 학생',
  '📚 성실하고 조용한 학생',
  '💪 성장 중인 학생',
];

function copyToClipboard(content, showToast) {
  const done = () => showToast('복사됐어요! 카톡에 붙여넣기 하세요 😊');
  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = content;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try { document.execCommand('copy'); done(); }
    catch { showToast('직접 길게 눌러서 복사해주세요', 'error'); }
    document.body.removeChild(ta);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(content).then(done).catch(fallback);
  } else {
    fallback();
  }
}

// ─── 선생님 한마디 관리 패널 (카톡 템플릿에 삽입할 코멘트 라이브러리) ───
function CommentManager({ comments, reload, showToast }) {
  const [tab, setTab] = useState(CATEGORIES[0]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ category: '', content: '' });
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ category: CATEGORIES[0], content: '' });

  const filtered = comments.filter(c => c.category === tab);

  function startEdit(c) { setEditingId(c.id); setEditForm({ category: c.category, content: c.content }); }

  async function saveEdit(id) {
    await fetch(`/api/teacher-comments/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditingId(null); showToast('저장됐어요!'); reload();
  }

  async function handleDelete(id) {
    if (!window.confirm('삭제할까요?')) return;
    await fetch(`/api/teacher-comments/${id}`, { method: 'DELETE' });
    showToast('삭제됐어요.'); reload();
  }

  async function handleAdd() {
    if (!newForm.content.trim()) { showToast('내용을 입력해주세요.', 'error'); return; }
    await fetch('/api/teacher-comments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newForm),
    });
    setShowNew(false); setNewForm({ category: tab, content: '' });
    showToast('추가됐어요!'); reload();
  }

  return (
    <div style={{ background: '#FBFAFF', border: '1.5px solid #E9E5FA', borderRadius: 16, padding: 16, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#2B3660' }}>선생님 한마디 라이브러리</div>
        <button className="btn btn-primary" onClick={() => { setShowNew(true); setNewForm({ category: tab, content: '' }); }} style={{ fontSize: 12, padding: '6px 12px' }}>
          + 한마디 추가
        </button>
      </div>

      {/* 카테고리 탭 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setTab(cat)} style={{
            padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: tab === cat ? 700 : 400,
            background: tab === cat ? '#2B3660' : '#fff',
            color: tab === cat ? '#fff' : '#374151',
          }}>{cat}</button>
        ))}
      </div>

      {showNew && (
        <div style={{ background: '#fff', border: '2px solid #2B3660', borderRadius: 14, padding: 16, marginBottom: 12 }}>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="label">카테고리</label>
            <select className="input" value={newForm.category} onChange={e => setNewForm(p => ({ ...p, category: e.target.value }))}>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="label">내용</label>
            <textarea className="input" rows={3} style={{ resize: 'vertical', fontFamily: 'inherit' }}
              value={newForm.content} onChange={e => setNewForm(p => ({ ...p, content: e.target.value }))}
              placeholder="선생님 한마디를 입력하세요" autoFocus />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setShowNew(false)}>취소</button>
            <button className="btn btn-primary" onClick={handleAdd}>추가</button>
          </div>
        </div>
      )}

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))', gap: 10 }}>
        {filtered.map((c, idx) => (
          <div key={c.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #F0EEF8', padding: '10px 12px' }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: '#1C1C1E', lineHeight: 1.7, wordBreak: 'keep-all' }}>{c.content}</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => startEdit(c)} style={{ flex: 1, padding: '6px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>수정</button>
              <button onClick={() => handleDelete(c.id)} style={{ padding: '6px 10px', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>🗑</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#B0AEC0', fontSize: 12, padding: 20 }}>
            이 카테고리엔 아직 한마디가 없어요.
          </div>
        )}
      </div>
    </div>
  );
}

export default function KakaoTemplates() {
  const [templates, setTemplates] = useState([]);
  const [comments, setComments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', content: '' });
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ title: '', content: '' });
  const [showManager, setShowManager] = useState(false);
  const [selectedComment, setSelectedComment] = useState({}); // { [templateId]: commentId }
  const showToast = useContext(ToastContext);

  async function loadTemplates() {
    const res = await fetch('/api/kakao-templates');
    setTemplates(await res.json());
  }
  async function loadComments() {
    const res = await fetch('/api/teacher-comments');
    setComments(await res.json());
  }
  useEffect(() => { loadTemplates(); loadComments(); }, []);

  const commentsById = useMemo(() => {
    const map = {};
    comments.forEach(c => { map[c.id] = c; });
    return map;
  }, [comments]);

  function startEdit(t) { setEditingId(t.id); setEditForm({ title: t.title, content: t.content }); }

  async function saveEdit(id) {
    await fetch(`/api/kakao-templates/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditingId(null); showToast('저장됐어요!'); loadTemplates();
  }

  async function handleDelete(id) {
    if (!window.confirm('이 템플릿을 삭제할까요?')) return;
    await fetch(`/api/kakao-templates/${id}`, { method: 'DELETE' });
    showToast('삭제됐어요.'); loadTemplates();
  }

  async function handleAdd() {
    if (!newForm.title.trim()) { showToast('제목을 입력해주세요.', 'error'); return; }
    await fetch('/api/kakao-templates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newForm),
    });
    setShowNew(false); setNewForm({ title: '', content: '' });
    showToast('템플릿이 추가됐어요!'); loadTemplates();
  }

  function buildCombined(t) {
    const commentId = selectedComment[t.id];
    const comment = commentId ? commentsById[commentId] : null;
    return comment ? `${t.content}\n\n${comment.content}` : t.content;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">카톡 템플릿</h1>
          <p className="page-subtitle">탭하면 바로 복사돼요 · 선생님 한마디를 골라 같이 보낼 수 있어요</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowManager(v => !v)}>
            {showManager ? '한마디 라이브러리 닫기' : '💬 선생님 한마디 관리'}
          </button>
          <button className="btn btn-primary" onClick={() => { setShowNew(true); setNewForm({ title: '', content: '' }); }}>
            + 템플릿 추가
          </button>
        </div>
      </div>

      {showManager && (
        <CommentManager comments={comments} reload={loadComments} showToast={showToast} />
      )}

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))', gap: 14 }}>
        {templates.map(t => {
          const commentId = selectedComment[t.id] || '';
          const selected = commentId ? commentsById[commentId] : null;
          return (
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
              <div style={{ padding: '12px 16px 4px', flex: 1 }}>
                <pre style={{
                  margin: 0, fontFamily: 'inherit', fontSize: 12, color: '#6B7280',
                  whiteSpace: 'pre-wrap', lineHeight: 1.6,
                  display: '-webkit-box', WebkitLineClamp: 5,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {t.content}
                </pre>
              </div>

              {/* 선생님 한마디 선택 */}
              <div style={{ padding: '4px 16px 10px' }}>
                <select
                  className="input"
                  value={commentId}
                  onChange={e => setSelectedComment(p => ({ ...p, [t.id]: e.target.value }))}
                  style={{ fontSize: 11, padding: '6px 8px' }}
                >
                  <option value="">+ 선생님 한마디 (선택 안 함)</option>
                  {CATEGORIES.map(cat => {
                    const opts = comments.filter(c => c.category === cat);
                    if (opts.length === 0) return null;
                    return (
                      <optgroup key={cat} label={cat}>
                        {opts.map(c => (
                          <option key={c.id} value={c.id}>{c.content.slice(0, 24)}{c.content.length > 24 ? '…' : ''}</option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
                {selected && (
                  <div style={{
                    marginTop: 6, padding: '8px 10px', background: '#FFF0F4', borderRadius: 8,
                    fontSize: 11, color: '#8A3654', lineHeight: 1.6, wordBreak: 'keep-all',
                  }}>
                    {selected.content}
                  </div>
                )}
              </div>

              {/* 버튼 */}
              <div style={{ padding: '10px 12px', display: 'flex', gap: 6, borderTop: '1px solid #F3F4F6' }}>
                <button onClick={() => copyToClipboard(buildCombined(t), showToast)} style={{
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
          );
        })}
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
