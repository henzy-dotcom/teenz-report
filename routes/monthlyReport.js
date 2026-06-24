const express = require('express');
const router = express.Router();

const DEFAULT_CHECKLIST = [
  '이번 달 교재 안내 발송',
  '월말 리포트 발송',
  '수업 영상 발송',
  '상담 필요 학생 확인',
  '숙제 미흡 학생 확인',
  '장기 결석 학생 확인',
  '퇴원 위험 학생 확인',
];

const DEFAULT_PROMOTIONS = [
  { name: '인스타 업로드', target: 5, sort_order: 0 },
  { name: '블로그 업로드', target: 2, sort_order: 1 },
  { name: '지역카페 업로드', target: 2, sort_order: 2 },
  { name: '대면 홍보', target: 1, sort_order: 3 },
];

function getReport(db, id) {
  const r = db.prepare('SELECT * FROM monthly_reports WHERE id = ?').get(id);
  if (!r) return null;
  r.new_students = db.prepare('SELECT * FROM mr_new_students WHERE report_id = ? ORDER BY id').all(id);
  r.withdrawn_students = db.prepare('SELECT * FROM mr_withdrawn_students WHERE report_id = ? ORDER BY id').all(id);
  r.expenses = db.prepare('SELECT * FROM mr_expenses WHERE report_id = ? ORDER BY id').all(id);
  r.checklist = db.prepare('SELECT * FROM mr_checklist WHERE report_id = ? ORDER BY id').all(id);
  r.promotions = db.prepare('SELECT * FROM mr_promotions WHERE report_id = ? ORDER BY sort_order').all(id);
  return r;
}

