const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // GET /api/admin/consult/stats — 대시보드 통계
  router.get('/stats', (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    const todayCount   = db.prepare(`SELECT COUNT(*) as c FROM consultations WHERE date(created_at) = ?`).get(today)?.c || 0;
    const weekCount    = db.prepare(`SELECT COUNT(*) as c FROM consultations WHERE date(created_at) >= ?`).get(weekAgo)?.c || 0;
    const reserved     = db.prepare(`SELECT COUNT(*) as c FROM consultations WHERE status IN ('상담 예약','일정 확정')`).get()?.c || 0;
    const levelTest    = db.prepare(`SELECT COUNT(*) as c FROM consultations WHERE consult_type = '레벨테스트'`).get()?.c || 0;
    const enrolled     = db.prepare(`SELECT COUNT(*) as c FROM consultations WHERE status = '등록 완료'`).get()?.c || 0;
    const needContact  = db.prepare(`SELECT COUNT(*) as c FROM consultations WHERE status = '연락 필요'`).get()?.c || 0;
    const pending      = db.prepare(`SELECT COUNT(*) as c FROM consultations WHERE status IN ('미응답','보류')`).get()?.c || 0;
    const priority     = db.prepare(`SELECT COUNT(*) as c FROM consultations WHERE is_priority = 1 AND status = '신규 문의'`).get()?.c || 0;

    res.json({ todayCount, weekCount, reserved, levelTest, enrolled, needContact, pending, priority });
  });

  // GET /api/admin/consult — 상담 목록
  router.get('/', (req, res) => {
    const { status, consult_type, source, grade, search } = req.query;

    let where = [];
    let params = [];

    if (status)       { where.push('status = ?');        params.push(status); }
    if (consult_type) { where.push('consult_type = ?');  params.push(consult_type); }
    if (source)       { where.push('source LIKE ?');     params.push(`%${source}%`); }
    if (grade)        { where.push('grade LIKE ?');      params.push(`%${grade}%`); }
    if (search)       {
      where.push('(student_name LIKE ? OR parent_name LIKE ? OR parent_phone LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const rows = db.prepare(
      `SELECT * FROM consultations ${whereClause} ORDER BY is_priority DESC, created_at DESC`
    ).all(...params);

    res.json(rows);
  });

  // GET /api/admin/consult/:id — 상담 상세
  router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM consultations WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: '상담 건을 찾을 수 없습니다.' });

    const chatLogs = db.prepare(
      'SELECT role, content, created_at FROM chat_logs WHERE consultation_id = ? OR session_id = ? ORDER BY id ASC'
    ).all(row.id, row.session_id || '');

    res.json({ ...row, chatLogs });
  });

  // PATCH /api/admin/consult/:id — 상태/메모 업데이트
  router.patch('/:id', (req, res) => {
    const { status, memo, next_contact, result, recommended, enrolled } = req.body;
    const row = db.prepare('SELECT id FROM consultations WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: '상담 건을 찾을 수 없습니다.' });

    const fields = [];
    const vals = [];

    if (status !== undefined)      { fields.push('status = ?');      vals.push(status); }
    if (memo !== undefined)        { fields.push('memo = ?');        vals.push(memo); }
    if (next_contact !== undefined){ fields.push('next_contact = ?');vals.push(next_contact); }
    if (result !== undefined)      { fields.push('result = ?');      vals.push(result); }
    if (recommended !== undefined) { fields.push('recommended = ?'); vals.push(recommended); }
    if (enrolled !== undefined)    { fields.push('enrolled = ?');    vals.push(enrolled ? 1 : 0); }

    if (fields.length === 0) return res.status(400).json({ error: '변경할 내용이 없습니다.' });

    fields.push('updated_at = CURRENT_TIMESTAMP');
    vals.push(req.params.id);

    db.prepare(`UPDATE consultations SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
    res.json({ ok: true });
  });

  // DELETE /api/admin/consult/:id — 상담 삭제
  router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM chat_logs WHERE consultation_id = ?').run(req.params.id);
    db.prepare('DELETE FROM consultations WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  // ── 챗봇 답변 관리 ──────────────────────────────────────────────────

  // GET /api/admin/consult/answers — 전체 답변 목록
  router.get('/answers', (req, res) => {
    const rows = db.prepare('SELECT * FROM chat_answers ORDER BY id ASC').all();
    res.json(rows.map(r => ({ ...r, buttons: JSON.parse(r.buttons || '[]') })));
  });

  // PATCH /api/admin/consult/answers/:key — 답변 수정
  router.patch('/answers/:key', (req, res) => {
    const { reply, buttons } = req.body;
    const row = db.prepare('SELECT id FROM chat_answers WHERE key = ?').get(req.params.key);
    if (!row) return res.status(404).json({ error: '답변을 찾을 수 없습니다.' });
    db.prepare('UPDATE chat_answers SET reply = ?, buttons = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?')
      .run(reply, JSON.stringify(buttons || []), req.params.key);
    res.json({ ok: true });
  });

  return router;
};
