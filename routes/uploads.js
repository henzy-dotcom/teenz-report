const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
const PDF_DIR = path.join(UPLOADS_DIR, 'pdfs');
const PHOTO_DIR = path.join(UPLOADS_DIR, 'photos');

[PDF_DIR, PHOTO_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('JPG, PNG, WebP, PDF 파일만 업로드할 수 있습니다.'));
  }
});

module.exports = (db) => {
  // PDF 업로드
  router.post('/pdf/:reportId/:pdfType', upload.single('file'), (req, res) => {
    try {
      const { reportId, pdfType } = req.params;
      if (!['weekly1', 'weekly2', 'monthly'].includes(pdfType)) {
        return res.status(400).json({ error: '잘못된 PDF 타입입니다.' });
      }
      if (!req.file) return res.status(400).json({ error: '파일이 없습니다.' });

      // 기존 파일 삭제
      const existing = db.prepare('SELECT filename FROM report_pdfs WHERE report_id = ? AND pdf_type = ?').get(reportId, pdfType);
      if (existing) {
        const oldPath = path.join(PDF_DIR, existing.filename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        db.prepare('DELETE FROM report_pdfs WHERE report_id = ? AND pdf_type = ?').run(reportId, pdfType);
      }

      const filename = `${uuidv4()}.pdf`;
      fs.writeFileSync(path.join(PDF_DIR, filename), req.file.buffer);

      db.prepare(`
        INSERT INTO report_pdfs (report_id, pdf_type, filename, original_name)
        VALUES (?, ?, ?, ?)
      `).run(reportId, pdfType, filename, req.file.originalname);

      res.json({ ok: true, filename, original_name: req.file.originalname });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // PDF 삭제
  router.delete('/pdf/:reportId/:pdfType', (req, res) => {
    const { reportId, pdfType } = req.params;
    const existing = db.prepare('SELECT filename FROM report_pdfs WHERE report_id = ? AND pdf_type = ?').get(reportId, pdfType);
    if (existing) {
      const filePath = path.join(PDF_DIR, existing.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      db.prepare('DELETE FROM report_pdfs WHERE report_id = ? AND pdf_type = ?').run(reportId, pdfType);
    }
    res.json({ ok: true });
  });

  // 사진 업로드 (원본 저장, 압축 없음)
  router.post('/photo/:reportId/:photoType', upload.single('file'), (req, res) => {
    try {
      const { reportId, photoType } = req.params;
      if (!['homework', 'test', 'activity'].includes(photoType)) {
        return res.status(400).json({ error: '잘못된 사진 타입입니다.' });
      }
      if (!req.file) return res.status(400).json({ error: '파일이 없습니다.' });

      // 기존 사진 삭제
      const existing = db.prepare('SELECT filename FROM report_photos WHERE report_id = ? AND photo_type = ?').get(reportId, photoType);
      if (existing) {
        const oldPath = path.join(PHOTO_DIR, existing.filename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        db.prepare('DELETE FROM report_photos WHERE report_id = ? AND photo_type = ?').run(reportId, photoType);
      }

      // 확장자 유지
      const ext = req.file.mimetype === 'image/png' ? '.png' : req.file.mimetype === 'image/webp' ? '.webp' : '.jpg';
      const filename = `${uuidv4()}${ext}`;
      fs.writeFileSync(path.join(PHOTO_DIR, filename), req.file.buffer);

      db.prepare(`
        INSERT INTO report_photos (report_id, photo_type, filename)
        VALUES (?, ?, ?)
      `).run(reportId, photoType, filename);

      res.json({ ok: true, filename });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // 사진 삭제
  router.delete('/photo/:reportId/:photoType', (req, res) => {
    const { reportId, photoType } = req.params;
    const existing = db.prepare('SELECT filename FROM report_photos WHERE report_id = ? AND photo_type = ?').get(reportId, photoType);
    if (existing) {
      const filePath = path.join(PHOTO_DIR, existing.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      db.prepare('DELETE FROM report_photos WHERE report_id = ? AND photo_type = ?').run(reportId, photoType);
    }
    res.json({ ok: true });
  });

  return router;
};
