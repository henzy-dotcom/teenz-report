const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'teenz.db');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    grade TEXT,
    class_subject TEXT,
    teacher TEXT,
    parent_phone TEXT,
    consent_photo INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    share_token TEXT UNIQUE NOT NULL,
    share_code TEXT UNIQUE,
    share_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    period_id INTEGER NOT NULL,
    comment TEXT,
    homework_status TEXT,
    test_result TEXT,
    attitude TEXT,
    improvement TEXT,
    published INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    sent INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, period_id),
    FOREIGN KEY(student_id) REFERENCES students(id),
    FOREIGN KEY(period_id) REFERENCES periods(id)
  );

  CREATE TABLE IF NOT EXISTS report_pdfs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    pdf_type TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(report_id, pdf_type),
    FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS report_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    photo_type TEXT NOT NULL,
    filename TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(report_id, photo_type),
    FOREIGN KEY(report_id) REFERENCES reports(id) ON DELETE CASCADE
  );
`);

// ─── 마이그레이션 ───
['homework_comment TEXT', 'attitude_comment TEXT'].forEach(col => {
  try { db.exec(`ALTER TABLE reports ADD COLUMN ${col}`); } catch(e) {}
});

try {
  db.exec('ALTER TABLE students ADD COLUMN share_code TEXT');
  console.log('✅ share_code 컬럼 추가됨');
} catch (e) {
  // 이미 존재하면 무시
}

// share_code 없는 학생에게 자동 생성
function makeShareCode(db) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code, exists;
  do {
    code = Array.from(crypto.randomBytes(6))
      .map(b => chars[b % chars.length]).join('');
    exists = db.prepare('SELECT id FROM students WHERE share_code = ?').get(code);
  } while (exists);
  return code;
}

const withoutCode = db.prepare('SELECT id FROM students WHERE share_code IS NULL').all();
for (const s of withoutCode) {
  const code = makeShareCode(db);
  db.prepare('UPDATE students SET share_code = ? WHERE id = ?').run(code, s.id);
}
if (withoutCode.length > 0) {
  console.log(`✅ ${withoutCode.length}명에게 공유 코드 생성 완료`);
}

// ─── 신규생 상담 시스템 테이블 ───
db.exec(`
  CREATE TABLE IF NOT EXISTS consultations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_name TEXT NOT NULL,
    grade TEXT,
    school TEXT,
    parent_name TEXT,
    parent_phone TEXT NOT NULL,
    english_exp TEXT,
    concerns TEXT,
    consult_type TEXT,
    preferred_time TEXT,
    source TEXT,
    note TEXT,
    consent INTEGER DEFAULT 1,
    status TEXT DEFAULT '신규 문의',
    next_contact TEXT,
    memo TEXT,
    result TEXT,
    recommended TEXT,
    enrolled INTEGER DEFAULT 0,
    ai_summary TEXT,
    is_priority INTEGER DEFAULT 0,
    session_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    consultation_id INTEGER,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('✅ DB 스키마 준비 완료:', DB_PATH);

module.exports = { db, makeShareCode };
