const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // 해당 월 출결 현황 — 학생별 날짜 기록 포함
  router.get('/:yearMonth', (req, res) => {
    const { yearMonth } = req.params;
    const students = db.prepare(`SELECT * FROM students WHERE status = 'active' ORDER BY class_subject, name`).all();
    const records = db.prepare(`
      SELECT * FROM attendance_dates
      WHERE substr(date, 1, 7) = ?
      ORDER BY date ASC
    `).all(yearMonth);
    const legacy = db.prepare(`SELECT * FROM attendance WHERE year_month = ?`).all(yearMonth);

    const recordsByStudent = {};
    records.forEach(r => {
      (recordsByStudent[r.student_id] ||= []).push(r);
    });
    const legacyByStudent = {};
    legacy.forEach(l => { legacyByStudent[l.student_id] = l; });

    res.json(students.map(s => {
      const recs = recordsByStudent[s.id] || [];
      const absent = recs.filter(r => r.type === 'absent').length;
      const makeup = recs.filter(r => r.type === 'makeup').length;
      const leg = legacyByStudent[s.id];
      // 이 달에 날짜 기록이 하나도 없을 때만 예전 카운터 값을 "날짜 미상"으로 얹어서 보여줌 (데이터 유실 방지)
      const legacyAbsent = recs.length === 0 && leg ? (leg.absent || 0) : 0;
      const legacyMakeup = recs.length === 0 && leg ? (leg.makeup || 0) : 0;
      return {
        ...s,
        records: recs,
        absent,
        makeup,
        legacyAbsent,
        legacyMakeup,
      };
    }));
  });

  // 결석/보충 기록 추가 (날짜 지정)
  router.post('/:yearMonth/:studentId', (req, res) => {
    const { studentId } = req.params;
    const { type, date, memo } = req.body;
    if (!['absent', 'makeup'].includes(type)) {
      return res.status(400).json({ error: 'invalid type' });
    }
    const d = date || new Date().toISOString().slice(0, 10);
    const info = db.prepare(`
      INSERT INTO attendance_dates (student_id, type, date, memo)
      VALUES (?, ?, ?, ?)
    `).run(studentId, type, d, memo || '');
    const record = db.prepare(`SELECT * FROM attendance_dates WHERE id = ?`).get(info.lastInsertRowid);
    res.json(record);
  });

  // 기록 삭제 (잘못 등록한 날짜 취소)
  router.delete('/record/:id', (req, res) => {
    db.prepare(`DELETE FROM attendance_dates WHERE id = ?`).run(req.params.id);
    res.json({ ok: true });
  });

  return router;
};
