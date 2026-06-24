const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// DB 초기화
const { db, makeShareCode } = require('./db/setup');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
app.use('/uploads', express.static(UPLOADS_DIR));

// API 라우트
app.use('/api/students', require('./routes/students')({ db, makeShareCode }));
app.use('/api/periods', require('./routes/periods')(db));
app.use('/api/reports', require('./routes/reports')(db));
app.use('/api/upload', require('./routes/uploads')(db));
app.use('/api/public', require('./routes/public')(db));
app.use('/api/consult', require('./routes/consult')(db));
app.use('/api/admin/consult', require('./routes/adminConsult')(db));
app.use('/api/kakao-templates', require('./routes/kakaoTemplates')(db));
app.use('/api/attendance', require('./routes/attendance')(db));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// 설정 API (프론트엔드가 PUBLIC_BASE_URL을 알 수 있도록)
app.get('/api/config', (req, res) => {
  res.json({
    publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`,
  });
});

// 프로덕션: 빌드된 React 앱 서빙
const clientBuild = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
} else {
  // 개발 모드: 학부모 URL 접근 시 Vite로 리다이렉트
  app.get('/r/:shareCode', (req, res) => {
    res.redirect(`http://localhost:5173/r/${req.params.shareCode}`);
  });
  app.get('/report/:token', (req, res) => {
    res.redirect(`http://localhost:5173/report/${req.params.token}`);
  });
  app.get('/', (req, res) => res.redirect('http://localhost:5173'));
}

app.listen(PORT, () => {
  console.log(`\n🚀 TEENZ 리포트 서버 실행 중: http://localhost:${PORT}`);
  console.log(`🖥️  관리자 화면: http://localhost:5173`);

  try {
    const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:5173';
    const students = db.prepare('SELECT name, share_code FROM students').all();
    if (students.length > 0) {
      console.log(`\n📋 학부모 짧은 링크 (PUBLIC_BASE_URL: ${baseUrl}):`);
      students.forEach(s => {
        console.log(`  ${s.name}: ${baseUrl}/r/${s.share_code}`);
      });
    }
    if (!process.env.PUBLIC_BASE_URL) {
      console.log('\n⚠️  PUBLIC_BASE_URL 미설정 — 개발용 localhost로 표시 중');
      console.log('   배포 시 .env 파일에 PUBLIC_BASE_URL=https://your-domain.com 설정 필요');
    }
  } catch(e) {}
});
