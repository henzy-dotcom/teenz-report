const express = require('express');

module.exports = (db) => {
  const router = express.Router();

  router.get('/', (req, res) => {
    const rows = db.prepare('SELECT * FROM teacher_comments ORDER BY category, sort_order, id').all();
    res.json(rows);
  });

  router.post('/', (req, res) => {
    const { category, content } = req.body;
    if (!category || !content) return res.status(400).json({ error: '필수 항목 누락' });
    const r = db.prepare('INSERT INTO teacher_comments (category, content) VALUES (?, ?)').run(category, content);
    res.json({ id: r.lastInsertRowid });
  });

  router.put('/:id', (req, res) => {
    const { category, content } = req.body;
    db.prepare('UPDATE teacher_comments SET category=?, content=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
      .run(category, content, req.params.id);
    res.json({ ok: true });
  });

  router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM teacher_comments WHERE id=?').run(req.params.id);
    res.json({ ok: true });
  });

  return router;
};