module.exports = (db) => {
  // 목록
  router.get('/', (req, res) => {
    const reports = db.prepare('SELECT * FROM monthly_reports ORDER BY year_month DESC').all();
    const result = reports.map(r => {
      const expenses = db.prepare('SELECT SUM(amount) as total FROM mr_expenses WHERE report_id = ?').get(r.id);
      const promos = db.prepare('SELECT * FROM mr_promotions WHERE report_id = ?').all(r.id);
      const totalTarget = promos.reduce((s, p) => s + p.target, 0);
      const totalActual = promos.reduce((s, p) => s + p.actual, 0);
      const expenseTotal = expenses.total || 0;
      return {
        ...r,
        expense_total: expenseTotal,
        revenue_excl_textbook: r.total_revenue - r.textbook_fee,
        net_revenue: r.total_revenue - r.textbook_fee - expenseTotal,
        promo_rate: totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0,
      };
    });
    res.json(result);
  });

  // 단일 조회
  router.get('/:id', (req, res) => {
    const r = getReport(db, req.params.id);
    if (!r) return res.status(404).json({ error: '없음' });
    res.json(r);
  });

  // 생성
  router.post('/', (req, res) => {
    const { year_month } = req.body;
    if (!year_month) return res.status(400).json({ error: 'year_month 필요' });
    const existing = db.prepare('SELECT id FROM monthly_reports WHERE year_month = ?').get(year_month);
    if (existing) return res.status(400).json({ error: '이미 존재합니다.' });

    const result = db.prepare('INSERT INTO monthly_reports (year_month) VALUES (?)').run(year_month);
    const id = result.lastInsertRowid;

    // 기본 체크리스트 삽입
    const insCheck = db.prepare('INSERT INTO mr_checklist (report_id, item_key) VALUES (?, ?)');
    for (const key of DEFAULT_CHECKLIST) insCheck.run(id, key);

    // 기본 홍보 항목 삽입
    const insPromo = db.prepare('INSERT INTO mr_promotions (report_id, name, target, sort_order) VALUES (?, ?, ?, ?)');
    for (const p of DEFAULT_PROMOTIONS) insPromo.run(id, p.name, p.target, p.sort_order);

    res.status(201).json(getReport(db, id));
  });

  // 기본 정보 수정
  router.put('/:id', (req, res) => {
    const r = db.prepare('SELECT * FROM monthly_reports WHERE id = ?').get(req.params.id);
    if (!r) return res.status(404).json({ error: '없음' });
    const fields = ['status','enrolled_count','new_count','withdrawn_count','total_revenue','textbook_fee',
      'unpaid_memo','refund_memo','settlement_memo','reflection_good','reflection_bad','reflection_next','reflection_memo'];
    const updates = [];
    const vals = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); vals.push(req.body[f]); }
    }
    if (updates.length === 0) return res.json(getReport(db, req.params.id));
    updates.push('updated_at = CURRENT_TIMESTAMP');
    vals.push(req.params.id);
    db.prepare(`UPDATE monthly_reports SET ${updates.join(', ')} WHERE id = ?`).run(...vals);
    res.json(getReport(db, req.params.id));
  });

  // 신규생 추가
  router.post('/:id/new-students', (req, res) => {
    const { name, grade, class_subject, note } = req.body;
    if (!name) return res.status(400).json({ error: '이름 필요' });
    const r = db.prepare('INSERT INTO mr_new_students (report_id, name, grade, class_subject, note) VALUES (?,?,?,?,?)').run(req.params.id, name, grade||'', class_subject||'', note||'');
    res.status(201).json(db.prepare('SELECT * FROM mr_new_students WHERE id = ?').get(r.lastInsertRowid));
  });
  router.delete('/:id/new-students/:sid', (req, res) => {
    db.prepare('DELETE FROM mr_new_students WHERE id = ? AND report_id = ?').run(req.params.sid, req.params.id);
    res.json({ ok: true });
  });

  // 퇴원생 추가
  router.post('/:id/withdrawn-students', (req, res) => {
    const { name, grade, reason, note } = req.body;
    if (!name) return res.status(400).json({ error: '이름 필요' });
    const r = db.prepare('INSERT INTO mr_withdrawn_students (report_id, name, grade, reason, note) VALUES (?,?,?,?,?)').run(req.params.id, name, grade||'', reason||'', note||'');
    res.status(201).json(db.prepare('SELECT * FROM mr_withdrawn_students WHERE id = ?').get(r.lastInsertRowid));
  });
  router.delete('/:id/withdrawn-students/:sid', (req, res) => {
    db.prepare('DELETE FROM mr_withdrawn_students WHERE id = ? AND report_id = ?').run(req.params.sid, req.params.id);
    res.json({ ok: true });
  });

  // 지출 항목
  router.post('/:id/expenses', (req, res) => {
    const { name, amount, memo } = req.body;
    if (!name) return res.status(400).json({ error: '지출명 필요' });
    const r = db.prepare('INSERT INTO mr_expenses (report_id, name, amount, memo) VALUES (?,?,?,?)').run(req.params.id, name, amount||0, memo||'');
    res.status(201).json(db.prepare('SELECT * FROM mr_expenses WHERE id = ?').get(r.lastInsertRowid));
  });
  router.put('/:id/expenses/:eid', (req, res) => {
    const { name, amount, memo } = req.body;
    db.prepare('UPDATE mr_expenses SET name=?, amount=?, memo=? WHERE id=? AND report_id=?').run(name, amount||0, memo||'', req.params.eid, req.params.id);
    res.json(db.prepare('SELECT * FROM mr_expenses WHERE id = ?').get(req.params.eid));
  });
  router.delete('/:id/expenses/:eid', (req, res) => {
    db.prepare('DELETE FROM mr_expenses WHERE id = ? AND report_id = ?').run(req.params.eid, req.params.id);
    res.json({ ok: true });
  });

  // 체크리스트
  router.put('/:id/checklist/:key', (req, res) => {
    const { checked, memo } = req.body;
    db.prepare(`INSERT INTO mr_checklist (report_id, item_key, checked, memo) VALUES (?,?,?,?)
      ON CONFLICT(report_id, item_key) DO UPDATE SET checked=excluded.checked, memo=excluded.memo`)
      .run(req.params.id, req.params.key, checked?1:0, memo||'');
    res.json({ ok: true });
  });

  // 홍보 항목
  router.put('/:id/promotions/:pid', (req, res) => {
    const { actual, target, memo } = req.body;
    const existing = db.prepare('SELECT * FROM mr_promotions WHERE id = ? AND report_id = ?').get(req.params.pid, req.params.id);
    if (!existing) return res.status(404).json({ error: '없음' });
    db.prepare('UPDATE mr_promotions SET actual=?, target=?, memo=? WHERE id=?').run(
      actual ?? existing.actual, target ?? existing.target, memo ?? existing.memo, req.params.pid);
    res.json(db.prepare('SELECT * FROM mr_promotions WHERE id = ?').get(req.params.pid));
  });

  return router;
};
