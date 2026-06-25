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

// ─── 월간 운영 리포트 ───
db.exec(`
  CREATE TABLE IF NOT EXISTS monthly_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year_month TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT '작성중',
    enrolled_count INTEGER DEFAULT 0,
    new_count INTEGER DEFAULT 0,
    withdrawn_count INTEGER DEFAULT 0,
    total_revenue INTEGER DEFAULT 0,
    textbook_fee INTEGER DEFAULT 0,
    unpaid_memo TEXT DEFAULT '',
    refund_memo TEXT DEFAULT '',
    settlement_memo TEXT DEFAULT '',
    reflection_good TEXT DEFAULT '',
    reflection_bad TEXT DEFAULT '',
    reflection_next TEXT DEFAULT '',
    reflection_memo TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS mr_new_students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    grade TEXT DEFAULT '',
    class_subject TEXT DEFAULT '',
    note TEXT DEFAULT '',
    FOREIGN KEY(report_id) REFERENCES monthly_reports(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS mr_withdrawn_students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    grade TEXT DEFAULT '',
    reason TEXT DEFAULT '',
    note TEXT DEFAULT '',
    FOREIGN KEY(report_id) REFERENCES monthly_reports(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS mr_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    memo TEXT DEFAULT '',
    FOREIGN KEY(report_id) REFERENCES monthly_reports(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS mr_checklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    item_key TEXT NOT NULL,
    checked INTEGER DEFAULT 0,
    memo TEXT DEFAULT '',
    UNIQUE(report_id, item_key),
    FOREIGN KEY(report_id) REFERENCES monthly_reports(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS mr_promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    target INTEGER DEFAULT 0,
    actual INTEGER DEFAULT 0,
    memo TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY(report_id) REFERENCES monthly_reports(id) ON DELETE CASCADE
  );
`);

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
  CREATE TABLE IF NOT EXISTS teacher_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS kakao_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const existingComments = db.prepare('SELECT COUNT(*) as c FROM teacher_comments').get();
