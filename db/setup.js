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

// ─── 출결 테이블 ───
db.exec(`
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    year_month TEXT NOT NULL,
    absent INTEGER DEFAULT 0,
    makeup INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, year_month),
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
  );
`);

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

// ─── 챗봇 답변 테이블 ───
db.exec(`
  CREATE TABLE IF NOT EXISTS chat_answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    reply TEXT NOT NULL,
    buttons TEXT NOT NULL DEFAULT '[]',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 카카오톡 메시지 템플릿
db.exec(`
  CREATE TABLE IF NOT EXISTS kakao_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const existingTemplates = db.prepare('SELECT COUNT(*) as c FROM kakao_templates').get();
if (existingTemplates.c === 0) {
  const ins = db.prepare('INSERT INTO kakao_templates (title, content, sort_order) VALUES (?, ?, ?)');
  ins.run('📚 교재 안내', '안녕하세요! 링키영어 진해남문점입니다 😊\n이번 달 사용할 교재 안내드립니다.\n\n📖 교재명:\n💰 교재비:\n\n궁금하신 점은 편하게 연락 주세요!', 0);
  ins.run('🏫 첫 방문 안내', '안녕하세요! 링키영어 진해남문점입니다 😊\n첫 수업 안내드립니다.\n\n📅 수업 시작일:\n⏰ 수업 시간:\n📍 위치: 진해구 남문동\n\n첫 날 교재와 필기도구 챙겨오시면 됩니다!\n궁금하신 점 편하게 연락 주세요 😊', 1);
  ins.run('📊 리포트 발송', '안녕하세요! 링키영어 진해남문점 Ms. Henzy입니다 😊\n이번 달 학습 리포트를 보내드립니다.\n\n아래 링크에서 확인하실 수 있습니다 👇\n\n[링크]\n\n궁금하신 점은 편하게 문의 주세요!', 2);
  console.log('✅ 카카오톡 템플릿 기본 데이터 삽입 완료');
}

// 기본 답변이 없으면 초기 데이터 삽입
const existingAnswers = db.prepare('SELECT COUNT(*) as c FROM chat_answers').get();
if (existingAnswers.c === 0) {
  const defaults = [
    { key: '인사',      label: '처음 인사 메시지',    reply: '안녕하세요! 링키영어 진해남문점 상담 안내 데스크예요 😊\n궁금하신 내용을 선택해주세요!',
      buttons: JSON.stringify([{label:'👶 유치부 수업이 궁금해요',type:'msg'},{label:'📚 초등부 수업이 궁금해요',type:'msg'},{label:'🌱 영어 처음 시작이에요',type:'msg'},{label:'📝 레벨테스트가 뭔가요?',type:'msg'},{label:'💰 수강료가 궁금해요',type:'msg'},{label:'📍 위치/운영시간 알려주세요',type:'msg'}]) },
    { key: '유치부',    label: '유치부 수업',          reply: '유치부는 듣기·말하기 중심으로 영어를 놀이처럼 배워요.\n파닉스도 재미있는 활동으로 진행돼요 😊',
      buttons: JSON.stringify([{label:'📖 숙제는 얼마나 있나요?',type:'msg'},{label:'🎯 수업 방식이 어떻게 되나요?',type:'msg'},{label:'💰 수강료가 궁금해요',type:'msg'},{label:'🏫 방문상담 신청할게요',type:'form',formType:'방문상담'}]) },
    { key: '초등부',    label: '초등부 수업',          reply: '초등부는 파닉스부터 리딩·스피킹·단어까지 단계별로 배워요.\n영어 경험이 없어도 괜찮아요 😊',
      buttons: JSON.stringify([{label:'🔤 파닉스가 약한데요',type:'msg'},{label:'📗 읽기가 약한데요',type:'msg'},{label:'🗣️ 말하기 자신감이 없어요',type:'msg'},{label:'📝 레벨테스트가 뭔가요?',type:'msg'},{label:'🏫 방문상담 신청할게요',type:'form',formType:'방문상담'}]) },
    { key: '처음',      label: '영어 처음 시작',       reply: '처음 시작하는 아이도 걱정 없어요!\n나이와 경험에 맞게 가장 편한 단계부터 시작해드려요 😊',
      buttons: JSON.stringify([{label:'✅ 레벨테스트 신청할게요',type:'form',formType:'레벨테스트'},{label:'🏫 방문상담 신청할게요',type:'form',formType:'방문상담'},{label:'👶 유치부 수업이 궁금해요',type:'msg'},{label:'📚 초등부 수업이 궁금해요',type:'msg'}]) },
    { key: '파닉스',    label: '파닉스',               reply: '파닉스는 영어 읽기의 기초예요.\n아직 시작 안 한 아이도, 중간에 막힌 아이도 단계에 맞게 진행해드려요 😊',
      buttons: JSON.stringify([{label:'✅ 레벨테스트 신청할게요',type:'form',formType:'레벨테스트'},{label:'🏫 방문상담 신청할게요',type:'form',formType:'방문상담'},{label:'💬 다른 질문이 있어요',type:'msg'}]) },
    { key: '읽기',      label: '읽기(리딩)',            reply: '읽기가 약한 아이는 파닉스 확인부터 시작해서 단계별 리딩으로 자신감을 키워드려요 😊',
      buttons: JSON.stringify([{label:'✅ 레벨테스트 신청할게요',type:'form',formType:'레벨테스트'},{label:'🏫 방문상담 신청할게요',type:'form',formType:'방문상담'},{label:'💬 다른 질문이 있어요',type:'msg'}]) },
    { key: '말하기',    label: '말하기(스피킹)',        reply: '말하기 자신감은 충분한 듣기와 반복 연습으로 키울 수 있어요.\n수업 안에서 자연스럽게 스피킹을 연습해요 😊',
      buttons: JSON.stringify([{label:'✅ 레벨테스트 신청할게요',type:'form',formType:'레벨테스트'},{label:'🏫 방문상담 신청할게요',type:'form',formType:'방문상담'},{label:'💬 다른 질문이 있어요',type:'msg'}]) },
    { key: '레벨테스트',label: '레벨테스트 안내',       reply: '레벨테스트는 20~30분 내외로 부담 없이 진행돼요.\n아이에게 딱 맞는 반을 찾아드리기 위한 과정이에요 😊',
      buttons: JSON.stringify([{label:'✅ 레벨테스트 신청할게요',type:'form',formType:'레벨테스트'},{label:'🏫 방문상담 신청할게요',type:'form',formType:'방문상담'},{label:'💬 다른 질문이 있어요',type:'msg'}]) },
    { key: '수업방식',  label: '수업 방식/커리큘럼',   reply: '파닉스·리딩·스피킹·단어를 체계적으로 연결하는 커리큘럼이에요.\n자세한 내용은 방문상담 때 직접 보여드릴게요 😊',
      buttons: JSON.stringify([{label:'📖 숙제는 얼마나 있나요?',type:'msg'},{label:'💰 수강료가 궁금해요',type:'msg'},{label:'🏫 방문상담 신청할게요',type:'form',formType:'방문상담'},{label:'💬 다른 질문이 있어요',type:'msg'}]) },
    { key: '숙제',      label: '숙제량',               reply: '숙제는 복습 중심으로 부담스럽지 않게 구성돼요.\n레벨과 반에 따라 달라질 수 있어요 😊',
      buttons: JSON.stringify([{label:'🎯 수업 방식이 어떻게 되나요?',type:'msg'},{label:'🏫 방문상담 신청할게요',type:'form',formType:'방문상담'},{label:'💬 다른 질문이 있어요',type:'msg'}]) },
    { key: '수강료',    label: '수강료/비용',           reply: '수강료는 반 구성과 수업 시간에 따라 달라져요.\n정확한 금액은 상담 시 안내드릴게요 😊',
      buttons: JSON.stringify([{label:'🏫 방문상담 신청할게요',type:'form',formType:'방문상담'},{label:'✅ 레벨테스트 신청할게요',type:'form',formType:'레벨테스트'},{label:'💬 다른 질문이 있어요',type:'msg'}]) },
    { key: '위치시간',  label: '위치/운영시간',         reply: '경남 창원시 진해구 남문동에 있어요.\n운영시간: 월~금 오후 2시~9시, 토 오전 10시~오후 2시 😊',
      buttons: JSON.stringify([{label:'🏫 방문상담 신청할게요',type:'form',formType:'방문상담'},{label:'💬 다른 질문이 있어요',type:'msg'}]) },
    { key: '기타',      label: '기타 (기본 응답)',      reply: '아이 상황에 따라 더 정확히 안내드릴 수 있어요.\n아래에서 궁금하신 내용을 선택해주세요 😊',
      buttons: JSON.stringify([{label:'👶 유치부 수업이 궁금해요',type:'msg'},{label:'📚 초등부 수업이 궁금해요',type:'msg'},{label:'📝 레벨테스트가 뭔가요?',type:'msg'},{label:'💰 수강료가 궁금해요',type:'msg'},{label:'🏫 방문상담 신청할게요',type:'form',formType:'방문상담'}]) },
  ];
  const insert = db.prepare('INSERT INTO chat_answers (key, label, reply, buttons) VALUES (?, ?, ?, ?)');
  for (const a of defaults) insert.run(a.key, a.label, a.reply, a.buttons);
  console.log('✅ 챗봇 기본 답변 삽입 완료');
}

console.log('✅ DB 스키마 준비 완료:', DB_PATH);

module.exports = { db, makeShareCode };
