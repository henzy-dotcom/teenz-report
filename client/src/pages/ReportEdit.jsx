import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ToastContext } from '../App.jsx';
import PhotoUpload from '../components/PhotoUpload.jsx';
import { PDFViewerButton } from '../components/PDFViewer.jsx';

const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;

const HOMEWORK_OPTIONS = [
  { value: 'done',    label: '완료',     color: '#059669', bg: '#D1FAE5' },
  { value: 'partial', label: '일부 완료', color: '#D97706', bg: '#FEF3C7' },
  { value: 'poor',    label: '미흡',     color: '#DC2626', bg: '#FEE2E2' },
  { value: 'none',    label: '미제출',   color: '#9CA3AF', bg: '#F3F4F6' },
];

const ATTITUDE_OPTIONS = [
  { value: 'active',      label: '적극적',   color: '#059669', bg: '#D1FAE5' },
  { value: 'normal',      label: '보통',     color: '#6B7280', bg: '#F3F4F6' },
  { value: 'needs_focus', label: '집중 필요', color: '#DC2626', bg: '#FEE2E2' },
];

const PDF_TYPES = [
  { type: 'weekly1', label: '주간 AI 리포트 1' },
  { type: 'weekly2', label: '주간 AI 리포트 2' },
  { type: 'monthly', label: '월간 AI 리포트' },
];

/* 선택 칩 그룹 */
function SelectGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)} style={{
            padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
            fontSize: 13, cursor: 'pointer', fontWeight: active ? 700 : 500,
            background:  active ? opt.bg   : '#fff',
            borderColor: active ? opt.color : '#E5E7EB',
            color:       active ? opt.color : '#9CA3AF',
            transition: 'all 0.15s',
          }}>{opt.label}</button>
        );
      })}
    </div>
  );
}

/* PDF 업로드 행 */
function PDFUploadRow({ label, pdfType, reportId, existing, onRefresh }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const showToast = useContext(ToastContext);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') { showToast('PDF 파일만 업로드할 수 있습니다.', 'error'); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res  = await fetch(`/api/upload/pdf/${reportId}/${pdfType}`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`${label} 업로드 완료`);
      onRefresh();
    } catch (err) {
      showToast('업로드 실패: ' + err.message, 'error');
    } finally { setUploading(false); }
  }

  async function handleDelete() {
    if (!confirm(`${label}를 삭제할까요?`)) return;
    await fetch(`/api/upload/pdf/${reportId}/${pdfType}`, { method: 'DELETE' });
    showToast('삭제했습니다.', 'info');
    onRefresh();
  }

  return (
    <div style={{
      padding: '12px 14px', background: existing ? '#F0FDF4' : '#FAFAFA',
      border: `1px solid ${existing ? '#A7F3D0' : '#E5E7EB'}`,
      borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        {existing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ color: '#059669', fontSize: 13 }}>✓</span>
            <span style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
              {existing.original_name || '파일 업로드됨'}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>미업로드</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {existing && <PDFViewerButton pdf={existing} isAdmin />}
        <button className="btn btn-secondary btn-sm" onClick={() => inputRef.current.click()} disabled={uploading}>
          {uploading ? <span className="spinner" /> : existing ? '교체' : '+ 업로드'}
        </button>
        {existing && <button className="btn btn-danger btn-sm" onClick={handleDelete}>삭제</button>}
      </div>
      <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

/* 상태 칩 */
function StatusChip({ label, active, color, bg, borderColor }) {
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, padding: '3px 12px', borderRadius: 20,
      border: `1px solid ${active ? borderColor : '#E5E7EB'}`,
      background: active ? bg : '#F9FAFB',
      color: active ? color : '#9CA3AF',
    }}>{label}</span>
  );
}

