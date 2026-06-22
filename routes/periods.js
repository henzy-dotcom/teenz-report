const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // 전체 회차 목록 (최신순)
  router.get('/', (req, res) => {
    const periods = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM reports r WHERE r.period_id = p.id) as report_count,
        (SELECT COUNT(*) FROM reports r WHERE r.period_id = p.id AND r.completed = 1) as completed_count,
        (SELECT COUNT(*) FROM reports r WHERE r.period_id = p.id AND r.sent = 1) as sent_count
      FROM periods p
      ORDER BY p.start_date DESC
    `).all();
    res.json(periods);
  });

  // 회차 단건
  router.get('/:id', (req, res) => {
    const period = db.prepare('SELECT * FROM periods WHERE id = ?').get(req.params.id);
    if (!period) return res.status(404).json({ error: '회차를 찾을 수 없습니다.' });
    res.json(period);
  });

  // 회차 생성
  router.post('/', (req, res) => {
    const { title, start_date, end_date } = req.body;
    if (!start_date || !end_date) return res.status(400).json({ error: '기간은 필수입니다.' });

    const auto_title = title || `${start_date.slice(5).replace('-', '/')} ~ ${end_date.slice(5).replace('-', '/')} 리포트`;
    const result = db.prepare(`
      INSERT INTO periods (title, start_date, end_date) VALUES (?, ?, ?)
    `).run(auto_title, start_date, end_date);

    // 재원 중인 학생들에 대해 빈 리포트 자동 생성
    const activeStudents = db.prepare("SELECT id FROM students WHERE status = 'active'").all();
    const insertReport = db.prepare(`
      INSERT OR IGNORE INTO reports (student_id, period_id, published, completed, sent)
      VALUES (?, ?, 0, 0, 0)
    `);
    for (const s of activeStudents) {
      insertReport.run(s.id, result.lastInsertRowid);
    }

    res.status(201).json(db.prepare('SELECT * FROM periods WHERE id = ?').get(result.lastInsertRowid));
  });

  // 회차 수정
  router.put('/:id', (req, res) => {
    const { title, start_date, end_date } = req.body;
    const period = db.prepare('SELECT * FROM periods WHERE id = ?').get(req.params.id);
    if (!period) return res.status(404).json({ error: '회차를 찾을 수 없습니다.' });

    db.prepare(`
      UPDATE periods SET title = ?, start_date = ?, end_date = ? WHERE id = ?
    `).run(title ?? period.title, start_date ?? period.start_date, end_date ?? period.end_date, req.params.id);

    res.json(db.prepare('SELECT * FROM periods WHERE id = ?').get(req.params.id));
  });

  // 회차 삭제
  router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM periods WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  return router;
};
