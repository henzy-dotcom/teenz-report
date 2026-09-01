import React, { useEffect, useRef, useState } from 'react';

const COLORS = {
  yellow: { bg: '#FEF3B0', border: '#F5D949' },
  pink:   { bg: '#FCD5E5', border: '#F5A9C8' },
  blue:   { bg: '#CFE8FB', border: '#8FCBF0' },
  green:  { bg: '#D6F5DD', border: '#8FE0A8' },
  purple: { bg: '#E6D9F8', border: '#C4A3EE' },
  orange: { bg: '#FDE1C2', border: '#F7B571' },
};
const COLOR_KEYS = Object.keys(COLORS);

export default function StickyNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const boardRef = useRef(null);
  const maxZ = useRef(1);

  async function load() {
    const res = await fetch('/api/sticky-notes');
    const data = await res.json();
    setNotes(data);
    maxZ.current = data.reduce((m, n) => Math.max(m, n.z_index || 1), 1);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function saveNote(note) {
    await fetch(`/api/sticky-notes/${note.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: note.content,
        color: note.color,
        pos_x: Math.round(note.pos_x),
        pos_y: Math.round(note.pos_y),
        rotation: note.rotation,
        z_index: note.z_index,
      }),
    });
  }

  async function addNote() {
    const color = COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
    const rotation = Math.round(Math.random() * 8 - 4);
    const idx = notes.length;
    const pos_x = 30 + (idx % 5) * 60;
    const pos_y = 30 + Math.floor(idx / 5) * 60 + (idx % 3) * 20;
    maxZ.current += 1;
    const res = await fetch('/api/sticky-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '', color, pos_x, pos_y, rotation, z_index: maxZ.current }),
    });
    const created = await res.json();
    setNotes(prev => [...prev, created]);
  }

  async function handleDelete(id) {
    if (!window.confirm('이 메모를 삭제할까요?')) return;
    await fetch(`/api/sticky-notes/${id}`, { method: 'DELETE' });
    setNotes(prev => prev.filter(n => n.id !== id));
  }

  function onContentChange(id, value) {
    setNotes(prev => prev.map(n => (n.id === id ? { ...n, content: value } : n)));
  }

  function bringToFront(note) {
    if (note.z_index === maxZ.current && maxZ.current > 1) return;
    maxZ.current += 1;
    const updated = { ...note, z_index: maxZ.current };
    setNotes(prev => prev.map(n => (n.id === note.id ? updated : n)));
    saveNote(updated);
  }

  function changeColor(note, color) {
    const updated = { ...note, color };
    setNotes(prev => prev.map(n => (n.id === note.id ? updated : n)));
    saveNote(updated);
  }

  function onDragStart(e, note) {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const originX = note.pos_x;
    const originY = note.pos_y;
    maxZ.current += 1;
    const newZ = maxZ.current;
    setNotes(prev => prev.map(n => (n.id === note.id ? { ...n, z_index: newZ } : n)));

    function onMove(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setNotes(prev => prev.map(n => (
        n.id === note.id
          ? { ...n, pos_x: Math.max(0, originX + dx), pos_y: Math.max(0, originY + dy) }
          : n
      )));
    }
    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      setNotes(prev => {
        const finalNote = prev.find(n => n.id === note.id);
        if (finalNote) saveNote({ ...finalNote, z_index: newZ });
        return prev;
      });
    }
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  const boardHeight = Math.max(520, ...notes.map(n => n.pos_y + 230), 520);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">메모</h1>
          <p className="page-subtitle">생각날 때 바로 붙여두는 포스트잇 · 자유롭게 옮길 수 있어요</p>
        </div>
        <button className="btn btn-primary" onClick={addNote}>+ 새 메모</button>
      </div>

      {!loading && (
        <div
          ref={boardRef}
          style={{
            position: 'relative',
            minHeight: boardHeight,
            background: '#F3EFE6',
            borderRadius: 16,
            border: '1px solid #E5E0D3',
            backgroundImage: 'radial-gradient(#DDD6C4 1px, transparent 1px)',
            backgroundSize: '18px 18px',
            padding: 10,
            overflow: 'hidden',
          }}
        >
          {notes.map(note => {
            const c = COLORS[note.color] || COLORS.yellow;
            return (
              <div
                key={note.id}
                onMouseDown={() => bringToFront(note)}
                style={{
                  position: 'absolute',
                  left: note.pos_x,
                  top: note.pos_y,
                  width: 190,
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  borderRadius: 4,
                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                  transform: `rotate(${note.rotation}deg)`,
                  zIndex: note.z_index,
                }}
              >
                {/* 드래그 핸들 (마스킹테이프 느낌) */}
                <div
                  onPointerDown={e => onDragStart(e, note)}
                  style={{
                    height: 22, cursor: 'grab', display: 'flex',
                    justifyContent: 'flex-end', alignItems: 'center',
                    padding: '0 6px', touchAction: 'none',
                  }}
                >
                  <button onClick={() => handleDelete(note.id)} style={{
                    border: 'none', background: 'transparent', color: 'rgba(0,0,0,0.35)',
                    fontSize: 15, cursor: 'pointer', lineHeight: 1, padding: 2,
                  }}>×</button>
                </div>

                <textarea
                  value={note.content}
                  onChange={e => onContentChange(note.id, e.target.value)}
                  onFocus={() => bringToFront(note)}
                  onBlur={() => saveNote(note)}
                  placeholder="메모..."
                  style={{
                    width: '100%', minHeight: 110, resize: 'vertical', border: 'none',
                    background: 'transparent', padding: '0 12px 8px', boxSizing: 'border-box',
                    fontSize: 13, fontFamily: 'inherit', color: '#3A3220', lineHeight: 1.6, outline: 'none',
                  }}
                />

                {/* 색상 스와치 */}
                <div style={{ display: 'flex', gap: 4, padding: '0 10px 10px' }}>
                  {COLOR_KEYS.map(key => (
                    <button
                      key={key}
                      onClick={() => changeColor(note, key)}
                      title={key}
                      style={{
                        width: 12, height: 12, borderRadius: '50%',
                        border: note.color === key ? '2px solid #3A3220' : '1px solid rgba(0,0,0,0.15)',
                        background: COLORS[key].bg, cursor: 'pointer', padding: 0,
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {notes.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#9C9480' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📝</div>
              + 버튼으로 첫 메모를 붙여보세요!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
