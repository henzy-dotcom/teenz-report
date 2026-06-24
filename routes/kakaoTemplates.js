const express = require('express');
const router = express.Router();

module.exports = (db) => {
  router.get('/', (req, res) => {
    res.json(db.prepare('SELECT * FROM kakao_templates ORDER BY sort_order ASC, id ASC').all());
  });

  router.post('/', (req, res) => {
    const { title, content } = req.body;
    if (!title) return res.status(400).json({ error: '제목이 필요합니다.' });
    const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM kakao_templates').get();
    const r = db.prepare('INSERT INTO kakao_templates (title, content, sort_order) VALUES (?, ?, ?)').run(title, content || '', (maxOrder.m ?? -1) + 1);
    res.status(201).json(db.prepare('SELECT * FROM kakao_templates WHERE id = ?').get(r.lastInsertRowid));
  });

  router.put('/:id', (req, res) => {
    const { title, content, sort_order } = req.body;
    const t = db.prepare('SELECT * FROM kakao_templates WHERE id = ?').get(req.params.id);
    if (!t) return res.status(404).json({ error: '없음' });
    db.prepare('UPDATE kakao_templates SET title=?, content=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
      .run(title ?? t.title, content ?? t.content, sort_order ?? t.sort_order, req.params.id);
    res.json(db.prepare('SELECT * FROM kakao_templates WHERE id = ?').get(req.params.id));
  });

  router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM kakao_templates WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  return router;
};
