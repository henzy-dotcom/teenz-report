const { db, makeShareCode } = require('./setup');
const { v4: uuidv4 } = require('uuid');

const existing = db.prepare('SELECT COUNT(*) as cnt FROM students').get();
if (existing.cnt > 0) {
  console.log('✅ 이미 샘플 데이터가 있습니다. 시드 건너뜀.');
  process.exit(0);
}

const students = [
  { name: '김민준', grade: '중1', class_subject: 'T1R', teacher: '박선생', parent_phone: '010-1234-5678', consent_photo: 1, status: 'active' },
  { name: '이서연', grade: '중2', class_subject: 'T1O', teacher: '박선생', parent_phone: '010-2345-6789', consent_photo: 1, status: 'active' },
  { name: '박지호', grade: '중1', class_subject: 'T1R', teacher: '김선생', parent_phone: '010-3456-7890', consent_photo: 0, status: 'active' },
  { name: '최유진', grade: '중3', class_subject: 'T1O', teacher: '김선생', parent_phone: '010-4567-8901', consent_photo: 1, status: 'active' },
  { name: '정하은', grade: '초6', class_subject: 'T1R', teacher: '박선생', parent_phone: '010-5678-9012', consent_photo: 1, status: 'active' },
];

const insertStudent = db.prepare(`
  INSERT INTO students (name, grade, class_subject, teacher, parent_phone, consent_photo, status, share_token, share_code, share_active)
  VALUES (@name, @grade, @class_subject, @teacher, @parent_phone, @consent_photo, @status, @share_token, @share_code, 1)
`);

const studentIds = [];
for (const s of students) {
  const result = insertStudent.run({
    ...s,
    share_token: uuidv4().replace(/-/g, ''),
    share_code: makeShareCode(db),
  });
  studentIds.push(result.lastInsertRowid);
}

const insertPeriod = db.prepare(`
  INSERT INTO periods (title, start_date, end_date) VALUES (@title, @start_date, @end_date)
`);
const period1 = insertPeriod.run({ title: '6월 2주차 리포트', start_date: '2026-06-08', end_date: '2026-06-21' });
const period2 = insertPeriod.run({ title: '5월 4주차 리포트', start_date: '2026-05-25', end_date: '2026-06-07' });

const insertReport = db.prepare(`
  INSERT INTO reports (student_id, period_id, comment, homework_status, test_result, attitude, improvement, published, completed, sent)
  VALUES (@student_id, @period_id, @comment, @homework_status, @test_result, @attitude, @improvement, @published, @completed, @sent)
`);

const p1 = Number(period1.lastInsertRowid);
const p2 = Number(period2.lastInsertRowid);

const sampleReports = [
  {
    student_id: Number(studentIds[0]), period_id: p1,
    comment: '민준이가 이번 2주 동안 꾸준히 수업에 참여했어요. 특히 스피킹 파트에서 자신감이 많이 붙었습니다. 단어 암기도 성실하게 해왔고, 다음 회차도 이 페이스를 유지하면 좋겠습니다. 가정에서도 많이 칭찬해 주세요! 😊',
    homework_status: 'done', test_result: '단어 테스트 95점 (20/21)', attitude: 'active',
    improvement: '리딩 지문 분석 시 속도를 좀 더 높이는 연습이 필요합니다. 매일 10분씩 영어 소리 내어 읽기를 해주시면 큰 도움이 됩니다.',
    published: 1, completed: 1, sent: 1
  },
  {
    student_id: Number(studentIds[1]), period_id: p1,
    comment: '서연이는 이번에 리딩 지문 분석이 눈에 띄게 향상되었어요. 문맥 파악 능력이 좋아졌습니다. 숙제도 꼼꼼하게 해오고 있어서 칭찬해주세요! 이 속도라면 다음 레벨도 충분히 도전할 수 있을 것 같습니다.',
    homework_status: 'done', test_result: '단어 테스트 88점 (22/25)', attitude: 'active',
    improvement: '영작 문장에서 시제 사용에 주의가 필요합니다. 과거/현재/미래 구분을 한 번 더 확인해 주세요.',
    published: 1, completed: 1, sent: 0
  },
  {
    student_id: Number(studentIds[2]), period_id: p1,
    comment: '지호는 수업 중 집중력이 좋아졌습니다. 단어 암기량이 늘어나고 있어요. 조금만 더 꾸준히 하면 실력이 빠르게 늘 것 같습니다.',
    homework_status: 'partial', test_result: '단어 테스트 72점 (18/25)', attitude: 'normal',
    improvement: '숙제 완성도를 높이면 실력 향상이 빠를 것 같습니다. 매일 10분이라도 단어 복습을 꼭 해주세요.',
    published: 1, completed: 1, sent: 0
  },
  {
    student_id: Number(studentIds[3]), period_id: p1,
    comment: '', homework_status: '', test_result: '', attitude: '',
    improvement: '', published: 0, completed: 0, sent: 0
  },
  {
    student_id: Number(studentIds[4]), period_id: p1,
    comment: '하은이가 매주 성실하게 참여하고 있어요. 발음 교정도 잘 따라오고 있습니다. 웃는 모습으로 수업에 임해줘서 선생님도 즐겁게 가르칠 수 있었어요!',
    homework_status: 'done', test_result: '단어 테스트 90점 (18/20)', attitude: 'active',
    improvement: '문법 파트 복습을 꾸준히 해주면 좋겠습니다. 주 2회 이상 교재 복습을 권장합니다.',
    published: 1, completed: 1, sent: 0
  },
];

for (const r of sampleReports) insertReport.run(r);

const oldReports = [
  {
    student_id: Number(studentIds[0]), period_id: p2,
    comment: '5월 마지막 2주도 열심히 참여해줬어요. 스토리 퀘스트 미션 클리어!',
    homework_status: 'done', test_result: '단어 테스트 92점', attitude: 'active',
    improvement: '문장 확장 표현 연습이 필요합니다.', published: 1, completed: 1, sent: 1
  },
  {
    student_id: Number(studentIds[1]), period_id: p2,
    comment: '꾸준한 서연이, 이번 달도 잘 해줬어요!',
    homework_status: 'done', test_result: '단어 테스트 85점', attitude: 'active',
    improvement: '리스닝 파트 집중 필요.', published: 1, completed: 1, sent: 1
  },
];
for (const r of oldReports) insertReport.run(r);

const allStudents = db.prepare('SELECT name, share_code FROM students').all();
console.log('\n✅ 샘플 데이터 생성 완료!');
console.log('\n📋 학부모 짧은 공유 링크 (개발):');
for (const s of allStudents) {
  console.log(`  ${s.name}: http://localhost:5173/r/${s.share_code}`);
}
