import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';


/* ─── 데이터 레이블 ─── */
const HOMEWORK = {
  done:    { text: '완료',      emoji: '✅', bg: '#E8F8F1', color: '#1a7a50', border: '#B8E8D8' },
  partial: { text: '일부 완료', emoji: '🟡', bg: '#FEF9E6', color: '#7a5c00', border: '#F5D78C' },
  poor:    { text: '미흡',      emoji: '🟠', bg: '#FEF0E6', color: '#7a3000', border: '#F5B08C' },
  none:    { text: '미제출',    emoji: '❌', bg: '#FEE6E6', color: '#7a0000', border: '#F0A0A0' },
};
const ATTITUDE = {
  active:      { text: '적극적',    emoji: '⭐', bg: '#E8F8F1', color: '#1a7a50' },
  normal:      { text: '보통',      emoji: '😊', bg: '#F5F5F5', color: '#555' },
  needs_focus: { text: '집중 필요', emoji: '💪', bg: '#FEF0E6', color: '#7a3000' },
};
const PDF_LABEL = {
  weekly1: '1주차 AI 리포트',
  weekly2: '2주차 AI 리포트',
  monthly: '월간 AI 리포트',
};
const PDF_ORDER = ['weekly1', 'weekly2', 'monthly'];
const PHOTO_LABEL = {
  homework: { text: '숙제',      emoji: '📝' },
  test:     { text: '테스트',    emoji: '📋' },
  activity: { text: '학습/활동', emoji: '🎯' },
};

