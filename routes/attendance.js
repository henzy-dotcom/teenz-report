const express = require('express');
const router = express.Router();

module.exports = (db) => {
  router.get('/:yearMonth', (req, res) => {
    const students = db.prepare(`SELECT * FROM students WHERE status = 'active' ORDER BY class_subject, name`).all();
    const records = db.prepare(`SELECT * FROM attendance WHERE year_month = ?`).all(req.params.yearMonth);
    const map = {};
    records.forEach(r => { map[r.student_id] = r; });
    res.json(students.map(s => ({
      ...s,
      absent: map[s.id]?.absent ?? 0,
      makeup: map[s.id]?.makeup ?? 0,
    })));
  });

  router.put('/:yearMonth/:studentId', (req, res) => {
    const { yearMonth, studentId } = req.params;
    const { absent, makeup } = req.body;
    db.prepare(`
      INSERT INTO attendance (student_id, year_month, absent, makeup)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(student_id, year_month) DO UPDATE SET
        absent = excluded.absent,
        makeup = excluded.makeup,
        updated_at = CURRENT_TIMESTAMP
    `).run(studentId, yearMonth, absent ?? 0, makeup ?? 0);
    res.json({ ok: true });
  });

  return router;
};
