const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

module.exports = ({ db, makeShareCode }) => {
  router.get('/', (req, res) => {
    const students = db.prepare(`
      SELECT * FROM students ORDER BY status ASC, class_subject ASC, name ASC
    `).all();
    res.json(students);
  });

  router.get('/:id', (req, res) => {
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
    if (!student) return res.status(404).json({ error: '학생을 찾을 수 없습니다.' });
    res.json(student);
  });

  router.post('/', (req, res) => {
    const { name, grade, class_subject, teacher, parent_phone, consent_photo, status } = req.body;
    if (!name) return res.status(400).json({ error: '이름은 필수입니다.' });

    const share_token = uuidv4().replace(/-/g, '');
    const share_code = makeShareCode(db);

    const result = db.prepare(`
      INSERT INTO students (name, grade, class_subject, teacher, parent_phone, consent_photo, status, share_token, share_code, share_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(name, grade || '', class_subject || '', teacher || '', parent_phone || '',
           consent_photo !== false ? 1 : 0, status || 'active', share_token, share_code);

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(student);
  });

  router.put('/:id', (req, res) => {
    const { name, grade, class_subject, teacher, parent_phone, consent_photo, status, share_active } = req.body;
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
    if (!student) return res.status(404).json({ error: '학생을 찾을 수 없습니다.' });

    db.prepare(`
      UPDATE students SET
        name = ?, grade = ?, class_subject = ?, teacher = ?,
        parent_phone = ?, consent_photo = ?, status = ?, share_active = ?
      WHERE id = ?
    `).run(
      name ?? student.name,
      grade ?? student.grade,
      class_subject ?? student.class_subject,
      teacher ?? student.teacher,
      parent_phone ?? student.parent_phone,
      consent_photo !== undefined ? (consent_photo ? 1 : 0) : student.consent_photo,
      status ?? student.status,
      share_active !== undefined ? (share_active ? 1 : 0) : student.share_active,
      req.params.id
    );

    res.json(db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id));
  });

  router.post('/:id/regenerate-token', (req, res) => {
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
    if (!student) return res.status(404).json({ error: '학생을 찾을 수 없습니다.' });
    const new_code = makeShareCode(db);
    db.prepare('UPDATE students SET share_code = ? WHERE id = ?').run(new_code, req.params.id);
    res.json({ share_code: new_code });
  });

  return router;
};