export default function ReportEdit() {
  const { periodId, studentId } = useParams();
  const navigate  = useNavigate();
  const showToast = useContext(ToastContext);
  const [data, setData]     = useState(null);
  const [period, setPeriod] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm]     = useState({
    comment: '', homework_status: '', test_result: '',
    attitude: '', improvement: '', published: false, completed: false, sent: false,
  });
  const [photos, setPhotos] = useState({ homework: null, test: null, activity: null });
  const [pdfs, setPdfs]     = useState({ weekly1: null, weekly2: null, monthly: null });

  async function loadReport() {
    const [r, p] = await Promise.all([
      fetch(`/api/reports/period/${periodId}/student/${studentId}`).then(r => r.json()),
      fetch(`/api/periods/${periodId}`).then(r => r.json()),
    ]);
    setData(r);
    setPeriod(p);
    setForm({
      comment: r.comment || '', homework_status: r.homework_status || '',
      test_result: r.test_result || '', attitude: r.attitude || '',
      improvement: r.improvement || '', published: !!r.published,
      completed: !!r.completed, sent: !!r.sent,
    });
    const photoMap = { homework: null, test: null, activity: null };
    (r.photos || []).forEach(ph => { photoMap[ph.photo_type] = ph.filename; });
    setPhotos(photoMap);
    const pdfMap = { weekly1: null, weekly2: null, monthly: null };
    (r.pdfs || []).forEach(pd => { pdfMap[pd.pdf_type] = pd; });
    setPdfs(pdfMap);
  }

  useEffect(() => { loadReport(); }, [periodId, studentId]);

  async function handleSave(overrides = {}) {
    setSaving(true);
    const body = { ...form, ...overrides };
    const res  = await fetch(`/api/reports/period/${periodId}/student/${studentId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!res.ok) { showToast('저장 실패', 'error'); setSaving(false); return; }
    setForm(prev => ({ ...prev, ...overrides }));
    showToast('저장했습니다.');
    setSaving(false);
  }

  async function handleComplete() {
    await handleSave({ completed: true, published: true });
    showToast('작성 완료 처리 및 공개 설정했습니다.', 'success');
  }

  if (!data || !period) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <span className="spinner" />
    </div>
  );

  const shareLink = data.share_code ? `${PUBLIC_BASE}/r/${data.share_code}` : `${PUBLIC_BASE}/report/${data.share_token}`;
  function makeMsg() {
    return `${data.name} 학부모님, 안녕하세요.\n링키영어 진해남문점입니다🍀\n\n${period.title} 학습 리포트를 공유드립니다.\n아래 링크에서 확인하실 수 있습니다. 😊\n\n${shareLink}`;
  }

  /* 라이트 UI 스타일 상수 */
  const S = {
    card:     { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
    sTitle:   { fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 },
  };

  return (
    <div className="page-container" style={{ maxWidth: 900 }}>

      {/* 헤더 */}
      <div className="page-header">
        <div>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 13, cursor: 'pointer', marginBottom: 6, padding: 0 }}>
            ← 대시보드
          </button>
          <h1 className="page-title">{data.name} 리포트 편집</h1>
          <p className="page-subtitle">{period.title} · {period.start_date} ~ {period.end_date}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!form.completed && (
            <button className="btn btn-success" onClick={handleComplete}>✓ 작성 완료 &amp; 공개</button>
          )}
          <button className="btn btn-primary" onClick={() => handleSave()} disabled={saving}>
            {saving ? <span className="spinner" /> : '저장'}
          </button>
        </div>
      </div>

      {/* 상태 칩 행 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatusChip label={form.completed ? '작성완료' : '작성중'} active={form.completed}  color="#059669" bg="#D1FAE5" borderColor="#A7F3D0" />
        <StatusChip label={form.published ? '공개중'   : '비공개'} active={form.published}  color="#1D4ED8" bg="#DBEAFE" borderColor="#BFDBFE" />
        <StatusChip label={form.sent      ? '발송됨'   : '미발송'} active={form.sent}       color="#D97706" bg="#FEF3C7" borderColor="#FDE68A" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* ── 왼쪽 컬럼 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* AI 리포트 업로드 */}
          <div style={S.card}>
            <div style={S.sTitle}>본사 AI 리포트</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PDF_TYPES.map(({ type, label }) => (
                <PDFUploadRow key={type} label={label} pdfType={type} reportId={data.id} existing={pdfs[type]} onRefresh={loadReport} />
              ))}
            </div>
          </div>

          {/* 학원 코멘트 */}
          <div style={S.card}>
            <div style={S.sTitle}>학원 코멘트</div>
            <textarea
              className="input"
              value={form.comment}
              onChange={e => setForm(p => ({ ...p, comment: e.target.value }))}
              placeholder="학부모님께 전달할 코멘트를 작성해주세요."
              style={{ minHeight: 110 }}
            />
          </div>

          {/* 평가 항목 */}
          <div style={S.card}>
            <div style={S.sTitle}>평가 항목</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">숙제 상태</label>
                <SelectGroup options={HOMEWORK_OPTIONS} value={form.homework_status} onChange={v => setForm(p => ({ ...p, homework_status: v }))} />
              </div>
              <div>
                <label className="label">수업 태도</label>
                <SelectGroup options={ATTITUDE_OPTIONS} value={form.attitude} onChange={v => setForm(p => ({ ...p, attitude: v }))} />
              </div>
              <div>
                <label className="label">테스트 / 단어 평가</label>
                <input className="input" value={form.test_result} onChange={e => setForm(p => ({ ...p, test_result: e.target.value }))} placeholder="예: 단어 테스트 92점 (23/25)" />
              </div>
              <div>
                <label className="label">보완할 점</label>
                <textarea className="input" value={form.improvement} onChange={e => setForm(p => ({ ...p, improvement: e.target.value }))} placeholder="보완이 필요한 부분을 작성해주세요." style={{ minHeight: 72 }} />
              </div>
            </div>
          </div>

          {/* 발송 관리 */}
          <div style={S.card}>
            <div style={S.sTitle}>발송 관리</div>
            {PUBLIC_BASE.includes('localhost') && (
              <div style={{ fontSize: 11, color: '#92400E', padding: '6px 10px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, marginBottom: 10 }}>
                ⚠️ localhost 링크는 학부모 휴대폰에서 열리지 않습니다. 배포 후 VITE_PUBLIC_BASE_URL을 설정하세요.
              </div>
            )}
            <pre style={{ fontSize: 12.5, color: '#374151', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.75, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '12px 14px', marginBottom: 12, fontFamily: "-apple-system,'Apple SD Gothic Neo',sans-serif" }}>
              {makeMsg()}
            </pre>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard.writeText(makeMsg()); showToast('카톡 발송 문구 복사됨'); }}>
                💬 카톡 문구 복사
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard.writeText(shareLink); showToast('링크 복사됨'); }}>
                🔗 링크만 복사
              </button>
              <button className={`btn btn-sm ${form.sent ? 'btn-success' : 'btn-secondary'}`} onClick={() => handleSave({ sent: !form.sent })}>
                {form.sent ? '✓ 발송완료' : '발송완료 체크'}
              </button>
            </div>
          </div>
        </div>

        {/* ── 오른쪽 컬럼 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* 사진 기록 */}
          <div style={S.card}>
            <div style={S.sTitle}>사진 기록</div>
            {!data.consent_photo && (
              <div style={{ padding: '8px 12px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 12, color: '#92400E', marginBottom: 10 }}>
                ⚠️ 사진 공개 동의가 없습니다. 업로드해도 학부모 화면에 표시되지 않습니다.
              </div>
            )}
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 10, padding: '6px 10px', background: '#F9FAFB', borderRadius: 6, border: '1px solid #E5E7EB' }}>
              📌 다른 학생의 얼굴이 포함된 사진을 올리지 않도록 주의해주세요.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { type: 'homework', label: '숙제 사진' },
                { type: 'test',     label: '테스트 사진' },
                { type: 'activity', label: '학습/활동 사진' },
              ].map(({ type, label }) => (
                <PhotoUpload key={type} reportId={data.id} photoType={type}
                  existingFilename={photos[type]} consentPhoto={!!data.consent_photo}
                  onUploaded={filename => { setPhotos(prev => ({ ...prev, [type]: filename })); showToast(`${label} 업로드 완료`); }}
                  onDeleted={() => setPhotos(prev => ({ ...prev, [type]: null }))} />
              ))}
            </div>
          </div>

          {/* 공개 설정 */}
          <div style={S.card}>
            <div style={S.sTitle}>공개 설정</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { field: 'published', label: '학부모에게 공개', desc: '공개된 리포트만 학부모 화면에 표시됩니다.' },
                { field: 'completed', label: '작성 완료',       desc: '완료 표시만 하고 공개는 별도로 설정할 수 있습니다.' },
              ].map(({ field, label, desc }) => (
                <label key={field} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.checked }))}
                    style={{ marginTop: 2, accentColor: '#2B3660', width: 14, height: 14, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, color: '#2C2C2C', fontWeight: 500 }}>{label}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 학부모 링크 */}
          <div style={S.card}>
            <div style={S.sTitle}>학부모 화면 링크</div>
            {data.share_code ? (
              <>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 2 }}>
                  {PUBLIC_BASE}/r/<span style={{ color: '#1D4ED8', fontWeight: 700, fontFamily: 'monospace', fontSize: 14 }}>{data.share_code}</span>
                </div>
                <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 10 }}>짧은 링크 (권장)</div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: '#6B7280', wordBreak: 'break-all', marginBottom: 10 }}>
                {shareLink}
              </div>
            )}
            <a href={data.share_code ? `/r/${data.share_code}` : `/report/${data.share_token}`}
              target="_blank" rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', justifyContent: 'center' }}>
              학부모 화면 미리보기 →
            </a>
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div style={{ marginTop: 28, display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #E5E7EB', paddingTop: 20 }}>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>목록으로</button>
        {!form.completed && <button className="btn btn-success" onClick={handleComplete}>✓ 작성 완료 &amp; 공개</button>}
        <button className="btn btn-primary" onClick={() => handleSave()} disabled={saving}>
          {saving ? <span className="spinner" /> : '저장'}
        </button>
      </div>
    </div>
  );
}
