const express = require('express');
const router = express.Router();

function maskName(name) {
  if (!name) return '';
  if (name.length <= 2) return name[0] + '*';
  return name[0] + name.slice(1, -1).replace(/./g, '*') + name[name.length - 1];
}

function buildResponse(db, student) {
  if (!student) return null;
  if (!student.share_active) return { error: '링크가 비활성화되었습니다.' };
  if (student.status === 'withdrawn') return { error: '해당 링크는 더 이상 사용할 수 없습니다.' };

  const reports = db.prepare(`
    SELECT r.*, p.title as period_title, p.start_date, p.end_date
    FROM reports r
    JOIN periods p ON p.id = r.period_id
    WHERE r.student_id = ? AND r.published = 1
    ORDER BY p.start_date DESC
  `).all(student.id);

  const enriched = reports.map(r => {
    const pdfs = db.prepare('SELECT * FROM report_pdfs WHERE report_id = ? ORDER BY pdf_type').all(r.id);
    const photos = student.consent_photo
      ? db.prepare('SELECT * FROM report_photos WHERE report_id = ?').all(r.id)
      : [];
    return { ...r, pdfs, photos };
  });

  return {
    student: {
      masked_name: student.name,
      grade: student.grade,
      class_subject: student.class_subject,
      teacher: student.teacher,
      consent_photo: student.consent_photo,
    },
    reports: enriched,
  };
}

module.exports = (db) => {
  // 긴 토큰 기반 (기존 URL: /report/:token)
  router.get('/token/:token', (req, res) => {
    const student = db.prepare(
      'SELECT * FROM students WHERE share_token = ?'
    ).get(req.params.token);
    if (!student) return res.status(404).json({ error: '링크가 유효하지 않습니다.' });
    const result = buildResponse(db, student);
    if (result?.error) return res.status(403).json(result);
    res.json(result);
  });

  // 짧은 코드 기반 (새 URL: /r/:shareCode)
  router.get('/code/:code', (req, res) => {
    const student = db.prepare(
      'SELECT * FROM students WHERE share_code = ?'
    ).get(req.params.code.toUpperCase());
    if (!student) return res.status(404).json({ error: '링크가 유효하지 않습니다.' });
    const result = buildResponse(db, student);
    if (result?.error) return res.status(403).json(result);
    res.json(result);
  });

  // 기존 경로 호환 (/api/public/:token)
  router.get('/:token', (req, res) => {
    // 6~8자면 shareCode, 길면 share_token
    const val = req.params.token;
    let student;
    if (val.length <= 8) {
      student = db.prepare('SELECT * FROM students WHERE share_code = ?').get(val.toUpperCase());
    } else {
      student = db.prepare('SELECT * FROM students WHERE share_token = ?').get(val);
    }
    if (!student) return res.status(404).json({ error: '링크가 유효하지 않습니다.' });
    const result = buildResponse(db, student);
    if (result?.error) return res.status(403).json(result);
    res.json(result);
  });

  return router;
};
