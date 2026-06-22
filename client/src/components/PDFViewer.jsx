import React, { useState } from 'react';

const PDF_LABELS = {
  weekly1: '주간 AI 리포트 1',
  weekly2: '주간 AI 리포트 2',
  monthly: '월간 AI 리포트',
};

export function PDFViewerButton({ pdf, isAdmin = false }) {
  const [open, setOpen] = useState(false);
  if (!pdf) return null;

  const url = `/uploads/pdfs/${pdf.filename}`;
  const label = PDF_LABELS[pdf.pdf_type] || pdf.pdf_type;

  return (
    <div style={{ marginBottom: 8 }}>
      <button
        className="btn btn-ghost btn-sm"
        style={{ width: '100%', justifyContent: 'space-between' }}
        onClick={() => setOpen(!open)}
      >
        <span>📄 {label} {open ? '접기' : '보기'}</span>
        <span style={{ fontSize: 10, opacity: 0.7 }}>
          {pdf.original_name ? `(${pdf.original_name})` : ''}
        </span>
      </button>

      {open && (
        <div style={{
          marginTop: 8,
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <iframe
            src={url}
            style={{ width: '100%', height: '70vh', border: 'none', display: 'block' }}
            title={label}
          />
          <div style={{
            padding: '8px 12px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
          }}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-xs"
            >
              새 탭에서 보기
            </a>
            <a
              href={url}
              download={pdf.original_name || `${label}.pdf`}
              className="btn btn-secondary btn-xs"
            >
              다운로드
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// 학부모 화면용 PDF 뷰어 (아이보리 테마)
export function PDFViewerParent({ pdf }) {
  const [open, setOpen] = useState(false);
  if (!pdf) return null;

  const url = `/uploads/pdfs/${pdf.filename}`;
  const label = PDF_LABELS[pdf.pdf_type] || pdf.pdf_type;

  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: open ? 'var(--color-deep-navy)' : 'var(--color-ivory)',
          border: '1.5px solid',
          borderColor: open ? 'var(--color-sky-blue)' : 'var(--color-border-light)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'all 0.2s',
          color: open ? 'var(--color-white)' : 'var(--color-deep-navy)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>📄</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 1 }}>
              탭하여 {open ? '접기' : '열기'}
            </div>
          </div>
        </div>
        <span style={{ fontSize: 18 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          border: '1.5px solid var(--color-border-light)',
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          overflow: 'hidden',
          background: '#f8f8f8',
        }}>
          <iframe
            src={url}
            style={{ width: '100%', height: '80vh', border: 'none', display: 'block' }}
            title={label}
          />
          <div style={{
            padding: '10px 16px',
            background: 'white',
            borderTop: '1px solid #eee',
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
          }}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '7px 16px',
                background: 'var(--color-deep-navy)',
                color: 'white',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              새 탭에서 보기
            </a>
            <a
              href={url}
              download={pdf.original_name || `${label}.pdf`}
              style={{
                padding: '7px 16px',
                background: '#f0f0f0',
                color: '#333',
                borderRadius: 6,
                fontSize: 13,
              }}
            >
              다운로드
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
