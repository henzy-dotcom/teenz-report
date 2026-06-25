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

  CREATE TABLE IF NOT EXISTS contact_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    consultation_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    contact_type TEXT DEFAULT '전화',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (consultation_id) REFERENCES consultations(id)
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
    '이번 달도 빠짐없이 숙제를 완성해 와서 정말 대견했어요. 단어 암기와 문장 쓰기 모두 꼼꼼하게 해오는 모습이 인상적이었습니다. 이런 꾸준함이 쌓이면 반드시 큰 실력으로 이어질 거예요 😊',
    '수업 중 문법 설명을 들을 때 끝까지 집중하는 모습이 정말 믿음직스러웠어요. 배운 문법을 문장에 바로 적용해보려는 시도가 많았고, 덕분에 이해 속도도 눈에 띄게 빨라졌습니다. 앞으로도 이 자세 꼭 유지해 주세요 👍',
    '단어 테스트를 위해 매주 스스로 단어를 정리하고 외워오는 모습이 정말 기특했어요. 어휘 실력이 늘면서 리딩 지문을 읽는 속도도 자연스럽게 빨라지고 있어요. 이 습관이 영어 실력의 가장 단단한 기초가 되고 있습니다!',
    '리딩 지문에서 모르는 단어가 나와도 포기하지 않고 문맥으로 뜻을 추측하는 모습이 대단했어요. 이런 읽기 전략은 고학년이 될수록 정말 중요한 능력이에요. 계속 이 방식으로 읽기 연습하면 분명 좋은 결과가 나올 거예요 📖',
    '발음 교정을 할 때마다 바로 따라 해보고 여러 번 반복하는 모습이 정말 인상적이었어요. 덕분에 이번 달 영어 발음이 훨씬 자연스러워졌고, 선생님이 듣기에도 자신감이 느껴졌습니다. 그 성실함 정말 최고예요 🎤',
    '문법 문제에서 실수가 나왔을 때 틀린 이유를 정확히 이해하고 넘어가려는 태도가 정말 훌륭했어요. 단순히 답을 맞히는 것보다 왜 틀렸는지 아는 것이 훨씬 중요한데, 그걸 스스로 실천하고 있어요. 이 습관 덕분에 같은 실수가 점점 줄어들고 있습니다!',
    '수업 시작 전 항상 교재를 미리 펼쳐두고 준비하는 모습이 정말 예뻤어요. 지난 시간 배운 표현을 기억하고 활용하려는 노력도 꾸준히 보여줘서 선생님이 뿌듯했습니다. 그 준비성과 복습 습관, 앞으로도 계속 이어가 주세요 😊',
    '스피킹 활동에서 틀릴까봐 주저하지 않고 먼저 말해보려는 용기가 대단했어요. 문장 구조가 완벽하지 않아도 표현하려는 의지가 있어서 실력이 빠르게 늘고 있어요. 영어는 두려움 없이 말해보는 게 가장 중요한데, 그걸 잘 해주고 있습니다 🗣️',
    '리스닝 활동에서 집중력이 정말 뛰어났어요. 원어민 음성을 들으면서 핵심 단어를 놓치지 않고 잡아내는 실력이 많이 늘었고, 이번 달 리스닝 점수도 확실히 올랐습니다. 꾸준히 들으면서 귀가 트이고 있어요 🎧',
    '숙제로 낸 문장 만들기 활동을 단순히 해오는 데 그치지 않고 다양한 어휘를 써서 풍부하게 표현해 와서 놀랐어요. 배운 단어를 자기 문장 안에서 직접 활용할 줄 안다는 건 어휘 실력이 제대로 쌓이고 있다는 증거예요. 정말 잘하고 있어요 ✏️',
  ].forEach(c => ins.run(cat1, c, i++));

  const cat2 = '😊 밝고 활발한 학생';
  [
    '항상 밝고 긍정적인 에너지로 수업 분위기를 활기차게 만들어줘서 고마워요. 스피킹 활동에서 먼저 손을 들고 문장을 말해보려는 용기가 정말 대단합니다. 그 자신감이 영어 실력으로 이어지고 있는 게 느껴져요 😄',
    '발표할 때 목소리도 크고 또렷해서 발음이 더 잘 들리고 자연스러웠어요. 문장을 외워서 말하는 게 아니라 이해하고 표현하는 모습이 인상적이었습니다. 이런 스피킹 태도가 영어 실력의 핵심이에요 🎤',
    '리딩 지문을 소리 내어 읽을 때 억양과 리듬이 살아있어서 듣기에도 좋았어요. 단어 하나하나를 또박또박 읽으면서도 흐름을 잃지 않는 게 쉽지 않은데 잘 해주고 있습니다. 그 낭독 실력, 앞으로도 계속 키워 주세요 📖',
    '틀린 문법 문제를 짚어줄 때 기죽지 않고 "왜 틀렸는지" 적극적으로 물어봐줘서 수업이 훨씬 알차졌어요. 실수를 두려워하지 않고 오히려 배움의 기회로 삼는 태도가 정말 훌륭합니다. 그 용기 덕분에 문법 실수가 눈에 띄게 줄었어요 👍',
    '단어 게임이나 짝 활동에서 항상 즐겁게 참여하면서도 정확한 표현을 쓰려고 노력하는 모습이 보기 좋았어요. 재미와 공부를 동시에 잡는 게 쉽지 않은데 자연스럽게 해주고 있어요. 그 균형 감각이 정말 대단합니다 😊',
    '수업 중 선생님 설명에 "아, 그렇구나!" 하고 반응해주는 모습이 정말 기특해요. 영어 문장 구조나 문법 규칙을 들을 때 눈이 빛나는 게 보였고, 그 호기심이 이해 속도를 빠르게 만들고 있습니다. 앞으로도 그 궁금증 계속 가져오세요 🌟',
    '짧은 영어 문장으로 먼저 말을 걸어보려는 시도가 이번 달에 부쩍 늘었어요. 배운 표현을 실제로 써보는 게 가장 좋은 연습인데, 그걸 스스로 실천하고 있습니다. 어휘와 표현이 자연스럽게 입에 붙어가고 있어요 😊',
    '리스닝 지문을 들을 때 끝까지 집중하면서 핵심 내용을 잘 잡아냈어요. 주의가 흐트러질 만한 상황에서도 끝까지 들으려는 모습이 인상적이었습니다. 그 집중력 덕분에 이번 달 리스닝 이해도가 많이 좋아졌어요 🎧',
    '그룹 활동에서 친구가 막힐 때 자연스럽게 힌트를 주고 도와주는 모습이 정말 예뻤어요. 영어 표현을 알려줄 때 스스로도 다시 한번 복습하는 효과가 있어서 실력에도 도움이 됩니다. 그 따뜻한 마음 계속 간직해 주세요 💛',
    '발음 연습을 시킬 때마다 과장될 정도로 입 모양을 크게 따라 해줘서 선생님도 웃음이 났어요. 그렇게 적극적으로 따라 하는 덕분에 이번 달 발음 교정이 확실히 됐고, 영어가 더 자연스럽게 들립니다. 그 패기 최고예요 😄',
  ].forEach(c => ins.run(cat2, c, i++));

  const cat3 = '📚 성실하고 조용한 학생';
  [
    '말수는 적지만 수업 중 설명 하나하나를 놓치지 않고 꼼꼼히 받아 적는 모습이 정말 믿음직스러워요. 문법 노트 정리가 특히 깔끔하고 체계적이어서 복습에도 큰 도움이 되고 있을 거예요. 그 성실함이 실력의 기반이 되고 있습니다 📝',
    '단어 시험을 위해 매번 단어장을 직접 만들어 외워오는 습관이 정말 훌륭해요. 단순 암기가 아니라 예문과 함께 정리해오는 모습에서 어휘를 제대로 공부하고 있다는 게 느껴집니다. 그 방식 덕분에 단어 실력이 탄탄하게 쌓이고 있어요 📖',
    '리딩 지문을 읽을 때 모르는 단어에 표시하고 뜻을 찾아 정리해오는 모습이 대견했어요. 그렇게 어휘를 정리하다 보면 어느 순간 지문이 훨씬 수월하게 읽히기 시작해요. 그 꼼꼼한 습관, 절대 놓치지 마세요 😊',
    '문법 문제를 풀 때 틀린 문제를 그냥 넘기지 않고 왜 틀렸는지 스스로 다시 확인하는 모습이 인상적이었어요. 이해가 안 되면 조용히 손을 들어 다시 물어봐주는 모습도 정말 좋았습니다. 그렇게 확인하고 넘어가는 습관이 실력을 쌓는 핵심이에요 👍',
    '발음 연습을 시킬 때 조용하지만 정확하게 따라 읽어줘서 선생님이 교정해주기도 수월했어요. 발음 하나하나에 신경 쓰면서 천천히 정확하게 읽으려는 태도가 정말 좋았습니다. 덕분에 발음이 점점 안정적으로 자리잡고 있어요 🎤',
    '리스닝 활동에서 조용히 집중하면서도 정답률이 높아서 선생님도 놀랐어요. 평소에 듣기 연습을 꾸준히 하고 있다는 게 느껴지고, 영어 귀가 많이 트이고 있습니다. 그 집중력과 꾸준함, 정말 최고예요 🎧',
    '매번 교재를 깔끔하게 정리하고 표시해와서 수업 준비가 늘 잘 되어 있었어요. 지난 시간 배운 표현에 스스로 체크 표시를 해오는 모습에서 복습을 빠짐없이 한다는 게 보였습니다. 그 성실한 태도가 선생님은 정말 믿음직스러워요 😊',
    '스피킹 시간에 크게 말하지 않아도 문장 구조가 정확하고 어휘 선택이 적절해서 실력이 느껴졌어요. 틀릴까봐 조심스럽게 말하는 만큼 실수가 적고 완성도 높은 문장을 구사하고 있습니다. 조금 더 자신 있게 말해도 충분히 잘 해요 💪',
    '숙제를 내줄 때 분량이 많아도 불평 없이 성실하게 해오는 모습이 정말 대견해요. 문장 쓰기 과제에서 맞춤법과 문법을 꼼꼼하게 확인하고 제출하는 게 느껴졌습니다. 그 책임감이 앞으로 훨씬 빛날 거예요 ✏️',
    '선생님 설명을 들을 때 끝까지 경청하고 이해한 뒤 천천히 따라가는 모습이 정말 좋았어요. 빠르게 따라가지 못할 것 같아도 결국 끝에는 정확하게 이해하는 모습이 인상적이었습니다. 그 끈기와 집중력이 실력이 되고 있어요 🌱',
  ].forEach(c => ins.run(cat3, c, i++));

  const cat4 = '💪 성장 중인 학생';
  [
    '처음에는 어려워했던 단어 테스트에서 이번 달 점수가 눈에 띄게 올랐어요. 모르는 단어를 포기하지 않고 반복해서 외우는 노력이 결과로 나타나고 있습니다. 이 속도라면 다음 달이 더 기대돼요 😊',
    '리딩 지문을 읽을 때 예전보다 덜 막히고 흐름을 잃지 않게 됐어요. 어휘가 쌓이면서 모르는 단어가 나와도 앞뒤 문맥으로 뜻을 추측하는 능력이 생겼습니다. 그 변화가 선생님 눈에 확실히 보여요 📖',
    '문법 개념이 처음에는 헷갈렸지만 이번 달 반복 연습을 통해 점점 정확해지고 있어요. 특히 시제와 전치사 사용에서 실수가 줄어든 게 느껴졌고, 선생님도 그 성장이 정말 기뻤습니다. 꾸준히 하면 반드시 잡혀요 💪',
    '발음이 처음에 비해 많이 또렷해지고 자신감도 생겼어요. 발음 교정 때 바로 따라 해보고 틀린 부분을 다시 연습하는 모습이 대견했습니다. 그 노력 덕분에 영어가 점점 더 자연스럽게 들려요 🎤',
    '숙제를 빠뜨리는 날이 이번 달에 많이 줄었어요. 작은 것 같지만 매주 빠짐없이 해오는 습관이 자리잡히면 실력이 눈에 띄게 달라진답니다. 이 흐름 계속 이어가 주세요 😊',
    '리스닝에서 예전에는 잘 못 잡아내던 세부 정보들을 이제 꽤 정확하게 골라내고 있어요. 집중해서 듣는 시간이 늘었고, 귀가 조금씩 트이고 있다는 게 느껴집니다. 그 변화가 정말 대단해요 🎧',
    '스피킹 시간에 말하기 전에 문장을 머릿속으로 정리한 뒤 말하는 습관이 생겼어요. 덕분에 문법 오류가 줄었고 더 완성된 문장으로 표현하고 있습니다. 그 신중함이 실력 성장의 비결이에요 🗣️',
    '어려운 문장이 나왔을 때 예전엔 넘겼지만 이제는 먼저 물어봐주는 모습이 많이 늘었어요. 모르는 걸 물어보는 용기가 생겼다는 것 자체가 엄청난 성장이에요. 그 적극성 덕분에 이해도가 훨씬 높아졌습니다 👍',
    '단어를 외울 때 단순히 뜻만 외우지 않고 예문으로 함께 익히려는 모습이 이번 달에 보였어요. 그렇게 문맥 안에서 단어를 배우면 실전에서 훨씬 잘 쓸 수 있어요. 좋은 공부 습관이 자리잡히고 있습니다 📝',
    '이번 달 전반적으로 수업에 임하는 태도가 달라졌어요. 집중하는 시간도 길어지고, 영어에 대한 거부감도 많이 줄어든 게 느껴졌습니다. 선생님은 그 변화가 정말 반갑고 앞으로가 더 기대돼요 🌱',
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
