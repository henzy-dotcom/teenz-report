const express = require('express');
const router = express.Router();

module.exports = (db) => {
  router.get('/period/:periodId', (req, res) => {
    const reports = db.prepare(`
      SELECT r.*,
        s.name, s.grade, s.class_subject, s.teacher, s.parent_phone,
        s.consent_photo, s.share_token, s.share_code, s.share_active,
        s.status as student_status,
        (SELECT COUNT(*) FROM report_pdfs p WHERE p.report_id = r.id) as pdf_count,
        (SELECT COUNT(*) FROM report_photos ph WHERE ph.report_id = r.id) as photo_count,
        (SELECT filename FROM report_pdfs p WHERE p.report_id = r.id AND p.pdf_type = 'weekly1' LIMIT 1) as pdf_weekly1,
        (SELECT filename FROM report_pdfs p WHERE p.report_id = r.id AND p.pdf_type = 'weekly2' LIMIT 1) as pdf_weekly2,
        (SELECT filename FROM report_pdfs p WHERE p.report_id = r.id AND p.pdf_type = 'monthly' LIMIT 1) as pdf_monthly
      FROM reports r
      JOIN students s ON s.id = r.student_id
      WHERE r.period_id = ?
      ORDER BY s.class_subject ASC, s.name ASC
    `).all(req.params.periodId);
    res.json(reports);
  });

  router.get('/period/:periodId/student/:studentId', (req, res) => {
    const { periodId, studentId } = req.params;
    let report = db.prepare(`
      SELECT r.*, s.name, s.grade, s.class_subject, s.teacher,
        s.parent_phone, s.consent_photo, s.share_token, s.share_code,
        s.status as student_status
      FROM reports r
      JOIN students s ON s.id = r.student_id
      WHERE r.period_id = ? AND r.student_id = ?
    `).get(periodId, studentId);

    if (!report) {
      db.prepare(`
        INSERT OR IGNORE INTO reports (student_id, period_id, published, completed, sent)
        VALUES (?, ?, 0, 0, 0)
      `).run(studentId, periodId);
      report = db.prepare(`
        SELECT r.*, s.name, s.grade, s.class_subject, s.teacher,
          s.parent_phone, s.consent_photo, s.share_token, s.share_code,
          s.status as student_status
        FROM reports r
        JOIN students s ON s.id = r.student_id
        WHERE r.period_id = ? AND r.student_id = ?
      `).get(periodId, studentId);
    }

    const pdfs = db.prepare('SELECT * FROM report_pdfs WHERE report_id = ? ORDER BY pdf_type').all(report.id);
    const photos = db.prepare('SELECT * FROM report_photos WHERE report_id = ?').all(report.id);
    res.json({ ...report, pdfs, photos });
  });

  router.put('/period/:periodId/student/:studentId', (req, res) => {
    const { periodId, studentId } = req.params;
    const { comment, homework_status, homework_comment, test_result, attitude, attitude_comment, improvement, published, completed, sent } = req.body;

    let report = db.prepare('SELECT id FROM reports WHERE period_id = ? AND student_id = ?').get(periodId, studentId);
    if (!report) {
      db.prepare('INSERT OR IGNORE INTO reports (student_id, period_id, published, completed, sent) VALUES (?, ?, 0, 0, 0)').run(studentId, periodId);
      report = db.prepare('SELECT id FROM reports WHERE period_id = ? AND student_id = ?').get(periodId, studentId);
    }

    db.prepare(`
      UPDATE reports SET
        comment = ?, homework_status = ?, homework_comment = ?, test_result = ?,
        attitude = ?, attitude_comment = ?, improvement = ?,
        published = ?, completed = ?, sent = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      comment ?? '', homework_status ?? '', homework_comment ?? '', test_result ?? '',
      attitude ?? '', attitude_comment ?? '', improvement ?? '',
      published ? 1 : 0, completed ? 1 : 0, sent ? 1 : 0,
      report.id
    );
    res.json({ ok: true, id: report.id });
  });

  router.post('/period/:periodId/student/:studentId/toggle-sent', (req, res) => {
    const report = db.prepare('SELECT * FROM reports WHERE period_id = ? AND student_id = ?').get(req.params.periodId, req.params.studentId);
    if (!report) return res.status(404).json({ error: '리포트 없음' });
    const newSent = report.sent ? 0 : 1;
    db.prepare('UPDATE reports SET sent = ? WHERE id = ?').run(newSent, report.id);
    res.json({ sent: !!newSent });
  });

  router.get('/student/:studentId/prev', (req, res) => {
    const { studentId } = req.params;
    const { currentPeriodId } = req.query;
    const report = db.prepare(`
      SELECT r.* FROM reports r
      JOIN periods p ON p.id = r.period_id
      WHERE r.student_id = ? AND r.period_id != ?
      ORDER BY p.start_date DESC
      LIMIT 1
    `).get(studentId, currentPeriodId || 0);
    if (!report) return res.status(404).json({ error: '이전 기간 없음' });
    res.json(report);
  });

  router.get('/period/:periodId/stats', (req, res) => {
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(completed) as completed,
        SUM(sent) as sent,
        SUM(published) as published,
        SUM(CASE WHEN pdf_count > 0 THEN 1 ELSE 0 END) as has_pdf,
        SUM(CASE WHEN photo_count > 0 THEN 1 ELSE 0 END) as has_photo
      FROM (
        SELECT r.completed, r.sent, r.published,
          (SELECT COUNT(*) FROM report_pdfs p WHERE p.report_id = r.id) as pdf_count,
          (SELECT COUNT(*) FROM report_photos ph WHERE ph.report_id = r.id) as photo_count
        FROM reports r WHERE r.period_id = ?
      )
    `).get(req.params.periodId);
    res.json(stats);
  });

  return router;
};