if (existingComments.c === 0) {
  const ins = db.prepare('INSERT INTO teacher_comments (category, content, sort_order) VALUES (?, ?, ?)');
  let i = 0;
  const cat1 = '🌟 열심히 하는 학생';
  [
    '이번 달도 빠짐없이 숙제를 해와서 정말 기특했어요. 꾸준함이 실력으로 이어지고 있어요 😊',
    '수업 시간에 항상 집중하고 적극적으로 참여해줘서 선생님도 덩달아 기분이 좋았답니다!',
    '모르는 부분을 그냥 넘기지 않고 꼭 물어봐주는 모습이 정말 대견해요. 그게 진짜 공부예요 👍',
    '단어 외우는 걸 정말 열심히 해왔어요. 노력이 쌓이면 반드시 결과로 나타나요!',
    '이번 달 수업 태도가 정말 훌륭했어요. 선생님 말을 귀 기울여 듣는 모습이 보기 좋았어요 😊',
    '리딩 속도가 눈에 띄게 빨라졌어요. 매일매일 연습한 게 느껴져요!',
    '발음이 점점 자연스러워지고 있어요. 꾸준히 따라 읽어준 덕분이에요 🎉',
    '테스트 준비를 꼼꼼하게 해왔어요. 이런 성실함이 영어 실력의 원동력이 됩니다!',
    '어려운 문장도 포기하지 않고 끝까지 읽으려는 모습, 정말 멋있어요 💪',
    '수업 시작 전에 미리 교재 펼쳐두고 기다리는 모습이 정말 예뻤어요. 준비성이 최고예요!',
  ].forEach(c => ins.run(cat1, c, i++));

  const cat2 = '😊 밝고 활발한 학생';
  [
    '항상 밝은 에너지로 수업 분위기를 살려줘서 고마워요. 함께하는 친구들도 덩달아 신이 나요 😄',
    '발표할 때 자신 있게 손을 드는 모습이 정말 멋있어요. 그 용기가 영어 실력으로 이어질 거예요!',
    '틀려도 웃으면서 다시 도전하는 모습이 보기 너무 좋아요. 그게 영어 실력을 키우는 비결이에요 😊',
    '수업 중에 재미있는 아이디어를 많이 내줘서 수업이 더 즐거워졌어요. 고마워요!',
    '친구들을 잘 도와주고 배려하는 모습이 정말 기특해요. 수업 분위기가 더 좋아졌어요 💛',
    '큰 목소리로 따라 읽어줘서 선생님도 힘이 났어요. 그 에너지 계속 유지해요!',
    '영어로 먼저 말하려고 도전하는 모습이 대견해요. 겁 없이 시도하는 게 정말 중요해요 🎯',
    '매 수업마다 웃음 가득한 얼굴로 와줘서 선생님도 기분이 좋았어요. 항상 밝아서 고마워요!',
    '궁금한 게 생기면 바로 물어봐주는 솔직한 모습이 정말 좋아요. 그덕에 수업이 더 알차졌어요 😊',
    '수업 끝나고도 더 하고 싶다고 해줄 때 선생님 정말 뿌듯했어요. 그 열정 계속 이어가요!',
  ].forEach(c => ins.run(cat2, c, i++));

  const cat3 = '📚 성실하고 조용한 학생';
  [
    '말수는 적지만 누구보다 집중해서 듣고 있다는 걸 선생님은 알아요. 정말 믿음직스러워요 😊',
    '조용히 하지만 빠짐없이 해오는 숙제, 정말 대단해요. 성실함이 실력을 만들어요!',
    '자기 할 일을 묵묵히 해내는 모습이 정말 듬직해요. 선생님이 제일 믿는 학생이에요 💛',
    '꼼꼼하게 필기하고 복습하는 습관이 정말 훌륭해요. 이 습관이 나중에 큰 차이를 만들어요!',
    '실수를 줄이려고 신중하게 읽는 모습이 보기 좋아요. 그 꼼꼼함이 장점이에요 😊',
    '조용하지만 테스트 결과가 늘 안정적이에요. 꾸준함의 힘이 느껴져요!',
    '차분하게 집중하는 모습 덕분에 수업이 늘 잘 진행돼요. 선생님이 항상 고마워하고 있어요 🙏',
    '모르는 단어가 있으면 스스로 찾아보는 자기주도적인 모습이 정말 대견해요!',
    '매번 교재를 깔끔하게 정리해오는 모습에서 성실함이 느껴져요. 그 태도 너무 좋아요 📖',
    '선생님 설명을 끝까지 경청하는 모습이 정말 귀해요. 그 집중력이 실력으로 나타나고 있어요!',
  ].forEach(c => ins.run(cat3, c, i++));

  const cat4 = '💪 성장 중인 학생';
  [
    '처음보다 훨씬 자신 있게 읽는 모습이 느껴져요. 조금씩 하지만 분명히 나아가고 있어요 😊',
    '어렵다고 포기하지 않고 끝까지 해보려는 모습이 정말 대견해요. 그 마음이 가장 중요해요 💪',
    '이번 달 단어 점수가 지난달보다 올랐어요. 노력한 게 결과로 나타나고 있어요!',
    '헷갈렸던 발음이 이제 훨씬 정확해졌어요. 꾸준히 연습한 덕분이에요 🎉',
    '집중하는 시간이 점점 길어지고 있어요. 선생님 눈에 확실히 보여요. 정말 기특해요!',
    '전에는 어려워했던 부분을 이번에 잘 해냈어요. 보이지 않는 노력이 쌓인 거예요 🌱',
    '숙제 빠뜨리는 날이 줄었어요. 책임감이 생긴 것 같아서 선생님도 뿌듯해요 😊',
    '실수를 해도 포기하지 않고 다시 도전하는 모습이 정말 멋있어요. 그게 진짜 용기예요!',
    '영어가 조금씩 익숙해지고 있는 게 느껴지죠? 선생님도 그 변화가 보여요. 계속 함께 가요!',
    '이번 달 정말 많이 성장했어요. 선생님이 옆에서 지켜보면서 정말 뿌듯했답니다 💛',
  ].forEach(c => ins.run(cat4, c, i++));

  console.log('✅ 선생님 한마디 기본 데이터 삽입 완료');
}

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
