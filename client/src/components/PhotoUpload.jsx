import React, { useRef, useState } from 'react';

const PHOTO_LABELS = {
  homework: '숙제 사진',
  test:     '테스트 사진',
  activity: '학습/활동 사진',
};

export default function PhotoUpload({ reportId, photoType, existingFilename, onUploaded, onDeleted, consentPhoto }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]     = useState(existingFilename ? `/uploads/photos/${existingFilename}` : null);
  const label = PHOTO_LABELS[photoType] || photoType;

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
    setUploading(true);
    try {
      const fd  = new FormData();
      fd.append('file', file);
      const res  = await fetch(`/api/upload/photo/${reportId}/${photoType}`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUploaded && onUploaded(data.filename);
    } catch (err) {
      alert('업로드 실패: ' + err.message);
      setPreview(existingFilename ? `/uploads/photos/${existingFilename}` : null);
    } finally { setUploading(false); }
  }

  async function handleDelete() {
    if (!confirm(`${label}를 삭제할까요?`)) return;
    try {
      await fetch(`/api/upload/photo/${reportId}/${photoType}`, { method: 'DELETE' });
      setPreview(null);
      onDeleted && onDeleted();
    } catch { alert('삭제 실패'); }
  }

  /* 사진 동의 없음 */
  if (!consentPhoto) {
    return (
      <div style={{ border: '1px dashed #FDE68A', borderRadius: 8, padding: '14px 16px', background: '#FFFBEB', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>⚠️</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>{label}</div>
          <div style={{ fontSize: 11, color: '#B45309' }}>사진 공개 동의 없음</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ border: `1px solid ${preview ? '#E5E7EB' : '#E5E7EB'}`, borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      {preview ? (
        <div style={{ position: 'relative' }}>
          <img src={preview} alt={label} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
          {/* 오버레이 */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '6px 8px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.65))',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{label}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11, cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                onClick={() => inputRef.current.click()} disabled={uploading}>교체</button>
              <button style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.15)', color: '#FCA5A5', fontSize: 11, cursor: 'pointer', backdropFilter: 'blur(4px)' }}
                onClick={handleDelete} disabled={uploading}>삭제</button>
            </div>
          </div>
          {uploading && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="spinner" />
            </div>
          )}
        </div>
      ) : (
        /* 드롭존 */
        <button onClick={() => inputRef.current.click()} disabled={uploading} style={{
          width: '100%', aspectRatio: '4/3', background: '#F9FAFB', border: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 6, cursor: 'pointer', transition: 'background 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
          onMouseLeave={e => e.currentTarget.style.background = '#F9FAFB'}
        >
          {uploading ? <span className="spinner" /> : (
            <>
              <span style={{ fontSize: 28, opacity: 0.5 }}>📷</span>
              <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>눌러서 추가</span>
            </>
          )}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}