/* ─── 리포트 보기 패널 ─── */
function PDFPanel({ pdf }) {
  const [open, setOpen] = useState(false);
  const rawUrl = `/uploads/pdfs/${pdf.filename}`;
  const absoluteUrl = `${window.location.origin}${rawUrl}`;
  const label = PDF_LABEL[pdf.pdf_type] || pdf.pdf_type;
  const isImage = /\.(jpg|jpeg|png|webp)$/i.test(pdf.filename);

  return (
    <div style={{ marginBottom: 10 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          padding: '15px 18px',
          background: open ? '#2B3660' : 'white',
          border: `1.5px solid ${open ? '#7EC8E3' : '#E0DAD0'}`,
          borderRadius: open ? '12px 12px 0 0' : 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'all 0.2s',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42,
            background: open ? 'rgba(126,200,227,0.18)' : '#F0EBE3',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
          }}>{isImage ? '🖼️' : '📄'}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: open ? 'white' : '#2B3660' }}>{label}</div>
            <div style={{ fontSize: 12, color: open ? 'rgba(255,255,255,0.5)' : '#AAA', marginTop: 2 }}>
              {open ? '접으려면 다시 탭하세요' : '탭하면 바로 볼 수 있어요'}
            </div>
          </div>
        </div>
        <span style={{ color: open ? '#7EC8E3' : '#C0B8AE', fontSize: 14, flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div style={{
          border: '1.5px solid #7EC8E3',
          borderTop: 'none',
          borderRadius: '0 0 12px 12px',
          overflow: 'hidden',
          background: 'white',
          marginBottom: 0,
        }}>
          {isImage ? (
            <img src={rawUrl} alt={label} style={{ width: '100%', display: 'block' }} />
          ) : (
            <div style={{ padding: '14px' }}>
              <a href={absoluteUrl} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'block', padding: '14px', background: '#2B3660', color: 'white',
                  borderRadius: 10, textAlign: 'center', fontSize: 14, fontWeight: 700,
                  textDecoration: 'none',
                }}>
                📄 리포트 보기 ↗
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── 빈 PDF 슬롯 ─── */
function PDFEmpty({ type }) {
  return (
    <div style={{
      padding: '14px 18px',
      background: '#FAFAF8',
      border: '1.5px dashed #DDD8D0',
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 10,
      opacity: 0.65,
    }}>
      <div style={{
        width: 42, height: 42, background: '#F0EBE3', borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
      }}>📋</div>
      <div>
        <div style={{ fontSize: 14, color: '#888', fontWeight: 600 }}>{PDF_LABEL[type]}</div>
        <div style={{ fontSize: 12, color: '#BBB', marginTop: 2 }}>이번 기간에는 등록되지 않았습니다</div>
      </div>
    </div>
  );
}

/* ─── 이전 리포트 카드 ─── */
function PrevReportCard({ report }) {
  const [open, setOpen] = useState(false);
  const pdfs = report.pdfs || [];
  const photos = report.photos || [];
  const hw = HOMEWORK[report.homework_status];
  const att = ATTITUDE[report.attitude];
  const pdfMap = {};
  pdfs.forEach(p => { pdfMap[p.pdf_type] = p; });

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      marginBottom: 12, overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(43,54,96,0.06)',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', padding: '16px 18px', background: 'none', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', textAlign: 'left', fontFamily: 'inherit',
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#2B3660' }}>{report.period_title}</div>
          <div style={{ fontSize: 12, color: '#AAA', marginTop: 3 }}>
            {report.start_date} ~ {report.end_date}
          </div>
        </div>
        <span style={{ color: '#C0B8AE', fontSize: 16 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ padding: '0 18px 20px', borderTop: '1px solid #F0EBE3' }}>
          {pdfs.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#AAA', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>AI 리포트</div>
              {PDF_ORDER.map(t => pdfMap[t] ? <PDFPanel key={t} pdf={pdfMap[t]} /> : null)}
            </div>
          )}
          {report.comment && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#AAA', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>선생님 코멘트</div>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: '#2C2C2C', margin: 0, wordBreak: 'keep-all' }}>{report.comment}</p>
            </div>
          )}
          {(hw || att || report.test_result) && (
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {hw && <div><span style={{ padding: '5px 12px', background: hw.bg, color: hw.color, borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{hw.emoji} {hw.text}</span>{report.homework_comment && <div style={{ fontSize: 11, color: '#BBB', marginTop: 4, paddingLeft: 2 }}>{report.homework_comment}</div>}</div>}
              {att && <div><span style={{ padding: '5px 12px', background: att.bg, color: att.color, borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{att.emoji} {att.text}</span>{report.attitude_comment && <div style={{ fontSize: 11, color: '#BBB', marginTop: 4, paddingLeft: 2 }}>{report.attitude_comment}</div>}</div>}
              {report.test_result && <span style={{ padding: '5px 12px', background: '#EEF6FF', color: '#2B5CA0', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>📊 {report.test_result}</span>}
            </div>
          )}
          {photos.length > 0 && (
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {photos.map(ph => {
                const lbl = PHOTO_LABEL[ph.photo_type];
                return (
                  <div key={ph.id} style={{ borderRadius: 10, overflow: 'hidden' }}>
                    <img src={`/uploads/photos/${ph.filename}`} alt={lbl?.text}
                      style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                    <div style={{ padding: '5px 8px', background: '#F5F0E8', fontSize: 11, color: '#2B3660', fontWeight: 600 }}>
                      {lbl?.emoji} {lbl?.text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── 메인 컴포넌트 ─── */
export default function ParentView() {
  const { token, shareCode } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [consultOpen, setConsultOpen] = useState(false);

  useEffect(() => {
    // shareCode(짧은 코드) 또는 token(긴 UUID) 둘 다 지원
    const apiPath = shareCode
      ? `/api/public/${shareCode.toUpperCase()}`
      : `/api/public/${token}`;

    fetch(apiPath)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError('데이터를 불러오는 데 실패했습니다.');
        setLoading(false);
      });
  }, [token, shareCode]);

  /* 로딩 */
  if (loading) return (
    <div style={{
      background: '#F5F0E8', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16,
      fontFamily: "-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif",
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 44, height: 44, border: '3px solid #E8E0D5', borderTopColor: '#2B3660', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#AAA', fontSize: 14 }}>리포트를 불러오는 중...</p>
    </div>
  );

  /* 에러 */
  if (error) return (
    <div style={{
      background: '#F5F0E8', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, fontFamily: "-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif",
    }}>
      <div style={{ background: 'white', borderRadius: 20, padding: '40px 28px', textAlign: 'center', width: '100%', maxWidth: 360, boxShadow: '0 4px 20px rgba(43,54,96,0.1)' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
        <h2 style={{ color: '#2B3660', fontSize: 18, marginBottom: 10 }}>링크를 확인해주세요</h2>
        <p style={{ color: '#888', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{error}</p>
        <p style={{ color: '#C0B8AE', fontSize: 12, marginTop: 16 }}>링크가 만료되었다면 학원으로 문의해 주세요.</p>
      </div>
    </div>
  );

  const { student, reports } = data;
  const latest = reports[0] || null;
  const prev   = reports.slice(1);
  const pdfs   = latest?.pdfs  || [];
  const photos = latest?.photos || [];
  const pdfMap = {};
  pdfs.forEach(p => { pdfMap[p.pdf_type] = p; });
  const hw  = latest ? HOMEWORK[latest.homework_status] : null;
  const att = latest ? ATTITUDE[latest.attitude]        : null;
  const hasSummary = hw || att || latest?.test_result;
  const hasPhotos  = photos.length > 0;
  const hasPdfs    = pdfs.length > 0;

  return (
    <div style={{
      background: '#F5F0E8',
      minHeight: '100vh',
      maxWidth: 480,
      margin: '0 auto',
      fontFamily: "-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif",
      color: '#2C2C2C',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      `}</style>

      {/* ── 헤더 ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e2a4a 0%, #2B3660 60%, #1a3a5c 100%)',
        padding: '16px 20px 0',
        position: 'sticky', top: 0, zIndex: 50,
        overflow: 'hidden',
      }}>
        {/* 배경 장식 원 */}
        <div style={{ position: 'absolute', top: -30, right: 80, width: 100, height: 100, borderRadius: '50%', background: 'rgba(126,200,227,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 10, right: 30, width: 50, height: 50, borderRadius: '50%', background: 'rgba(126,200,227,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
        {/* 가로 구분선 장식 */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(126,200,227,0.4), transparent)', pointerEvents: 'none' }} />

        {/* 로고 + 기간 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30,
              background: 'linear-gradient(135deg, #7EC8E3, #B8E8D8)',
              borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 14, color: '#2B3660',
            }}>T</div>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>링키영어 진해남문점</span>
          </div>
          {latest && (
            <span style={{
              background: 'rgba(126,200,227,0.2)',
              border: '1px solid rgba(126,200,227,0.35)',
              borderRadius: 20, padding: '4px 12px',
              fontSize: 11, color: '#7EC8E3', fontWeight: 600,
            }}>
              {latest.start_date?.slice(5).replace('-', '/')} ~ {latest.end_date?.slice(5).replace('-', '/')}
            </span>
          )}
        </div>

        {/* 학생명 + 캐릭터 */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ paddingBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ color: 'white', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>
                {student.masked_name}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                {[student.grade, student.class_subject].filter(Boolean).join(' · ')}
              </span>
            </div>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                background: 'rgba(126,200,227,0.15)',
                border: '1px solid rgba(126,200,227,0.25)',
                borderRadius: 20, padding: '3px 10px',
                fontSize: 11, color: 'rgba(255,255,255,0.7)',
              }}>
                학습 리포트
              </span>
              {student.teacher && (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  담당 {student.teacher}
                </span>
              )}
            </div>
          </div>
          {/* 마스코트 - 하단 정렬, 전체 보이게 */}
          <img src="/쿼카얼굴.png" alt="" style={{ width: 88, height: 'auto', display: 'block', flexShrink: 0 }} />
        </div>
      </div>

      {/* ── 본문 ── */}
      <div style={{ padding: '20px 16px 120px' }}>

        {/* 리포트 없음 */}
        {!latest && (
          <div style={{
            background: 'white', borderRadius: 16,
            padding: '48px 24px', textAlign: 'center',
            boxShadow: '0 2px 10px rgba(43,54,96,0.06)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>📋</div>
            <p style={{ color: '#888', fontSize: 15, margin: 0 }}>아직 공개된 리포트가 없습니다.</p>
            <p style={{ color: '#C0B8AE', fontSize: 12, marginTop: 8 }}>
              리포트가 준비되면 이 페이지에서 확인하실 수 있어요.
            </p>
          </div>
        )}

        {latest && (
          <>
            {/* ①  핵심 요약 */}
            {hasSummary && (
              <div style={{
                background: 'white', borderRadius: 16,
                padding: '20px 18px', marginBottom: 14,
                boxShadow: '0 2px 10px rgba(43,54,96,0.07)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#2B3660', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                  📊 이번 달 요약
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {/* 숙제 */}
                  <div style={{
                    background: hw?.bg || '#F5F5F5',
                    border: `1.5px solid ${hw?.border || 'transparent'}`,
                    borderRadius: 12, padding: '12px 8px', textAlign: 'center',
                  }}>
                    <span style={{ fontSize: 22, display: 'block', marginBottom: 5, lineHeight: 1 }}>{hw?.emoji || '—'}</span>
                    <span style={{ fontSize: 10, color: '#888', fontWeight: 600, letterSpacing: '0.04em', display: 'block', marginBottom: 3 }}>숙제</span>
                    <div style={{ fontSize: 12, fontWeight: 700, color: hw?.color || '#888' }}>{hw?.text || '—'}</div>
                    {latest.homework_comment && <div style={{ fontSize: 10, color: '#BBB', marginTop: 5, lineHeight: 1.4 }}>{latest.homework_comment}</div>}
                  </div>
                  {/* 테스트 */}
                  <div style={{ background: '#EEF6FF', border: '1.5px solid #C5DCEF', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                    <span style={{ fontSize: 22, display: 'block', marginBottom: 5, lineHeight: 1 }}>📊</span>
                    <span style={{ fontSize: 10, color: '#888', fontWeight: 600, letterSpacing: '0.04em', display: 'block', marginBottom: 3 }}>단어 테스트</span>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#2B5CA0', lineHeight: 1.3 }}>
                      {latest.test_result || '—'}
                    </div>
                  </div>
                  {/* 태도 */}
                  <div style={{
                    background: att?.bg || '#F5F5F5',
                    border: '1.5px solid transparent',
                    borderRadius: 12, padding: '12px 8px', textAlign: 'center',
                  }}>
                    <span style={{ fontSize: 22, display: 'block', marginBottom: 5, lineHeight: 1 }}>{att?.emoji || '—'}</span>
                    <span style={{ fontSize: 10, color: '#888', fontWeight: 600, letterSpacing: '0.04em', display: 'block', marginBottom: 3 }}>수업 태도</span>
                    <div style={{ fontSize: 12, fontWeight: 700, color: att?.color || '#888' }}>{att?.text || '—'}</div>
                    {latest.attitude_comment && <div style={{ fontSize: 10, color: '#BBB', marginTop: 5, lineHeight: 1.4 }}>{latest.attitude_comment}</div>}
                  </div>
                </div>
              </div>
            )}

            {/* ②  본사 AI 리포트 (항상 표시) */}
            <div style={{
              background: 'white', borderRadius: 16,
              padding: '20px 18px', marginBottom: 14,
              boxShadow: '0 2px 10px rgba(43,54,96,0.07)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#2B3660', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                🤖 본사 AI 리포트
              </div>
              <p style={{ fontSize: 12, color: '#AAA', marginBottom: 14, lineHeight: 1.6 }}>
                버튼을 탭하면 리포트를 바로 확인할 수 있습니다.
              </p>
              {PDF_ORDER.map(type =>
                pdfMap[type]
                  ? <PDFPanel key={type} pdf={pdfMap[type]} />
                  : <PDFEmpty  key={type} type={type} />
              )}
            </div>

            {/* ③  선생님 코멘트 */}
            {latest.comment && (
              <div style={{
                background: 'white', borderRadius: 16,
                padding: '20px 18px', marginBottom: 14,
                boxShadow: '0 2px 10px rgba(43,54,96,0.07)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#2B3660', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                  💬 선생님 코멘트
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #F0F8FF 0%, #F5F0E8 100%)',
                  border: '1.5px solid rgba(43,54,96,0.1)',
                  borderRadius: 12, padding: '16px 18px',
                }}>
                  <p style={{ fontSize: 15, lineHeight: 1.85, color: '#2C2C2C', margin: 0, wordBreak: 'keep-all' }}>
                    {latest.comment}
                  </p>
                </div>
              </div>
            )}

            {/* ④  사진 기록 */}
            {hasPhotos && (
              <div style={{
                background: 'white', borderRadius: 16,
                padding: '20px 18px', marginBottom: 14,
                boxShadow: '0 2px 10px rgba(43,54,96,0.07)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#2B3660', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                  📸 수업 사진
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {photos.map(photo => {
                    const lbl = PHOTO_LABEL[photo.photo_type];
                    return (
                      <div key={photo.id} style={{
                        borderRadius: 12, overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(43,54,96,0.1)',
                      }}>
                        <div style={{
                          padding: '9px 14px', background: '#2B3660',
                          fontSize: 13, color: 'white', fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          {lbl?.emoji} {lbl?.text}
                        </div>
                        <img
                          src={`/uploads/photos/${photo.filename}`}
                          alt={lbl?.text}
                          loading="lazy"
                          style={{ width: '100%', display: 'block', maxHeight: 360, objectFit: 'cover' }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ⑤  보완할 점 */}
            {latest.improvement && (
              <div style={{
                background: 'white', borderRadius: 16,
                padding: '20px 18px', marginBottom: 14,
                boxShadow: '0 2px 10px rgba(43,54,96,0.07)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#2B3660', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
                  📌 이렇게 함께해 주세요
                </div>
                <div style={{
                  background: '#F9F6F0', border: '1px solid #E8E0D5',
                  borderRadius: 12, padding: '14px 16px',
                }}>
                  <p style={{ fontSize: 14, color: '#555', lineHeight: 1.8, margin: 0, wordBreak: 'keep-all' }}>
                    {latest.improvement}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ⑥  이전 리포트 */}
        {prev.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#AAA', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12, paddingLeft: 4 }}>
              이전 리포트
            </div>
            {prev.map(r => <PrevReportCard key={r.id} report={r} />)}
          </div>
        )}

        {/* 푸터 */}
        <div style={{ textAlign: 'center', paddingTop: 16, color: '#C0B8AE', fontSize: 11, lineHeight: 2.2 }}>
          <div style={{ fontWeight: 700 }}>링키영어 진해남문점</div>
          <div>궁금하신 점은 아래 버튼으로 편하게 연락 주세요.</div>
        </div>
      </div>

      {/* ── 하단 고정 버튼 ── */}
      <div style={{
        position: 'fixed', bottom: 0,
        left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: 'white',
        borderTop: '1px solid #E8E0D5',
        padding: '12px 16px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        display: 'flex', gap: 10, zIndex: 100,
      }}>
        <button
          onClick={() => setConsultOpen(true)}
          style={{
            flex: 1, padding: '15px',
            background: '#2B3660', color: 'white',
            border: 'none', borderRadius: 14,
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontFamily: 'inherit',
          }}
        >
          📞 전화 상담
        </button>
        <button
          onClick={() => setConsultOpen(true)}
          style={{
            flex: 1, padding: '15px',
            background: '#FEE500', color: '#3A1D1D',
            border: 'none', borderRadius: 14,
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontFamily: 'inherit',
          }}
        >
          💛 카카오 문의
        </button>
      </div>

      {/* ── 상담 바텀시트 ── */}
      {consultOpen && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(43,54,96,0.55)', zIndex: 200,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={e => e.target === e.currentTarget && setConsultOpen(false)}
        >
          <div style={{
            background: 'white', borderRadius: '24px 24px 0 0',
            padding: '10px 20px 36px',
            paddingBottom: 'calc(36px + env(safe-area-inset-bottom))',
            width: '100%', maxWidth: 480,
          }}>
            <div style={{ width: 36, height: 4, background: '#E0DAD0', borderRadius: 2, margin: '14px auto 24px' }} />
            <h3 style={{ fontWeight: 800, fontSize: 19, color: '#2B3660', marginBottom: 8 }}>상담 요청</h3>
            <p style={{ color: '#888', fontSize: 14, lineHeight: 1.8, marginBottom: 24 }}>
              아이의 학습에 관해 궁금하신 점이 있으시면<br />
              편하게 연락 주세요. 😊
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a href="tel:01020010590" style={{
                padding: '17px', background: '#2B3660', color: 'white',
                borderRadius: 14, textAlign: 'center', fontWeight: 700, fontSize: 16, display: 'block',
              }}>
                📞 전화하기
              </a>
              <a href="http://pf.kakao.com/_TdCExj" target="_blank" rel="noopener noreferrer"
                style={{
                  padding: '17px', background: '#FEE500', color: '#3A1D1D',
                  borderRadius: 14, textAlign: 'center', fontWeight: 700, fontSize: 16, display: 'block',
                }}>
                💛 카카오톡으로 문의하기
              </a>
              <button onClick={() => setConsultOpen(false)} style={{
                padding: '15px', background: '#F5F0E8', border: 'none',
                borderRadius: 14, color: '#888', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
