const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // 목록
  router.get('/', (req, res) => {
    res.json(db.prepare('SELECT * FROM sticky_notes ORDER BY id ASC').all());
  });

  // 새 메모
  router.post('/', (req, res) => {
    const { content, color, pos_x, pos_y, rotation, z_index } = req.body;
    const r = db.prepare(`
      INSERT INTO sticky_notes (content, color, pos_x, pos_y, rotation, z_index)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(content || '', color || 'yellow', pos_x ?? 40, pos_y ?? 40, rotation ?? 0, z_index ?? 1);
    res.status(201).json(db.prepare('SELECT * FROM sticky_notes WHERE id = ?').get(r.lastInsertRowid));
  });

  // 내용/색/위치 수정
  router.put('/:id', (req, res) => {
    const n = db.prepare('SELECT * FROM sticky_notes WHERE id = ?').get(req.params.id);
    if (!n) return res.status(404).json({ error: '없음' });
    const { content, color, pos_x, pos_y, rotation, z_index } = req.body;
    db.prepare(`
      UPDATE sticky_notes SET
        content = ?, color = ?, pos_x = ?, pos_y = ?, rotation = ?, z_index = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      content ?? n.content, color ?? n.color,
      pos_x ?? n.pos_x, pos_y ?? n.pos_y,
      rotation ?? n.rotation, z_index ?? n.z_index,
      req.params.id
    );
    res.json(db.prepare('SELECT * FROM sticky_notes WHERE id = ?').get(req.params.id));
  });

  // 삭제
  router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM sticky_notes WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  return router;
};
